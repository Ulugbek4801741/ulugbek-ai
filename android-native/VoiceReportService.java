package com.ulugbekai.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.Service;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.speech.tts.TextToSpeech;
import android.speech.tts.UtteranceProgressListener;
import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.Locale;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import org.json.JSONObject;

public class VoiceReportService extends Service implements TextToSpeech.OnInitListener {
    public static final String ACTION_START = "com.ulugbekai.app.action.START_VOICE_REPORT";
    public static final String EXTRA_BASE_URL = "baseUrl";
    private static final String CHANNEL_ID = "ulugbek_voice_reports";
    private static final int NOTIFICATION_ID = 5405;
    private static final long INTERVAL_MS = 5L * 60L * 1000L;
    private final Handler handler = new Handler(Looper.getMainLooper());
    private final ExecutorService network = Executors.newSingleThreadExecutor();
    private TextToSpeech tts;
    private String baseUrl = "";
    private volatile String lastReportId = "";
    private volatile String pendingReportId = "";
    private volatile boolean ttsReady = false;

    private final Runnable poll = new Runnable() {
        @Override public void run() {
            fetchLatestReport();
            handler.postDelayed(this, INTERVAL_MS);
        }
    };

    @Override public void onCreate() {
        super.onCreate();
        createNotificationChannel();
        lastReportId = getSharedPreferences("voice-report", MODE_PRIVATE).getString("lastReportId", "");
        tts = new TextToSpeech(this, this);
        Notification notification = notification("Har 5 daqiqada tizim hisoboti tayyorlanadi.");
        if (Build.VERSION.SDK_INT >= 29) {
            startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK);
        } else {
            startForeground(NOTIFICATION_ID, notification);
        }
    }

    @Override public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent != null && ACTION_START.equals(intent.getAction())) {
            String supplied = intent.getStringExtra(EXTRA_BASE_URL);
            if (supplied != null && supplied.matches("^https://[A-Za-z0-9.-]+(?::[0-9]{1,5})?$")) {
                baseUrl = supplied;
                getSharedPreferences("voice-report", MODE_PRIVATE).edit().putString("baseUrl", baseUrl).apply();
            }
        }
        if (baseUrl.isEmpty()) baseUrl = getSharedPreferences("voice-report", MODE_PRIVATE).getString("baseUrl", "");
        handler.removeCallbacks(poll);
        handler.post(poll);
        return START_STICKY;
    }

    @Override public void onInit(int status) {
        if (status == TextToSpeech.SUCCESS && tts != null) {
            int language = tts.setLanguage(new Locale("uz", "UZ"));
            if (language == TextToSpeech.LANG_MISSING_DATA || language == TextToSpeech.LANG_NOT_SUPPORTED) {
                tts.setLanguage(Locale.getDefault());
            }
            tts.setOnUtteranceProgressListener(new UtteranceProgressListener() {
                @Override public void onStart(String utteranceId) {
                    handler.post(() -> updateNotification("Hisobot ovozli o‘qilmoqda."));
                }
                @Override public void onDone(String utteranceId) {
                    handler.post(() -> {
                        if (utteranceId != null && utteranceId.startsWith("ulugbek-report-")) {
                            String completedId = utteranceId.substring("ulugbek-report-".length());
                            lastReportId = completedId;
                            pendingReportId = "";
                            getSharedPreferences("voice-report", MODE_PRIVATE).edit()
                                .putString("lastReportId", completedId).apply();
                            updateNotification("Oxirgi hisobot ovozli o‘qildi.");
                        }
                    });
                }
                @Override public void onError(String utteranceId) {
                    handler.post(() -> {
                        if (utteranceId != null && utteranceId.equals("ulugbek-report-" + pendingReportId)) {
                            pendingReportId = "";
                        }
                        updateNotification("Ovozli o‘qishda xato. Keyingi urinishda qayta tekshiriladi.");
                    });
                }
            });
            ttsReady = true;
        } else {
            ttsReady = false;
            updateNotification("Telefonning matnni ovozga aylantirish xizmati tayyor emas.");
        }
    }

    private void fetchLatestReport() {
        if (baseUrl.isEmpty() || !ttsReady || tts == null) return;
        network.execute(() -> {
            HttpURLConnection connection = null;
            try {
                connection = (HttpURLConnection) new URL(baseUrl + "/api/reports/latest").openConnection();
                connection.setRequestMethod("GET");
                connection.setConnectTimeout(10000);
                connection.setReadTimeout(10000);
                connection.setRequestProperty("Accept", "application/json");
                if (connection.getResponseCode() != 200) return;
                try (InputStream input = connection.getInputStream();
                     BufferedReader reader = new BufferedReader(new InputStreamReader(input, StandardCharsets.UTF_8))) {
                    StringBuilder body = new StringBuilder();
                    String line;
                    while ((line = reader.readLine()) != null) {
                        if (body.length() + line.length() > 20000) return;
                        body.append(line);
                    }
                    JSONObject json = new JSONObject(body.toString());
                    JSONObject report = json.optJSONObject("report");
                    if (report == null) return;
                    String id = report.optString("id", "");
                    String text = report.optString("text", "");
                    if (id.isEmpty() || text.isEmpty() || text.length() > 8000 ||
                        id.equals(lastReportId) || id.equals(pendingReportId) || !ttsReady) return;
                    handler.post(() -> {
                        if (!ttsReady || tts == null || id.equals(lastReportId) || id.equals(pendingReportId)) return;
                        int result = tts.speak(text, TextToSpeech.QUEUE_FLUSH, null, "ulugbek-report-" + id);
                        if (result == TextToSpeech.SUCCESS) {
                            pendingReportId = id;
                        } else {
                            updateNotification("Hisobotni ovozli o‘qib bo‘lmadi. Qayta uriniladi.");
                        }
                    });
                }
            } catch (Exception ignored) {
                // Network failures are retried on the next five-minute poll.
            } finally {
                if (connection != null) connection.disconnect();
            }
        });
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(CHANNEL_ID, "ULUGBEK AI ovozli hisobotlari", NotificationManager.IMPORTANCE_LOW);
            channel.setDescription("Har besh daqiqalik tizim hisoboti.");
            getSystemService(NotificationManager.class).createNotificationChannel(channel);
        }
    }

    private Notification notification(String message) {
        Notification.Builder builder = Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
            ? new Notification.Builder(this, CHANNEL_ID) : new Notification.Builder(this);
        int icon = getApplicationInfo().icon;
        if (icon == 0) icon = android.R.drawable.ic_media_play;
        return builder.setSmallIcon(icon).setContentTitle("ULUGBEK AI — ovozli hisobot")
            .setContentText(message).setOngoing(true).build();
    }

    private void updateNotification(String message) {
        NotificationManager manager = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
        if (manager != null) manager.notify(NOTIFICATION_ID, notification(message));
    }

    @Override public void onDestroy() {
        handler.removeCallbacks(poll);
        ttsReady = false;
        if (tts != null) { tts.stop(); tts.shutdown(); }
        network.shutdownNow();
        super.onDestroy();
    }

    @Override public IBinder onBind(Intent intent) { return null; }
}