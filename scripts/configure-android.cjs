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
const fullscreenItems = `
        <item name="android:windowFullscreen">true</item>
        <item name="android:statusBarColor">@android:color/transparent</item>
        <item name="android:navigationBarColor">@android:color/transparent</item>
        <item name="android:windowLightStatusBar">false</item>
        <item name="android:windowLightNavigationBar">false</item>
        <item name="android:windowLayoutInDisplayCutoutMode">shortEdges</item>
        <item name="android:enforceNavigationBarContrast">false</item>`;
function patchStyle(name, items) {
  const pattern = new RegExp(`(<style name="${name.replaceAll('.', '\\.')}"[^>]*>)([\\s\\S]*?)(<\\/style>)`);
  styles = styles.replace(pattern, (match, open, body, close) => {
    const missing = items.split("\n").filter(line => line.trim() && !body.includes(line.trim()));
    return `${open}${missing.length ? `\n${missing.join("\n")}` : ""}${body}${close}`;
  });
}
patchStyle("AppTheme.NoActionBar", fullscreenItems);
patchStyle("AppTheme.NoActionBarLaunch", `${fullscreenItems}\n        <item name="postSplashScreenTheme">@style/AppTheme.NoActionBar</item>`);
fs.writeFileSync(stylesPath, styles);

let manifest = fs.readFileSync(manifestPath, "utf8");
if (!manifest.includes('android:screenOrientation="landscape"')) {
  manifest = manifest.replace(
    /(<activity\n(?:.|\n)*?android:name="\.MainActivity")/,
    '$1\n            android:screenOrientation="landscape"'
  );
}
fs.writeFileSync(manifestPath, manifest);

fs.writeFileSync(activityPath, `package com.wuxing.shouzhen;

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
        enterImmersiveFullscreen();
    }

    @Override
    public void onResume() {
        super.onResume();
        enterImmersiveFullscreen();
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) enterImmersiveFullscreen();
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
