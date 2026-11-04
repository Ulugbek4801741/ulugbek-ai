package com.ulugbekai.app;

import android.content.Intent;
import android.os.Build;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "VoiceReport")
public class VoiceReportPlugin extends Plugin {
    @PluginMethod
    public void start(PluginCall call) {
        String baseUrl = call.getString("baseUrl", "");
        if (baseUrl == null || !baseUrl.matches("^https://[A-Za-z0-9.-]+(?::[0-9]{1,5})?$")) {
            call.reject("Hisobot serveri HTTPS manzil bo‘lishi kerak.");
            return;
        }
        Intent intent = new Intent(getContext(), VoiceReportService.class);
        intent.setAction(VoiceReportService.ACTION_START);
        intent.putExtra(VoiceReportService.EXTRA_BASE_URL, baseUrl);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) getContext().startForegroundService(intent);
        else getContext().startService(intent);
        com.getcapacitor.JSObject result = new com.getcapacitor.JSObject();
        result.put("running", true);
        result.put("message", "Ovozli hisobot xizmati yoqildi.");
        call.resolve(result);
    }

    @PluginMethod
    public void stop(PluginCall call) {
        getContext().stopService(new Intent(getContext(), VoiceReportService.class));
        com.getcapacitor.JSObject result = new com.getcapacitor.JSObject();
        result.put("running", false);
        result.put("message", "Ovozli hisobot xizmati to‘xtatildi.");
        call.resolve(result);
    }
}
