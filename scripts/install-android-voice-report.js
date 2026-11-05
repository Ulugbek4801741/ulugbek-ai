"use strict";
const fs = require("node:fs/promises");
const path = require("node:path");

async function main() {
  const root = path.resolve(__dirname, "..");
  const javaDir = path.join(root, "android", "app", "src", "main", "java", "com", "ulugbekai", "app");
  const manifestPath = path.join(root, "android", "app", "src", "main", "AndroidManifest.xml");
  await fs.mkdir(javaDir, { recursive: true });
  for (const name of ["VoiceReportPlugin.java", "VoiceReportService.java"]) {
    await fs.copyFile(path.join(root, "android-native", name), path.join(javaDir, name));
  }
  const activityPath = path.join(javaDir, "MainActivity.java");
  let activity = await fs.readFile(activityPath, "utf8");
  if (!activity.includes("VoiceReportPlugin.class")) {
    activity = activity.replace(/import com\.getcapacitor\.BridgeActivity;\s*/, "import com.getcapacitor.BridgeActivity;\nimport com.ulugbekai.app.VoiceReportPlugin;\n");
    activity = activity.replace(/(public class MainActivity extends BridgeActivity\s*\{)/, "$1\n    @Override\n    public void onCreate(android.os.Bundle savedInstanceState) {\n        registerPlugin(VoiceReportPlugin.class);\n        super.onCreate(savedInstanceState);\n    }");
    await fs.writeFile(activityPath, activity);
  }
  let manifest = await fs.readFile(manifestPath, "utf8");
  const permissions = [
    '<uses-permission android:name="android.permission.FOREGROUND_SERVICE" />',
    '<uses-permission android:name="android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK" />',
    '<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />'
  ];
  for (const permission of permissions) {
    const name = permission.match(/android:name="([^"]+)"/)[1];
    if (!manifest.includes(name)) manifest = manifest.replace("<application", permission + "\n    <application");
  }
  if (!manifest.includes("com.ulugbekai.app.VoiceReportService")) {
    manifest = manifest.replace("</application>", '        <service android:name="com.ulugbekai.app.VoiceReportService" android:exported="false" android:foregroundServiceType="mediaPlayback" />\n    </application>');
  }
  await fs.writeFile(manifestPath, manifest);
  console.log("Native ULUGBEK AI voice report service installed.");
}
main().catch(error => { console.error(error); process.exitCode = 1; });
