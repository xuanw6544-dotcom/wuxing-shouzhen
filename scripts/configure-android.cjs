const fs = require("node:fs");
const path = require("node:path");

const androidRoot = path.resolve("android");
const manifestPath = path.join(androidRoot, "app", "src", "main", "AndroidManifest.xml");
const activityPath = path.join(androidRoot, "app", "src", "main", "java", "com", "wuxing", "shouzhen", "MainActivity.java");
const stylesPath = path.join(androidRoot, "app", "src", "main", "res", "values", "styles.xml");

if (!fs.existsSync(manifestPath) || !fs.existsSync(activityPath) || !fs.existsSync(stylesPath)) {
  throw new Error("Android project is missing; run npx cap add android first.");
}

let styles = fs.readFileSync(stylesPath, "utf8");
const launchStyle = /(<style name="AppTheme\.NoActionBarLaunch"[^>]*>)([\s\S]*?)(<\/style>)/;
const launchItems = `
        <item name="android:windowFullscreen">true</item>
        <item name="android:statusBarColor">@android:color/transparent</item>
        <item name="android:navigationBarColor">@android:color/transparent</item>
        <item name="android:windowLightStatusBar">false</item>
        <item name="android:windowLightNavigationBar">false</item>
        <item name="android:windowLayoutInDisplayCutoutMode">shortEdges</item>`;
if (launchStyle.test(styles) && !styles.includes('<item name="android:windowFullscreen">true</item>')) {
  styles = styles.replace(launchStyle, `$1${launchItems}\n    $3`);
  fs.writeFileSync(stylesPath, styles);
}

let manifest = fs.readFileSync(manifestPath, "utf8");
if (!manifest.includes('android:screenOrientation="landscape"')) {
  manifest = manifest.replace(
    /(<activity\n(?:.|\n)*?android:name="\.MainActivity")/,
    '$1\n            android:screenOrientation="landscape"'
  );
}
fs.writeFileSync(manifestPath, manifest);

fs.writeFileSync(activityPath, `package com.wuxing.shouzhen;

import android.content.pm.ActivityInfo;
import android.os.Bundle;
import android.view.Window;
import com.getcapacitor.BridgeActivity;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_LANDSCAPE);
        enterImmersiveFullscreen();
    }

    private void enterImmersiveFullscreen() {
        Window window = getWindow();
        WindowCompat.setDecorFitsSystemWindows(window, false);
        WindowInsetsControllerCompat controller = WindowCompat.getInsetsController(window, window.getDecorView());
        controller.hide(WindowInsetsCompat.Type.systemBars());
        controller.setSystemBarsBehavior(WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
    }
}
`);

console.log("Configured Android landscape immersive mode");
