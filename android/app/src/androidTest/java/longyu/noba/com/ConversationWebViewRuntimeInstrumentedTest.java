package longyu.noba.com;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertTrue;
import static org.junit.Assert.fail;

import android.webkit.WebView;
import androidx.test.core.app.ActivityScenario;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.filters.LargeTest;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.Test;
import org.junit.runner.RunWith;

/**
 * RC2.2.31D — REAL APK WebView conversation proof.
 *
 * Opens MainActivity, navigates to QA scene fixture with REAL sceneIds
 * (primeiro-cumprimento / como-se-chama), taps Continuar, asserts DOM node change.
 * Must pass with window.speechSynthesis absent.
 */
@RunWith(AndroidJUnit4.class)
@LargeTest
public class ConversationWebViewRuntimeInstrumentedTest {

    private static final long BOOT_MS = 45_000L;

    private WebView awaitWebView(ActivityScenario<MainActivity> scenario) throws InterruptedException {
        AtomicReference<WebView> ref = new AtomicReference<>();
        long deadline = System.currentTimeMillis() + BOOT_MS;
        while (System.currentTimeMillis() < deadline) {
            scenario.onActivity(activity -> {
                WebView w = activity.getBridge() != null ? activity.getBridge().getWebView() : null;
                if (w != null) ref.set(w);
            });
            if (ref.get() != null) return ref.get();
            Thread.sleep(250);
        }
        fail("WebView not ready");
        return null;
    }

    private String eval(WebView webView, String js) throws InterruptedException {
        return WebViewRuntimeSupport.evalJs(webView, js);
    }

    private void navigate(WebView webView, String path) throws InterruptedException {
        // BrowserRouter — path navigation, not hash.
        eval(webView, "window.location.assign(" + JSONString(path) + ")");
        Thread.sleep(2000);
    }

    private static String JSONString(String s) {
        return "\"" + s.replace("\\", "\\\\").replace("\"", "\\\"") + "\"";
    }

    private void assertSpeechSynthesisAbsent(WebView webView) throws InterruptedException {
        String present = eval(webView, "String(typeof window.speechSynthesis !== 'undefined')");
        // Android WebView may or may not expose it; force-absent for this proof when present.
        eval(webView, "(function(){ try { Object.defineProperty(window,'speechSynthesis',{get:function(){return undefined;},configurable:true}); } catch(e) { try { window.speechSynthesis = undefined; } catch(_){} } return 'ok'; })()");
        String after = eval(webView, "String(window.speechSynthesis == null || typeof window.speechSynthesis === 'undefined')");
        assertTrue("speechSynthesis must be absent for WebView proof; presentWas=" + present + " after=" + after,
            "true".equals(after) || "\"true\"".equals(after));
    }

    private String currentNode(WebView webView) throws InterruptedException {
        return eval(webView,
            "(function(){ var el = document.querySelector('[data-conversation-current-node]');"
                + " return el ? (el.getAttribute('data-conversation-current-node') || '') : ''; })()");
    }

    private void tapAdvance(WebView webView) throws InterruptedException {
        String clicked = eval(webView,
            "(function(){ var b = document.querySelector('[data-testid=\"conversation-advance\"]');"
                + " if(!b) return 'missing';"
                + " b.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true}));"
                + " b.dispatchEvent(new PointerEvent('pointerup',{bubbles:true}));"
                + " b.click(); return 'ok'; })()");
        assertEquals("ok", clicked);
        Thread.sleep(600);
    }

    @Test
    public void primeiroCumprimentoAdvancesWithoutSpeechSynthesis() throws Exception {
        try (ActivityScenario<MainActivity> scenario = ActivityScenario.launch(MainActivity.class)) {
            WebView webView = awaitWebView(scenario);
            Thread.sleep(2500);
            assertSpeechSynthesisAbsent(webView);
            navigate(webView, "/qa/conversation-scene?scene=primeiro-cumprimento");
            long deadline = System.currentTimeMillis() + 20_000L;
            String node = "";
            while (System.currentTimeMillis() < deadline) {
                node = currentNode(webView);
                if ("primeiro-cumprimento-1".equals(node)) break;
                Thread.sleep(300);
            }
            assertEquals("primeiro-cumprimento-1", node);
            tapAdvance(webView);
            deadline = System.currentTimeMillis() + 8_000L;
            while (System.currentTimeMillis() < deadline) {
                node = currentNode(webView);
                if ("primeiro-cumprimento-2".equals(node)) break;
                Thread.sleep(200);
            }
            assertEquals("primeiro-cumprimento-2", node);
            tapAdvance(webView);
            deadline = System.currentTimeMillis() + 8_000L;
            while (System.currentTimeMillis() < deadline) {
                node = currentNode(webView);
                if ("primeiro-cumprimento-3".equals(node)) break;
                Thread.sleep(200);
            }
            assertEquals("primeiro-cumprimento-3", node);
        }
    }

    @Test
    public void comoSeChamaAdvancesWithoutSpeechSynthesis() throws Exception {
        try (ActivityScenario<MainActivity> scenario = ActivityScenario.launch(MainActivity.class)) {
            WebView webView = awaitWebView(scenario);
            Thread.sleep(2500);
            assertSpeechSynthesisAbsent(webView);
            navigate(webView, "/qa/conversation-scene?scene=como-se-chama");
            long deadline = System.currentTimeMillis() + 20_000L;
            String node = "";
            while (System.currentTimeMillis() < deadline) {
                node = currentNode(webView);
                if ("como-se-chama-1".equals(node)) break;
                Thread.sleep(300);
            }
            assertEquals("como-se-chama-1", node);
            tapAdvance(webView);
            deadline = System.currentTimeMillis() + 8_000L;
            while (System.currentTimeMillis() < deadline) {
                node = currentNode(webView);
                if ("como-se-chama-2".equals(node)) break;
                Thread.sleep(200);
            }
            assertEquals("como-se-chama-2", node);
            tapAdvance(webView);
            deadline = System.currentTimeMillis() + 8_000L;
            while (System.currentTimeMillis() < deadline) {
                node = currentNode(webView);
                if ("como-se-chama-3".equals(node)) break;
                Thread.sleep(200);
            }
            assertEquals("como-se-chama-3", node);
        }
    }

    @Test
    public void conversationAdvancesWhenMediaPluginForcedError() throws Exception {
        try (ActivityScenario<MainActivity> scenario = ActivityScenario.launch(MainActivity.class)) {
            WebView webView = awaitWebView(scenario);
            Thread.sleep(2500);
            assertSpeechSynthesisAbsent(webView);
            // Chaos: break LongyuMedia play path via JS stub if Capacitor bridge exposed.
            eval(webView,
                "(function(){ try {"
                    + " var p = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.LongyuMedia;"
                    + " if (p && p.playCanonicalAudio) {"
                    + "   p.playCanonicalAudio = function(){ return Promise.resolve({ok:false,reason:'CHAOS_MEDIA_ERROR'}); };"
                    + " } return 'ok'; } catch(e) { return 'skip'; } })()");
            navigate(webView, "/qa/conversation-scene?scene=primeiro-cumprimento");
            long deadline = System.currentTimeMillis() + 20_000L;
            String node = "";
            while (System.currentTimeMillis() < deadline) {
                node = currentNode(webView);
                if ("primeiro-cumprimento-1".equals(node)) break;
                Thread.sleep(300);
            }
            assertEquals("primeiro-cumprimento-1", node);
            tapAdvance(webView);
            deadline = System.currentTimeMillis() + 8_000L;
            while (System.currentTimeMillis() < deadline) {
                node = currentNode(webView);
                if ("primeiro-cumprimento-2".equals(node)) break;
                Thread.sleep(200);
            }
            assertEquals("primeiro-cumprimento-2", node);
        }
    }
}
