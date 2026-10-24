package dev.larpcord.app;

import android.util.Log;
import android.webkit.WebView;
import androidx.webkit.WebViewCompat;
import androidx.webkit.WebViewFeature;
import com.getcapacitor.BridgeActivity;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.HashSet;
import java.util.Set;

/**
 * Larpcord for Android: Discord's web app in a WebView, with the Larpcord core (Vencord fork)
 * injected before Discord's own scripts run, so its webpack patches apply like on the desktop.
 */
public class MainActivity extends BridgeActivity {

    private static final String TAG = "Larpcord";
    private static final String INJECT_ASSET = "public/larpcord-inject.js";

    @Override
    protected void load() {
        // The bridge loads discord.com right when it is created, so the script has to be registered first
        WebView webView = findViewById(com.getcapacitor.android.R.id.webview);
        if (webView != null) injectLarpcord(webView);
        super.load();
    }

    private void injectLarpcord(WebView webView) {
        if (!WebViewFeature.isFeatureSupported(WebViewFeature.DOCUMENT_START_SCRIPT)) {
            // Without document-start scripts the patches would come too late; Discord still works, unmodded
            Log.w(TAG, "Android System WebView is too old for Larpcord – update it in the Play Store");
            return;
        }
        try {
            Set<String> origins = new HashSet<>();
            origins.add("https://discord.com");
            origins.add("https://*.discord.com");
            WebViewCompat.addDocumentStartJavaScript(webView, readAsset(INJECT_ASSET), origins);
        } catch (IOException | IllegalArgumentException e) {
            Log.e(TAG, "Could not inject Larpcord", e);
        }
    }

    private String readAsset(String name) throws IOException {
        try (InputStream in = getAssets().open(name); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            byte[] buffer = new byte[64 * 1024];
            int n;
            while ((n = in.read(buffer)) != -1) out.write(buffer, 0, n);
            return out.toString(StandardCharsets.UTF_8.name());
        }
    }
}
