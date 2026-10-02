package longyu.noba.com;

import android.webkit.WebView;
import androidx.test.platform.app.InstrumentationRegistry;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;

/** RC2.2.31D — WebView evaluateJavascript helpers (ids only, no lesson text). */
final class WebViewRuntimeSupport {
    private WebViewRuntimeSupport() {}

    static String evalJs(WebView webView, String script) throws InterruptedException {
        CountDownLatch latch = new CountDownLatch(1);
        AtomicReference<String> out = new AtomicReference<>("");
        InstrumentationRegistry.getInstrumentation().runOnMainSync(() ->
            webView.evaluateJavascript(script, value -> {
                out.set(value == null ? "null" : value);
                latch.countDown();
            })
        );
        if (!latch.await(8, TimeUnit.SECONDS)) {
            return "timeout";
        }
        String raw = out.get();
        if (raw != null && raw.length() >= 2 && raw.startsWith("\"") && raw.endsWith("\"")) {
            return raw.substring(1, raw.length() - 1)
                .replace("\\\"", "\"")
                .replace("\\\\", "\\");
        }
        return raw;
    }
}
