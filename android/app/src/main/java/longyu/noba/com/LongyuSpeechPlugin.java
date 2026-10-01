package longyu.noba.com;

import android.content.ActivityNotFoundException;
import android.content.Context;
import android.content.Intent;
import android.media.AudioAttributes;
import android.media.AudioDeviceInfo;
import android.media.AudioFocusRequest;
import android.media.AudioManager;
import android.media.MediaMetadataRetriever;
import android.media.MediaPlayer;
import android.media.MediaRecorder;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.provider.Settings;
import android.speech.ModelDownloadListener;
import android.speech.RecognitionListener;
import android.speech.RecognitionSupport;
import android.speech.RecognitionSupportCallback;
import android.speech.RecognizerIntent;
import android.speech.SpeechRecognizer;
import android.speech.tts.TextToSpeech;
import android.speech.tts.UtteranceProgressListener;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;
import java.io.File;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

/**
 * RC2.2.13 — voz nativa do Longyu no Android.
 *
 * TTS: android.speech.tts.TextToSpeech (zh-CN, QUEUE_FLUSH: uma fala por vez).
 * Fala do aluno: android.speech.SpeechRecognizer, uma tentativa por toque,
 * com timeout, cancelada no background e destruída ao terminar.
 *
 * O áudio do microfone do reconhecimento vai só para o serviço do sistema; o
 * Longyu não o guarda. RC2.2.17 · AA–AB: a gravação de PRÁTICA (autoavaliação)
 * é um único arquivo no cache do app, apagado ao gravar de novo, ao apagar,
 * ao ir para o background e ao fechar. Nunca é enviado a lugar nenhum.
 * O front-end não chama este plugin direto: tudo passa por
 * src/lib/platform/nativeSpeech.ts.
 */
@CapacitorPlugin(
    name = "LongyuSpeech",
    permissions = { @Permission(strings = { "android.permission.RECORD_AUDIO" }, alias = "microphone") }
)
public class LongyuSpeechPlugin extends Plugin {

    private static final String UTTERANCE_PREFIX = "longyu-";
    private static final long DEFAULT_RECOGNITION_TIMEOUT_MS = 10000L;
    private static final long MAX_RECOGNITION_TIMEOUT_MS = 20000L;

    private final Handler main = new Handler(Looper.getMainLooper());

    private TextToSpeech tts;
    /** -1 = inicializando; TextToSpeech.SUCCESS / ERROR depois do onInit. */
    private int ttsInitStatus = -1;
    // ── RC2.2.27 — registro de pedidos de fala (request lifecycle) ─────────
    //
    // Antes (RC2.2.26): um `startCall` único (sobrescrito em silêncio por
    // toque duplo/autoplay rápido), `tts.stop()` incondicional antes de TODA
    // fala e três "fontes" de ACK que eram a mesma: o UtteranceProgressListener.
    // Agora cada requestId tem o seu ciclo de vida determinístico:
    //
    //   CREATED → QUEUED → ENGINE_SPEAKING → STARTED → DONE
    //                    ↘ SUPERSEDED · STOPPED · ERROR
    //
    // e uma fonte REALMENTE independente do listener: tts.isSpeaking(),
    // consultada a cada TTS_SPEAKING_PROBE_MS enquanto a fala é a corrente.
    private static final String TTS_LOG_TAG = "LongyuTTS";
    private static final long TTS_START_TIMEOUT_MS = 4000L;
    private static final long TTS_SPEAKING_PROBE_MS = 75L;
    private static final int TTS_REQUEST_HISTORY = 40;
    /** QA: CONDITIONAL (padrão: stop só se o motor está falando) · EXPLICIT_STOP (modo A) · QUEUE_FLUSH_ONLY (modo B). */
    private String ttsStopMode = "CONDITIONAL";
    private boolean ttsQaLogs = false;
    private int utteranceSeq = 0;
    private int onStartCount = 0;
    private int onDoneCount = 0;
    private int onStopCount = 0;
    private int onErrorCount = 0;
    private int engineSpeakingCount = 0;
    /** RC2.2.17 — só a fala CORRENTE pode resolver/rejeitar o ACK. */
    private String currentUtteranceId;
    private String currentRequestId;
    private Locale lastLocale;
    private float lastRate = -1f;
    private float lastPitch = -1f;

    private static final class TtsRequest {
        final String requestId;
        final String source;
        String utteranceId;
        String state = "CREATED";
        final long createdAt = System.currentTimeMillis();
        long queuedAt = 0L;
        long firstSpeakingObservedAt = 0L;
        long onStartAt = 0L;
        long onDoneAt = 0L;
        long onStopAt = 0L;
        long onErrorAt = 0L;
        long cancelledAt = 0L;
        boolean speakAccepted = false;
        boolean engineSpeaking = false;
        boolean acked = false;
        String ackSource = null;
        String errorCode = null;
        String supersededBy = null;
        /** Preflight: o que havia antes desta fala (prova da corrida stop→speak). */
        boolean hadActiveRequest = false;
        String previousRequestId = null;
        String previousState = null;
        boolean previousEngineSpeaking = false;
        boolean stopCalled = false;
        boolean stopCallbackReceived = false;
        long newSpeakCalledAt = 0L;
        String newSpeakResult = null;
        long newIsSpeakingObservedAt = 0L;
        String stopMode = null;
        /** ACK (startSpeak) e fim (speak legado): nunca trocados em silêncio. */
        PluginCall ackCall;
        PluginCall endCall;
        Runnable probe;
        Runnable deadline;

        TtsRequest(String requestId, String source) {
            this.requestId = requestId;
            this.source = source == null ? "UNKNOWN" : source;
        }

        boolean terminal() {
            return "DONE".equals(state) || "SUPERSEDED".equals(state) || "STOPPED".equals(state) || "ERROR".equals(state);
        }

        JSObject toJson() {
            JSObject result = new JSObject();
            result.put("requestId", requestId);
            result.put("utteranceId", utteranceId);
            result.put("source", source);
            result.put("state", state);
            result.put("started", "STARTED".equals(state) || "ENGINE_SPEAKING".equals(state) || onStartAt > 0 || firstSpeakingObservedAt > 0 || onDoneAt > 0);
            result.put("done", onDoneAt > 0);
            result.put("errorCode", errorCode);
            result.put("speakAccepted", speakAccepted);
            result.put("engineSpeaking", engineSpeaking);
            result.put("acked", acked);
            result.put("ackSource", ackSource);
            result.put("createdAt", createdAt);
            result.put("queuedAt", queuedAt);
            result.put("firstSpeakingObservedAt", firstSpeakingObservedAt);
            result.put("onStartAt", onStartAt);
            result.put("onDoneAt", onDoneAt);
            result.put("onStopAt", onStopAt);
            result.put("onErrorAt", onErrorAt);
            result.put("cancelledAt", cancelledAt);
            result.put("supersededBy", supersededBy);
            JSObject pre = new JSObject();
            pre.put("hadActiveRequest", hadActiveRequest);
            pre.put("previousRequestId", previousRequestId);
            pre.put("previousState", previousState);
            pre.put("previousEngineSpeaking", previousEngineSpeaking);
            pre.put("stopCalled", stopCalled);
            pre.put("stopCallbackReceived", stopCallbackReceived);
            pre.put("newSpeakCalledAt", newSpeakCalledAt);
            pre.put("newSpeakResult", newSpeakResult);
            pre.put("newIsSpeakingObservedAt", newIsSpeakingObservedAt);
            pre.put("stopMode", stopMode);
            result.put("preflight", pre);
            return result;
        }
    }

    private final java.util.LinkedHashMap<String, TtsRequest> ttsRequests = new java.util.LinkedHashMap<String, TtsRequest>() {
        @Override
        protected boolean removeEldestEntry(java.util.Map.Entry<String, TtsRequest> eldest) {
            return size() > TTS_REQUEST_HISTORY;
        }
    };
    /** utteranceId → requestId (limitado): evento atrasado carrega a identidade da SUA fala. */
    private final java.util.LinkedHashMap<String, String> requestByUtterance = new java.util.LinkedHashMap<String, String>() {
        @Override
        protected boolean removeEldestEntry(java.util.Map.Entry<String, String> eldest) {
            return size() > TTS_REQUEST_HISTORY;
        }
    };

    private SpeechRecognizer recognizer;
    private PluginCall recognitionCall;
    private Runnable recognitionTimeout;
    /** RC2.2.21 — "on_device" ou "service": qual reconhecedor atendeu. */
    private String recognizerKind = "none";
    private String recognitionLanguage = "zh-CN";
    /** Pico do RMS (dB) da escuta: só prova se o microfone captou sinal. */
    private float recognitionPeakRms = -100f;
    private boolean recognitionSignalNotified = false;
    private static final float RECOGNITION_SIGNAL_RMS_DB = 2.0f;

    private SpeechRecognizer supportProbe;
    private SpeechRecognizer modelDownloader;

    private MediaRecorder practiceRecorder;
    private MediaPlayer practicePlayer;
    private PluginCall practicePlayCall;
    private File practiceFile;
    private long practiceStartedAt = 0L;

    // ── TTS ────────────────────────────────────────────────────────────────

    private void ensureTts(Runnable ready) {
        if (tts != null && ttsInitStatus != -1) {
            ready.run();
            return;
        }
        if (tts == null) {
            tts = new TextToSpeech(getContext(), (status) -> {
                ttsInitStatus = status;
                if (status == TextToSpeech.SUCCESS) {
                    tts.setOnUtteranceProgressListener(progressListener);
                    // RC2.2.21 — voz modelo como MÍDIA/FALA (nunca rota de chamada).
                    tts.setAudioAttributes(new AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_MEDIA)
                        .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
                        .build());
                }
                main.post(this::flushTtsWaiting);
            });
        }
        waitingRunnables.add(ready);
    }

    private final ArrayList<Runnable> waitingRunnables = new ArrayList<>();

    private void flushTtsWaiting() {
        ArrayList<Runnable> copy = new ArrayList<>(waitingRunnables);
        waitingRunnables.clear();
        for (Runnable r : copy) r.run();
    }

    private Locale localeFor(String tag) {
        Locale locale = Locale.forLanguageTag(tag == null || tag.isEmpty() ? "zh-CN" : tag);
        return locale.getLanguage().isEmpty() ? Locale.SIMPLIFIED_CHINESE : locale;
    }

    /** Código honesto de disponibilidade da voz num idioma. */
    private String languageStatus(Locale locale) {
        if (tts == null || ttsInitStatus != TextToSpeech.SUCCESS) return "TTS_UNAVAILABLE";
        int result = tts.isLanguageAvailable(locale);
        if (result == TextToSpeech.LANG_MISSING_DATA) return "TTS_LANGUAGE_MISSING_DATA";
        if (result == TextToSpeech.LANG_NOT_SUPPORTED) return "TTS_LANGUAGE_NOT_SUPPORTED";
        return "AVAILABLE";
    }

    @PluginMethod
    public void getTtsStatus(PluginCall call) {
        // RC2.2.27 — mesmo thread dos callbacks do motor (nunca a ponte).
        main.post(() -> {
            String language = call.getString("language", "zh-CN");
            // RC2.2.21 — depois de instalar a voz chinesa, o motor antigo pode
            // continuar dizendo LANG_MISSING_DATA: recria-o uma vez (reinit).
            Boolean reinit = call.getBoolean("reinit", false);
            if (Boolean.TRUE.equals(reinit) && tts != null && ttsInitStatus != -1
                && !"AVAILABLE".equals(languageStatus(localeFor(language)))) {
                finishSpeak(true);
                try {
                    tts.stop();
                    tts.shutdown();
                } catch (Exception ignored) {
                    // motor já encerrado
                }
                tts = null;
                ttsInitStatus = -1;
            }
            ensureTts(() -> {
                JSObject ret = new JSObject();
                String status = languageStatus(localeFor(language));
                ret.put("available", "AVAILABLE".equals(status));
                ret.put("status", status);
                ret.put("engine", tts != null ? tts.getDefaultEngine() : null);
                // RC2.2.17 · H — diagnóstico sem PII.
                ret.put("initStatus", ttsInitStatus == TextToSpeech.SUCCESS ? "SUCCESS" : ttsInitStatus == -1 ? "PENDING" : "ERROR");
                ret.put("requestedLocale", localeFor(language).toLanguageTag());
                ret.put("audioAttributes", "MEDIA_SPEECH");
                ret.put("reinitialized", Boolean.TRUE.equals(reinit));
                call.resolve(ret);
            });
        });
    }

    /**
     * Legado (RC2.2.13): resolve no FIM da fala. Passa pelo MESMO registro de
     * pedidos que startSpeak — não existe um segundo caminho de TTS.
     */
    @PluginMethod
    public void speak(PluginCall call) {
        call.setKeepAlive(true);
        main.post(() -> beginTtsRequest(call, false));
    }

    /**
     * RC2.2.26/27 — resolve no INÍCIO confirmado da fala (onStart, isSpeaking
     * ou DONE da mesma requestId). Um pedido anterior ainda pendente é
     * rejeitado com TTS_SUPERSEDED — nunca sobrescrito em silêncio.
     */
    @PluginMethod
    public void startSpeak(PluginCall call) {
        main.post(() -> beginTtsRequest(call, true));
    }

    private void beginTtsRequest(PluginCall call, boolean ackOnStart) {
        String text = call.getString("text", "");
        String requestId = call.getString("requestId", null);
        if (text == null || text.trim().isEmpty()) {
            emitTts("TTS_ERROR", requestId, null, "error", "TTS_EMPTY_TEXT");
            call.setKeepAlive(false);
            call.reject("empty text", "TTS_EMPTY_TEXT");
            return;
        }
        if (ackOnStart && (requestId == null || requestId.isEmpty())) {
            call.reject("requestId required", "TTS_REQUEST_ID_REQUIRED");
            return;
        }
        String rid = requestId != null && !requestId.isEmpty() ? requestId : UTTERANCE_PREFIX + "r" + (utteranceSeq + 1);
        String language = call.getString("language", "zh-CN");
        Float rate = call.getFloat("rate", 0.85f);
        Float pitch = call.getFloat("pitch", 1.0f);
        TtsRequest request = new TtsRequest(rid, call.getString("source", "UNKNOWN"));
        if (ackOnStart) request.ackCall = call;
        else request.endCall = call;
        ttsRequests.put(rid, request);
        ttsLog(request, "REQUEST", null);

        // Preflight: o que estava acontecendo antes desta fala.
        TtsRequest previous = currentRequestId == null ? null : ttsRequests.get(currentRequestId);
        boolean engineSpeakingNow = tts != null && ttsInitStatus == TextToSpeech.SUCCESS && safeIsSpeaking();
        request.stopMode = ttsStopMode;
        if (previous != null && previous != request && !previous.terminal()) {
            request.hadActiveRequest = true;
            request.previousRequestId = previous.requestId;
            request.previousState = previous.state;
            request.previousEngineSpeaking = engineSpeakingNow;
            supersede(previous, rid);
        } else {
            request.previousEngineSpeaking = engineSpeakingNow;
            if (previous != null) {
                request.previousRequestId = previous.requestId;
                request.previousState = previous.state;
            }
        }
        // RC2.2.27 — stop() só quando há fala REALMENTE tocando (CONDITIONAL),
        // sempre (modo A, QA) ou nunca (modo B, QA: QUEUE_FLUSH já interrompe).
        boolean shouldStop = "EXPLICIT_STOP".equals(ttsStopMode)
            || ("CONDITIONAL".equals(ttsStopMode) && engineSpeakingNow);
        if (shouldStop && tts != null) {
            tts.stop();
            request.stopCalled = true;
        }
        currentRequestId = rid;
        currentUtteranceId = null;
        armDeadline(request);
        ensureTts(() -> {
            if (request.terminal()) return;
            Locale locale = localeFor(language);
            String status = languageStatus(locale);
            if (!"AVAILABLE".equals(status)) {
                // Nunca finge que tocou.
                failRequest(request, status, "unavailable");
                return;
            }
            float r = rate == null ? 0.85f : Math.max(0.3f, Math.min(2.0f, rate));
            float p = pitch == null ? 1.0f : Math.max(0.5f, Math.min(2.0f, pitch));
            // setLanguage a cada fala recarregava a voz em alguns motores: só se mudou.
            if (lastLocale == null || !lastLocale.equals(locale)) {
                tts.setLanguage(locale);
                lastLocale = locale;
            }
            if (r != lastRate) {
                tts.setSpeechRate(r);
                lastRate = r;
            }
            if (p != lastPitch) {
                tts.setPitch(p);
                lastPitch = p;
            }
            String id = UTTERANCE_PREFIX + (++utteranceSeq);
            request.utteranceId = id;
            requestByUtterance.put(id, rid);
            if (rid.equals(currentRequestId)) currentUtteranceId = id;
            request.newSpeakCalledAt = System.currentTimeMillis();
            int result = tts.speak(text, TextToSpeech.QUEUE_FLUSH, null, id);
            request.newSpeakResult = result == TextToSpeech.SUCCESS ? "SUCCESS" : "ERROR";
            ttsLog(request, "QUEUE_RESULT", "result=" + request.newSpeakResult);
            if (result != TextToSpeech.SUCCESS) {
                failRequest(request, "TTS_SPEAK_FAILED", "error");
                return;
            }
            request.speakAccepted = true;
            request.queuedAt = System.currentTimeMillis();
            if (!request.terminal() && "CREATED".equals(request.state)) request.state = "QUEUED";
            emitTts("TTS_QUEUED", rid, id, "queued", null);
            startSpeakingProbe(request);
        });
    }

    /** Fonte independente do listener: o motor diz que está falando AGORA. */
    private void startSpeakingProbe(TtsRequest request) {
        final long until = System.currentTimeMillis() + TTS_START_TIMEOUT_MS;
        request.probe = new Runnable() {
            @Override
            public void run() {
                if (request.terminal() || !request.requestId.equals(currentRequestId) || request.firstSpeakingObservedAt > 0) return;
                if (safeIsSpeaking()) {
                    long now = System.currentTimeMillis();
                    request.firstSpeakingObservedAt = now;
                    request.newIsSpeakingObservedAt = now;
                    request.engineSpeaking = true;
                    engineSpeakingCount += 1;
                    if ("QUEUED".equals(request.state) || "CREATED".equals(request.state)) request.state = "ENGINE_SPEAKING";
                    ttsLog(request, "ENGINE_IS_SPEAKING", null);
                    emitTts("TTS_ENGINE_SPEAKING", request.requestId, request.utteranceId, "speaking", null);
                    ackRequest(request, "isSpeaking", false);
                    return;
                }
                if (System.currentTimeMillis() < until) main.postDelayed(this, TTS_SPEAKING_PROBE_MS);
            }
        };
        main.postDelayed(request.probe, TTS_SPEAKING_PROBE_MS);
    }

    private void armDeadline(TtsRequest request) {
        request.deadline = () -> {
            request.deadline = null;
            if (request.acked || request.terminal()) return;
            PluginCall pending = request.ackCall;
            request.ackCall = null;
            ttsLog(request, "START_NOT_CONFIRMED", "state=" + request.state);
            // Não é terminal: um DONE atrasado ainda será registrado e emitido.
            if (pending != null) pending.reject("start not confirmed", "TTS_START_NOT_CONFIRMED");
        };
        main.postDelayed(request.deadline, TTS_START_TIMEOUT_MS);
    }

    private boolean safeIsSpeaking() {
        try {
            return tts != null && tts.isSpeaking();
        } catch (Exception ignored) {
            return false;
        }
    }

    /** Resolve o ACK uma vez só, com a fonte que confirmou. */
    private void ackRequest(TtsRequest request, String source, boolean startEventMissed) {
        if (request.acked) return;
        request.acked = true;
        request.ackSource = source;
        if (request.deadline != null) main.removeCallbacks(request.deadline);
        request.deadline = null;
        PluginCall pending = request.ackCall;
        request.ackCall = null;
        if (pending != null) {
            JSObject result = new JSObject();
            result.put("requestId", request.requestId);
            result.put("utteranceId", request.utteranceId);
            result.put("started", true);
            result.put("ackSource", source);
            result.put("startEventMissed", startEventMissed);
            pending.resolve(result);
        }
    }

    private void supersede(TtsRequest previous, String byRequestId) {
        previous.state = "SUPERSEDED";
        previous.supersededBy = byRequestId;
        previous.cancelledAt = System.currentTimeMillis();
        ttsLog(previous, "SUPERSEDED", "by=" + shortId(byRequestId));
        emitTts("TTS_SUPERSEDED", previous.requestId, previous.utteranceId, "superseded", "TTS_SUPERSEDED");
        settleRequest(previous, true, "TTS_SUPERSEDED");
    }

    private void failRequest(TtsRequest request, String code, String engineState) {
        request.state = "ERROR";
        request.errorCode = code;
        request.onErrorAt = request.onErrorAt > 0 ? request.onErrorAt : System.currentTimeMillis();
        ttsLog(request, "ON_ERROR", "code=" + code);
        emitTts("TTS_ERROR", request.requestId, request.utteranceId, engineState, code);
        settleRequest(request, true, code);
        if (request.requestId.equals(currentRequestId)) {
            currentRequestId = null;
            currentUtteranceId = null;
        }
    }

    /** Fecha as chamadas pendentes desta request (e só desta). */
    private void settleRequest(TtsRequest request, boolean interrupted, String rejectCode) {
        if (request.probe != null) main.removeCallbacks(request.probe);
        request.probe = null;
        if (request.deadline != null) main.removeCallbacks(request.deadline);
        request.deadline = null;
        PluginCall ack = request.ackCall;
        request.ackCall = null;
        if (ack != null && !request.acked) ack.reject(rejectCode == null ? "TTS_STOPPED" : rejectCode, rejectCode == null ? "TTS_STOPPED" : rejectCode);
        PluginCall end = request.endCall;
        request.endCall = null;
        if (end != null) {
            JSObject ret = new JSObject();
            ret.put("interrupted", interrupted);
            // RC2.2.24 — o retorno também prova se o motor começou ESTA fala.
            boolean started = request.onStartAt > 0 || request.firstSpeakingObservedAt > 0 || request.onDoneAt > 0;
            ret.put("started", started);
            if (request.utteranceId != null) ret.put("utteranceId", request.utteranceId);
            ret.put("requestId", request.requestId);
            end.setKeepAlive(false);
            if (!started && "ERROR".equals(request.state)) end.reject(rejectCode, rejectCode);
            else end.resolve(ret);
        }
    }

    /**
     * RC2.2.27 — cancela SÓ a própria request (quem a criou desmontou). Fala de
     * outro componente nunca é parada por aqui.
     */
    @PluginMethod
    public void cancelSpeak(PluginCall call) {
        main.post(() -> {
            String requestId = call.getString("requestId", null);
            TtsRequest request = requestId == null ? null : ttsRequests.get(requestId);
            JSObject result = new JSObject();
            result.put("requestId", requestId);
            if (request == null || request.terminal()) {
                result.put("cancelled", false);
                call.resolve(result);
                return;
            }
            boolean isCurrent = request.requestId.equals(currentRequestId);
            if (isCurrent && safeIsSpeaking() && tts != null) tts.stop();
            request.state = "STOPPED";
            request.cancelledAt = System.currentTimeMillis();
            ttsLog(request, "CANCELLED", "current=" + isCurrent);
            emitTts("TTS_STOPPED", request.requestId, request.utteranceId, "cancelled", "TTS_CANCELLED");
            settleRequest(request, true, "TTS_CANCELLED");
            if (isCurrent) {
                currentRequestId = null;
                currentUtteranceId = null;
            }
            result.put("cancelled", true);
            call.resolve(result);
        });
    }

    @PluginMethod
    public void getTtsPlaybackState(PluginCall call) {
        main.post(() -> {
            String requestId = call.getString("requestId", currentRequestId);
            TtsRequest request = requestId == null ? null : ttsRequests.get(requestId);
            JSObject result;
            if (request != null) {
                result = request.toJson();
            } else {
                result = new JSObject();
                result.put("requestId", requestId);
                result.put("utteranceId", (String) null);
                result.put("state", "IDLE");
                result.put("started", false);
                result.put("done", false);
                result.put("errorCode", (String) null);
            }
            // Fonte independente, AO VIVO: só vale para a request corrente.
            boolean isCurrent = requestId != null && requestId.equals(currentRequestId);
            result.put("isCurrent", isCurrent);
            result.put("engineSpeakingNow", isCurrent && safeIsSpeaking());
            call.resolve(result);
        });
    }

    /** RC2.2.27 — /qa/device › ANDROID TTS FORENSICS (sem texto, sem PII). */
    @PluginMethod
    public void getTtsForensics(PluginCall call) {
        main.post(() -> {
            JSObject ret = new JSObject();
            ret.put("pluginAvailable", true);
            ret.put("engine", tts != null ? tts.getDefaultEngine() : null);
            ret.put("initStatus", ttsInitStatus == TextToSpeech.SUCCESS ? "SUCCESS" : ttsInitStatus == -1 ? "PENDING" : "ERROR");
            ret.put("languageStatus", languageStatus(localeFor("zh-CN")));
            ret.put("requestedLocale", "zh-CN");
            String voiceLocale = null;
            try {
                if (tts != null && tts.getVoice() != null && tts.getVoice().getLocale() != null) voiceLocale = tts.getVoice().getLocale().toLanguageTag();
            } catch (Exception ignored) {
                // motor sem voz carregada
            }
            ret.put("voiceLocale", voiceLocale);
            ret.put("androidApi", Build.VERSION.SDK_INT);
            ret.put("manufacturer", Build.MANUFACTURER);
            ret.put("model", Build.MODEL);
            String webView = null;
            try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    android.content.pm.PackageInfo info = android.webkit.WebView.getCurrentWebViewPackage();
                    if (info != null) webView = info.packageName + "/" + info.versionName;
                }
            } catch (Exception ignored) {
                // WebView sem pacote
            }
            ret.put("webView", webView);
            ret.put("stopMode", ttsStopMode);
            ret.put("currentRequestId", currentRequestId);
            ret.put("currentUtteranceId", currentUtteranceId);
            TtsRequest current = currentRequestId == null ? null : ttsRequests.get(currentRequestId);
            ret.put("currentState", current == null ? "IDLE" : current.state);
            ret.put("isSpeaking", safeIsSpeaking());
            ret.put("onStartCount", onStartCount);
            ret.put("onDoneCount", onDoneCount);
            ret.put("onStopCount", onStopCount);
            ret.put("onErrorCount", onErrorCount);
            ret.put("engineSpeakingCount", engineSpeakingCount);
            ret.put("pendingAck", current != null && current.ackCall != null);
            JSArray recent = new JSArray();
            List<TtsRequest> all = new ArrayList<>(ttsRequests.values());
            for (int i = Math.max(0, all.size() - 20); i < all.size(); i++) recent.put(all.get(i).toJson());
            ret.put("requests", recent);
            call.resolve(ret);
        });
    }

    /** QA: modo de parada (A/B) e logs LongyuTTS. O JS só chama em build de QA. */
    @PluginMethod
    public void setTtsQaOptions(PluginCall call) {
        main.post(() -> {
            String mode = call.getString("stopMode", ttsStopMode);
            if ("CONDITIONAL".equals(mode) || "EXPLICIT_STOP".equals(mode) || "QUEUE_FLUSH_ONLY".equals(mode)) ttsStopMode = mode;
            Boolean logs = call.getBoolean("logs", ttsQaLogs);
            ttsQaLogs = Boolean.TRUE.equals(logs);
            JSObject ret = new JSObject();
            ret.put("stopMode", ttsStopMode);
            ret.put("logs", ttsQaLogs);
            call.resolve(ret);
        });
    }

    private static String shortId(String id) {
        if (id == null) return "-";
        return id.length() <= 10 ? id : id.substring(id.length() - 10);
    }

    /** Log QA com identidade e evento. NUNCA o texto falado, nome ou conteúdo da aula. */
    private void ttsLog(TtsRequest request, String event, String detail) {
        if (!ttsQaLogs) return;
        android.util.Log.i(TTS_LOG_TAG, "req=" + shortId(request == null ? null : request.requestId)
            + " src=" + (request == null ? "-" : request.source)
            + " event=" + event + (detail == null ? "" : " " + detail));
    }

    /**
     * RC2.2.24 — evento de TTS com identidade: requestId, utteranceId,
     * timestamp e engineState. NUNCA o texto falado.
     */
    private void emitTts(String type, String requestId, String utteranceId, String engineState, String code) {
        if (requestId == null || requestId.isEmpty()) return;
        JSObject event = new JSObject();
        event.put("type", type);
        event.put("requestId", requestId);
        if (utteranceId != null) event.put("utteranceId", utteranceId);
        event.put("timestamp", System.currentTimeMillis());
        event.put("engineState", engineState);
        if (code != null) event.put("code", code);
        notifyListeners("ttsEvent", event);
    }

    private TtsRequest requestForUtterance(String utteranceId) {
        if (utteranceId == null) return null;
        String rid = requestByUtterance.get(utteranceId);
        return rid == null ? null : ttsRequests.get(rid);
    }

    private final UtteranceProgressListener progressListener = new UtteranceProgressListener() {
        /** RC2.2.17 · B — o motor começou a falar: é isso que o app chama de "tocou". */
        @Override
        public void onStart(String utteranceId) {
            main.post(() -> {
                onStartCount += 1;
                TtsRequest request = requestForUtterance(utteranceId);
                if (request == null) return;
                request.onStartAt = System.currentTimeMillis();
                ttsLog(request, "ON_START", null);
                // RC2.2.24 — toda fala anuncia o SEU início (o JS filtra por requestId).
                emitTts("TTS_STARTED", request.requestId, utteranceId, "speaking", null);
                if (request.terminal()) return;
                request.state = "STARTED";
                ackRequest(request, "onStart", false);
                JSObject event = new JSObject();
                event.put("state", "start");
                notifyListeners("ttsState", event);
            });
        }

        @Override
        public void onDone(String utteranceId) {
            main.post(() -> {
                onDoneCount += 1;
                TtsRequest request = requestForUtterance(utteranceId);
                if (request == null) return;
                request.onDoneAt = System.currentTimeMillis();
                ttsLog(request, "ON_DONE", "acked=" + request.acked);
                emitTts("TTS_DONE", request.requestId, utteranceId, "idle", null);
                // O DONE atrasado de uma request SUPERSEDED fica registrado, mas não a reabre.
                if (request.terminal()) return;
                // DONE sem START (onStart perdido) ainda prova que ESTA fala tocou.
                ackRequest(request, request.onStartAt > 0 ? request.ackSource : "onDone", request.onStartAt == 0 && request.firstSpeakingObservedAt == 0);
                request.state = "DONE";
                settleRequest(request, false, null);
                if (request.requestId.equals(currentRequestId)) {
                    currentRequestId = null;
                    currentUtteranceId = null;
                }
            });
        }

        @Override
        public void onError(String utteranceId) {
            main.post(() -> {
                onErrorCount += 1;
                TtsRequest request = requestForUtterance(utteranceId);
                if (request == null || request.terminal()) return;
                request.onErrorAt = System.currentTimeMillis();
                failRequest(request, "TTS_SPEAK_FAILED", "error");
            });
        }

        @Override
        public void onStop(String utteranceId, boolean interrupted) {
            main.post(() -> {
                onStopCount += 1;
                TtsRequest request = requestForUtterance(utteranceId);
                if (request == null) return;
                request.onStopAt = System.currentTimeMillis();
                ttsLog(request, "ON_STOP", "interrupted=" + interrupted);
                emitTts("TTS_STOPPED", request.requestId, utteranceId, "stopped", null);
                // Prova da corrida: a fala que substituiu esta recebeu o stop da anterior?
                if (request.supersededBy != null) {
                    TtsRequest next = ttsRequests.get(request.supersededBy);
                    if (next != null) next.stopCallbackReceived = true;
                }
                if (request.terminal()) return;
                request.state = "STOPPED";
                settleRequest(request, true, "TTS_STOPPED");
                if (request.requestId.equals(currentRequestId)) {
                    currentRequestId = null;
                    currentUtteranceId = null;
                }
            });
        }
    };

    /** Para a fala corrente (pausa do app, microfone, gravação). */
    private void finishSpeak(boolean interrupted) {
        TtsRequest request = currentRequestId == null ? null : ttsRequests.get(currentRequestId);
        currentRequestId = null;
        currentUtteranceId = null;
        if (request == null || request.terminal()) return;
        request.state = interrupted ? "STOPPED" : "DONE";
        request.cancelledAt = System.currentTimeMillis();
        ttsLog(request, "CANCELLED", "reason=owner");
        settleRequest(request, interrupted, "TTS_STOPPED");
    }

    @PluginMethod
    public void stop(PluginCall call) {
        main.post(() -> {
            if (safeIsSpeaking() && tts != null) tts.stop();
            finishSpeak(true);
            call.resolve();
        });
    }

    @PluginMethod
    public void openTtsSettings(PluginCall call) {
        Intent intent = new Intent("com.android.settings.TTS_SETTINGS");
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        try {
            getContext().startActivity(intent);
        } catch (ActivityNotFoundException e) {
            Intent install = new Intent(TextToSpeech.Engine.ACTION_INSTALL_TTS_DATA);
            install.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            try {
                getContext().startActivity(install);
            } catch (ActivityNotFoundException ignored) {
                call.reject("no tts settings", "TTS_SETTINGS_UNAVAILABLE");
                return;
            }
        }
        call.resolve();
    }

    /** RC2.2.17 · I — "Instalar voz chinesa" pelo fluxo do próprio Android. */
    @PluginMethod
    public void installTtsData(PluginCall call) {
        Intent install = new Intent(TextToSpeech.Engine.ACTION_INSTALL_TTS_DATA);
        install.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        try {
            getContext().startActivity(install);
            call.resolve();
        } catch (ActivityNotFoundException e) {
            call.reject("no tts installer", "TTS_INSTALL_UNAVAILABLE");
        }
    }

    // ── Reconhecimento de fala ────────────────────────────────────────────

    private Intent recognitionIntent(String language) {
        Intent intent = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
        intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
        intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE, language);
        return intent;
    }

    /** zh-CN, zh_CN, cmn-Hans-CN, zh-Hans… contam como mandarim. */
    static boolean listHasLanguage(List<String> languages, String language) {
        if (languages == null) return false;
        String wanted = language == null ? "zh-cn" : language.toLowerCase(Locale.ROOT).replace('_', '-');
        for (String entry : languages) {
            if (entry == null) continue;
            String tag = entry.toLowerCase(Locale.ROOT).replace('_', '-');
            if (tag.equals(wanted)) return true;
            if (wanted.startsWith("zh") && (tag.equals("zh") || tag.startsWith("zh-cn") || tag.startsWith("zh-hans") || tag.startsWith("cmn-hans") || tag.equals("cmn"))) return true;
        }
        return false;
    }

    /**
     * RC2.2.17 · V — Android 13+: pergunta ao serviço se o mandarim existe ANTES
     * da primeira atividade de fala (não espera a escuta falhar).
     * checked=false → API antiga ou sem serviço: o front-end trata como
     * UNKNOWN_SUPPORT / SERVICE_UNAVAILABLE.
     */
    @PluginMethod
    public void checkRecognitionSupport(PluginCall call) {
        String language = call.getString("language", "zh-CN");
        boolean service = SpeechRecognizer.isRecognitionAvailable(getContext());
        boolean onDevice = Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && SpeechRecognizer.isOnDeviceRecognitionAvailable(getContext());
        JSObject base = new JSObject();
        base.put("serviceAvailable", service);
        base.put("onDeviceAvailable", onDevice);
        base.put("sdk", Build.VERSION.SDK_INT);
        base.put("installedOnDevice", false);
        base.put("pendingOnDevice", false);
        base.put("supportedOnDevice", false);
        base.put("online", false);
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU || (!service && !onDevice)) {
            base.put("checked", false);
            call.resolve(base);
            return;
        }
        main.post(() -> {
            releaseSupportProbe();
            try {
                supportProbe = onDevice ? SpeechRecognizer.createOnDeviceSpeechRecognizer(getContext()) : SpeechRecognizer.createSpeechRecognizer(getContext());
                supportProbe.checkRecognitionSupport(recognitionIntent(language), getContext().getMainExecutor(), new RecognitionSupportCallback() {
                    @Override
                    public void onSupportResult(RecognitionSupport support) {
                        main.post(() -> {
                            base.put("checked", true);
                            base.put("installedOnDevice", listHasLanguage(support.getInstalledOnDeviceLanguages(), language));
                            base.put("pendingOnDevice", listHasLanguage(support.getPendingOnDeviceLanguages(), language));
                            base.put("supportedOnDevice", listHasLanguage(support.getSupportedOnDeviceLanguages(), language));
                            base.put("online", listHasLanguage(support.getOnlineLanguages(), language));
                            releaseSupportProbe();
                            call.resolve(base);
                        });
                    }

                    @Override
                    public void onError(int error) {
                        main.post(() -> {
                            base.put("checked", false);
                            base.put("error", errorCode(error));
                            releaseSupportProbe();
                            call.resolve(base);
                        });
                    }
                });
            } catch (RuntimeException e) {
                base.put("checked", false);
                base.put("error", "SUPPORT_CHECK_FAILED");
                releaseSupportProbe();
                call.resolve(base);
            }
        });
    }

    private void releaseSupportProbe() {
        if (supportProbe != null) {
            try {
                supportProbe.destroy();
            } catch (RuntimeException ignored) {}
            supportProbe = null;
        }
    }

    /**
     * RC2.2.17 · W–X — o serviço suporta mandarim mas o modelo não está no
     * aparelho: pede o download ao Android. API 34+ reporta progresso /
     * agendado / pronto pelo evento `modelDownload`; API 33 só dispara.
     */
    @PluginMethod
    public void triggerModelDownload(PluginCall call) {
        String language = call.getString("language", "zh-CN");
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) {
            JSObject ret = new JSObject();
            ret.put("status", "UNSUPPORTED_API");
            call.resolve(ret);
            return;
        }
        main.post(() -> {
            releaseModelDownloader();
            try {
                boolean onDevice = SpeechRecognizer.isOnDeviceRecognitionAvailable(getContext());
                modelDownloader = onDevice ? SpeechRecognizer.createOnDeviceSpeechRecognizer(getContext()) : SpeechRecognizer.createSpeechRecognizer(getContext());
                JSObject ret = new JSObject();
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
                    modelDownloader.triggerModelDownload(recognitionIntent(language), getContext().getMainExecutor(), new ModelDownloadListener() {
                        @Override
                        public void onProgress(int completedPercent) {
                            JSObject event = new JSObject();
                            event.put("status", "DOWNLOADING");
                            event.put("progress", completedPercent);
                            notifyListeners("modelDownload", event);
                        }

                        @Override
                        public void onSuccess() {
                            modelDownloadEvent("SUCCESS");
                        }

                        @Override
                        public void onScheduled() {
                            modelDownloadEvent("SCHEDULED");
                        }

                        @Override
                        public void onError(int error) {
                            JSObject event = new JSObject();
                            event.put("status", "ERROR");
                            event.put("code", errorCode(error));
                            notifyListeners("modelDownload", event);
                            main.post(LongyuSpeechPlugin.this::releaseModelDownloader);
                        }
                    });
                } else {
                    modelDownloader.triggerModelDownload(recognitionIntent(language));
                }
                ret.put("status", "STARTED");
                call.resolve(ret);
            } catch (RuntimeException e) {
                releaseModelDownloader();
                JSObject ret = new JSObject();
                ret.put("status", "ERROR");
                ret.put("code", "MODEL_DOWNLOAD_FAILED");
                call.resolve(ret);
            }
        });
    }

    private void modelDownloadEvent(String status) {
        JSObject event = new JSObject();
        event.put("status", status);
        notifyListeners("modelDownload", event);
        main.post(this::releaseModelDownloader);
    }

    private void releaseModelDownloader() {
        if (modelDownloader != null) {
            try {
                modelDownloader.destroy();
            } catch (RuntimeException ignored) {}
            modelDownloader = null;
        }
    }

    @PluginMethod
    public void getRecognitionStatus(PluginCall call) {
        JSObject ret = new JSObject();
        boolean available = SpeechRecognizer.isRecognitionAvailable(getContext());
        boolean onDevice = Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && SpeechRecognizer.isOnDeviceRecognitionAvailable(getContext());
        ret.put("available", available || onDevice);
        ret.put("onDevice", onDevice);
        ret.put("microphone", getPermissionState("microphone").toString());
        call.resolve(ret);
    }

    @PluginMethod
    public void startRecognition(PluginCall call) {
        if (getPermissionState("microphone") != PermissionState.GRANTED) {
            call.reject("microphone permission", "INSUFFICIENT_PERMISSIONS");
            return;
        }
        if (recognitionCall != null) {
            // Toque repetido: definido e sem segundo reconhecedor.
            call.reject("recognizer busy", "RECOGNIZER_BUSY");
            return;
        }
        String language = call.getString("language", "zh-CN");
        long timeout = Math.max(3000L, Math.min(MAX_RECOGNITION_TIMEOUT_MS, call.getLong("timeoutMs", DEFAULT_RECOGNITION_TIMEOUT_MS)));
        recognitionCall = call;
        call.setKeepAlive(true);
        // RC2.2.21 — o JS só pede on-device quando o mandarim está INSTALADO no
        // reconhecedor on-device (checkRecognitionSupport). Antes, havendo
        // on-device, ele era usado sempre — mesmo sem zh-CN, enquanto o serviço
        // normal do aparelho suportava mandarim.
        boolean preferOnDevice = Boolean.TRUE.equals(call.getBoolean("preferOnDevice", false));
        main.post(() -> {
            // Microfone e voz do sistema não disputam o áudio.
            if (tts != null) tts.stop();
            finishSpeak(true);
            // Nem a própria gravação de prática toca durante a escuta.
            if (practicePlayCall != null || practicePlayer != null) finishPracticePlay("STOPPED");
            boolean onDevice = Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && SpeechRecognizer.isOnDeviceRecognitionAvailable(getContext());
            boolean service = SpeechRecognizer.isRecognitionAvailable(getContext());
            recognitionLanguage = language;
            recognitionPeakRms = -100f;
            recognitionSignalNotified = false;
            if (onDevice && (preferOnDevice || !service)) {
                recognizer = SpeechRecognizer.createOnDeviceSpeechRecognizer(getContext());
                recognizerKind = "on_device";
            } else if (service) {
                recognizer = SpeechRecognizer.createSpeechRecognizer(getContext());
                recognizerKind = "service";
            } else {
                failRecognition("RECOGNITION_UNAVAILABLE");
                return;
            }
            JSObject created = new JSObject();
            created.put("state", "created");
            created.put("recognizer", recognizerKind);
            created.put("requestedLocale", language);
            notifyListeners("recognitionState", created);
            recognizer.setRecognitionListener(recognitionListener);
            Intent intent = recognitionIntent(language);
            intent.putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 5);
            intent.putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, false);
            intent.putExtra(RecognizerIntent.EXTRA_CALLING_PACKAGE, getContext().getPackageName());
            recognitionTimeout = () -> failRecognition("SPEECH_TIMEOUT");
            main.postDelayed(recognitionTimeout, timeout);
            recognizer.startListening(intent);
        });
    }

    @PluginMethod
    public void stopRecognition(PluginCall call) {
        main.post(() -> {
            if (recognizer != null) recognizer.stopListening();
            call.resolve();
        });
    }

    @PluginMethod
    public void cancelRecognition(PluginCall call) {
        main.post(() -> {
            failRecognition("CANCELLED");
            call.resolve();
        });
    }

    private final RecognitionListener recognitionListener = new RecognitionListener() {
        @Override
        public void onReadyForSpeech(Bundle params) {
            JSObject event = new JSObject();
            event.put("state", "listening");
            notifyListeners("recognitionState", event);
        }

        @Override
        public void onBeginningOfSpeech() {
            JSObject event = new JSObject();
            event.put("state", "speech_begin");
            notifyListeners("recognitionState", event);
        }

        /** Só o pico do sinal (número técnico); nunca o áudio nem nota de pronúncia. */
        @Override
        public void onRmsChanged(float rmsdB) {
            if (rmsdB > recognitionPeakRms) recognitionPeakRms = rmsdB;
            if (!recognitionSignalNotified && rmsdB >= RECOGNITION_SIGNAL_RMS_DB) {
                recognitionSignalNotified = true;
                JSObject event = new JSObject();
                event.put("state", "signal");
                event.put("signalDetected", true);
                notifyListeners("recognitionState", event);
            }
        }

        @Override
        public void onBufferReceived(byte[] buffer) {}

        @Override
        public void onEndOfSpeech() {
            JSObject event = new JSObject();
            event.put("state", "speech_end");
            notifyListeners("recognitionState", event);
        }

        @Override
        public void onError(int error) {
            failRecognition(errorCode(error));
        }

        @Override
        public void onResults(Bundle results) {
            ArrayList<String> matches = results == null ? null : results.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION);
            PluginCall call = recognitionCall;
            JSObject diagnostics = recognitionDiagnostics();
            releaseRecognizer();
            if (call == null) return;
            call.setKeepAlive(false);
            if (matches == null || matches.isEmpty()) {
                call.reject("no match", "NO_MATCH", (Exception) null, diagnostics);
                return;
            }
            JSObject ret = diagnostics;
            ret.put("matches", new JSArray(matches));
            call.resolve(ret);
        }

        @Override
        public void onPartialResults(Bundle partialResults) {}

        @Override
        public void onEvent(int eventType, Bundle params) {}
    };

    /** Sinal captado + reconhecedor e locale usados (sem áudio, sem texto). */
    private JSObject recognitionDiagnostics() {
        JSObject ret = new JSObject();
        ret.put("recognizer", recognizerKind);
        ret.put("requestedLocale", recognitionLanguage);
        ret.put("usedLocale", recognitionLanguage);
        ret.put("signalDetected", recognitionPeakRms >= RECOGNITION_SIGNAL_RMS_DB);
        ret.put("peakRmsBucket", recognitionPeakRms < 0f ? "none" : recognitionPeakRms < 4f ? "low" : recognitionPeakRms < 7f ? "medium" : "high");
        return ret;
    }

    /** Código estável para o front-end traduzir. Nunca "ERROR_CLIENT = 5" cru. */
    static String errorCode(int error) {
        if (error == SpeechRecognizer.ERROR_NO_MATCH) return "NO_MATCH";
        if (error == SpeechRecognizer.ERROR_SPEECH_TIMEOUT) return "SPEECH_TIMEOUT";
        if (error == SpeechRecognizer.ERROR_AUDIO) return "AUDIO";
        if (error == SpeechRecognizer.ERROR_NETWORK) return "NETWORK";
        if (error == SpeechRecognizer.ERROR_NETWORK_TIMEOUT) return "NETWORK_TIMEOUT";
        if (error == SpeechRecognizer.ERROR_RECOGNIZER_BUSY) return "RECOGNIZER_BUSY";
        if (error == SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS) return "INSUFFICIENT_PERMISSIONS";
        if (error == SpeechRecognizer.ERROR_LANGUAGE_NOT_SUPPORTED) return "LANGUAGE_NOT_SUPPORTED";
        if (error == SpeechRecognizer.ERROR_LANGUAGE_UNAVAILABLE) return "LANGUAGE_UNAVAILABLE";
        if (error == SpeechRecognizer.ERROR_SERVER || error == SpeechRecognizer.ERROR_SERVER_DISCONNECTED) return "NETWORK";
        if (error == SpeechRecognizer.ERROR_TOO_MANY_REQUESTS) return "RECOGNIZER_BUSY";
        if (error == SpeechRecognizer.ERROR_CLIENT) return "CLIENT";
        return "RECOGNITION_FAILED";
    }

    private void failRecognition(String code) {
        PluginCall call = recognitionCall;
        JSObject diagnostics = recognitionDiagnostics();
        releaseRecognizer();
        if (call == null) return;
        call.setKeepAlive(false);
        call.reject(code, code, (Exception) null, diagnostics);
    }

    /** Sempre destrói: nada de reconhecedor vivo esperando fala. */
    private void releaseRecognizer() {
        if (recognitionTimeout != null) {
            main.removeCallbacks(recognitionTimeout);
            recognitionTimeout = null;
        }
        if (recognizer != null) {
            try {
                recognizer.cancel();
            } catch (RuntimeException ignored) {}
            recognizer.destroy();
            recognizer = null;
            JSObject event = new JSObject();
            event.put("state", "destroyed");
            notifyListeners("recognitionState", event);
        }
        recognitionCall = null;
    }

    // ── RC2.2.17 · AA / RC2.2.21 — gravação temporária de prática ─────────
    //
    // RC2.2.21 (P1 SELF_COMPARE_VOICE_NOT_AUDIBLE_ANDROID): arquivo existir e o
    // MediaPlayer terminar NÃO provam que o aluno ouviu. O contrato agora é uma
    // máquina de estados que o JS acompanha pelo evento `practiceRecordingState`:
    //
    //   IDLE → PREPARING → RECORDING → STOPPING → RECORDED
    //        → PLAY_PREPARING → PLAYING → PLAYED   (ou FAILED com código estável)
    //
    // Reprodução: AudioAttributes de MÍDIA/FALA antes do prepare, foco de áudio
    // transitório (liberado sempre), volume de mídia e rota de saída lidos antes,
    // PLAYING só depois de isPlaying() confirmado. Nada vai para a nuvem.

    private static final long PRACTICE_MIN_DURATION_MS = 400L;
    private static final long PRACTICE_MIN_BYTES = 1024L;
    /** Amplitude (0–32767) abaixo disto em toda a captura = microfone mudo. */
    private static final int PRACTICE_SILENT_AMPLITUDE = 300;
    private static final long PLAYING_CONFIRM_MS = 1200L;

    private String practiceState = "IDLE";
    private int practicePeakAmplitude = 0;
    private Runnable amplitudeSampler;
    private Runnable playingProbe;
    private AudioFocusRequest practiceFocusRequest;
    private boolean practicePlaybackStarted = false;

    private File practiceFile() {
        return new File(getContext().getCacheDir(), "longyu-practice.m4a");
    }

    private void setPracticeState(String state, String code) {
        practiceState = state;
        JSObject event = new JSObject();
        event.put("state", state);
        if (code != null) event.put("code", code);
        notifyListeners("practiceRecordingState", event);
    }

    private AudioManager audioManager() {
        return (AudioManager) getContext().getSystemService(Context.AUDIO_SERVICE);
    }

    /** Rota de saída de mídia provável (sem nome de aparelho, só a classe). */
    private String outputRoute() {
        AudioManager am = audioManager();
        if (am == null) return "UNKNOWN";
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) return "UNKNOWN";
        boolean bluetooth = false, wired = false, usb = false, speaker = false;
        for (AudioDeviceInfo device : am.getDevices(AudioManager.GET_DEVICES_OUTPUTS)) {
            int type = device.getType();
            if (type == AudioDeviceInfo.TYPE_BLUETOOTH_A2DP || type == AudioDeviceInfo.TYPE_BLUETOOTH_SCO) bluetooth = true;
            else if (type == AudioDeviceInfo.TYPE_WIRED_HEADSET || type == AudioDeviceInfo.TYPE_WIRED_HEADPHONES) wired = true;
            else if (type == AudioDeviceInfo.TYPE_USB_HEADSET || type == AudioDeviceInfo.TYPE_USB_DEVICE) usb = true;
            else if (type == AudioDeviceInfo.TYPE_BUILTIN_SPEAKER) speaker = true;
        }
        // O Android toca mídia no fone/Bluetooth quando conectados; nunca forçamos o alto-falante.
        if (bluetooth) return "BLUETOOTH";
        if (wired) return "WIRED_HEADSET";
        if (usb) return "USB";
        if (speaker) return "BUILT_IN_SPEAKER";
        return "OTHER";
    }

    private JSObject mediaVolume() {
        JSObject ret = new JSObject();
        AudioManager am = audioManager();
        if (am == null) return ret;
        int current = am.getStreamVolume(AudioManager.STREAM_MUSIC);
        int max = am.getStreamMaxVolume(AudioManager.STREAM_MUSIC);
        boolean muted = Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && am.isStreamMute(AudioManager.STREAM_MUSIC);
        ret.put("mediaVolumeCurrent", current);
        ret.put("mediaVolumeMax", max);
        ret.put("mediaMuted", muted);
        return ret;
    }

    /** Diagnóstico de áudio para o QA (sem conteúdo): volume, rota e estado. */
    /**
     * RC2.2.22 — contadores de recurso para o QA (vazamento / RECOGNIZER_BUSY
     * permanente). Em repouso, todos devem ser 0. Só números; nada de conteúdo.
     */
    @PluginMethod
    public void getResourceCounters(PluginCall call) {
        main.post(() -> {
            JSObject ret = new JSObject();
            ret.put("activeMediaPlayers", practicePlayer != null ? 1 : 0);
            ret.put("activeRecorders", practiceRecorder != null ? 1 : 0);
            ret.put("activeRecognizers", (recognizer != null ? 1 : 0) + (supportProbe != null ? 1 : 0) + (modelDownloader != null ? 1 : 0));
            ret.put("activeTtsUtterances", currentRequestId != null ? 1 : 0);
            ret.put("pendingRecognitionCalls", recognitionCall != null ? 1 : 0);
            ret.put("activeTimersCritical", (amplitudeSampler != null ? 1 : 0) + (playingProbe != null ? 1 : 0));
            ret.put("practiceState", practiceState);
            call.resolve(ret);
        });
    }

    @PluginMethod
    public void getPracticeAudioDiagnostics(PluginCall call) {
        main.post(() -> {
            JSObject ret = mediaVolume();
            ret.put("outputRoute", outputRoute());
            ret.put("state", practiceState);
            ret.put("hasRecording", practiceFile != null && practiceFile.exists() && practiceRecorder == null);
            call.resolve(ret);
        });
    }

    @PluginMethod
    public void startPracticeRecording(PluginCall call) {
        if (getPermissionState("microphone") != PermissionState.GRANTED) {
            call.reject("microphone permission", "INSUFFICIENT_PERMISSIONS");
            return;
        }
        if (recognitionCall != null) {
            call.reject("recognizer busy", "RECOGNIZER_BUSY");
            return;
        }
        main.post(() -> {
            if (tts != null) tts.stop();
            finishSpeak(true);
            // Nova gravação apaga a anterior: nunca acumula áudio do aluno.
            discardPracticeRecording();
            setPracticeState("PREPARING", null);
            practiceFile = practiceFile();
            practicePeakAmplitude = 0;
            try {
                practiceRecorder = Build.VERSION.SDK_INT >= Build.VERSION_CODES.S ? new MediaRecorder(getContext()) : new MediaRecorder();
                practiceRecorder.setAudioSource(MediaRecorder.AudioSource.MIC);
                practiceRecorder.setOutputFormat(MediaRecorder.OutputFormat.MPEG_4);
                practiceRecorder.setAudioEncoder(MediaRecorder.AudioEncoder.AAC);
                practiceRecorder.setAudioEncodingBitRate(64000);
                practiceRecorder.setAudioSamplingRate(44100);
                practiceRecorder.setMaxDuration(15000);
                practiceRecorder.setOutputFile(practiceFile.getAbsolutePath());
                practiceRecorder.prepare();
                practiceRecorder.start();
                practiceStartedAt = System.currentTimeMillis();
                startAmplitudeSampler();
                setPracticeState("RECORDING", null);
                JSObject ret = new JSObject();
                ret.put("recording", true);
                call.resolve(ret);
            } catch (Exception e) {
                discardPracticeRecording();
                setPracticeState("FAILED", "RECORDING_FAILED");
                call.reject("recording failed", "RECORDING_FAILED");
            }
        });
    }

    /** Amostra a amplitude máxima (número técnico, nunca o áudio) durante a captura. */
    private void startAmplitudeSampler() {
        stopAmplitudeSampler();
        amplitudeSampler = new Runnable() {
            @Override
            public void run() {
                if (practiceRecorder == null) return;
                try {
                    practicePeakAmplitude = Math.max(practicePeakAmplitude, practiceRecorder.getMaxAmplitude());
                } catch (RuntimeException ignored) {}
                main.postDelayed(this, 120);
            }
        };
        main.postDelayed(amplitudeSampler, 120);
    }

    private void stopAmplitudeSampler() {
        if (amplitudeSampler != null) {
            main.removeCallbacks(amplitudeSampler);
            amplitudeSampler = null;
        }
    }

    /** Duração lida do próprio arquivo (não do relógio). -1 quando ilegível. */
    private long metadataDurationMs(File file) {
        MediaMetadataRetriever retriever = new MediaMetadataRetriever();
        try {
            retriever.setDataSource(file.getAbsolutePath());
            String value = retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_DURATION);
            return value == null ? -1L : Long.parseLong(value);
        } catch (RuntimeException e) {
            return -1L;
        } finally {
            try {
                retriever.release();
            } catch (Exception ignored) {}
        }
    }

    @PluginMethod
    public void stopPracticeRecording(PluginCall call) {
        main.post(() -> {
            if (practiceRecorder == null) {
                call.reject("not recording", "NOT_RECORDING");
                return;
            }
            setPracticeState("STOPPING", null);
            try {
                practicePeakAmplitude = Math.max(practicePeakAmplitude, practiceRecorder.getMaxAmplitude());
            } catch (RuntimeException ignored) {}
            stopAmplitudeSampler();
            long wallDuration = System.currentTimeMillis() - practiceStartedAt;
            try {
                practiceRecorder.stop();
            } catch (RuntimeException e) {
                // stop() logo após start(): nada gravado de verdade.
                discardPracticeRecording();
                setPracticeState("FAILED", "RECORDING_TOO_SHORT");
                call.reject("recording too short", "RECORDING_TOO_SHORT");
                return;
            }
            practiceRecorder.release();
            practiceRecorder = null;
            boolean exists = practiceFile != null && practiceFile.exists();
            long bytes = exists ? practiceFile.length() : 0L;
            long metadata = exists ? metadataDurationMs(practiceFile) : -1L;
            JSObject ret = new JSObject();
            // RC2.2.21 — duração do ARQUIVO quando legível; relógio só como reserva.
            ret.put("durationMs", metadata > 0 ? metadata : wallDuration);
            ret.put("wallDurationMs", wallDuration);
            ret.put("metadataDurationMs", metadata);
            // RC2.2.19 — prova (sem conteúdo) de que o arquivo temporário existe.
            ret.put("fileExists", exists);
            ret.put("fileBytes", bytes);
            ret.put("peakAmplitude", practicePeakAmplitude);
            ret.put("signalDetected", practicePeakAmplitude > PRACTICE_SILENT_AMPLITUDE);
            if (!exists || bytes < PRACTICE_MIN_BYTES || metadata == 0L) {
                discardPracticeRecording();
                setPracticeState("FAILED", "INVALID_FILE");
                ret.put("code", "INVALID_FILE");
            } else if ((metadata > 0 ? metadata : wallDuration) < PRACTICE_MIN_DURATION_MS) {
                discardPracticeRecording();
                setPracticeState("FAILED", "RECORDING_TOO_SHORT");
                ret.put("code", "RECORDING_TOO_SHORT");
            } else {
                setPracticeState("RECORDED", null);
            }
            call.resolve(ret);
        });
    }

    private final AudioManager.OnAudioFocusChangeListener practiceFocusListener = (change) -> main.post(() -> {
        // Outro app (ligação, alarme, música) tomou o áudio: para e avisa.
        if (change == AudioManager.AUDIOFOCUS_LOSS || change == AudioManager.AUDIOFOCUS_LOSS_TRANSIENT) {
            if (practicePlayer != null) finishPracticePlay("PLAYBACK_INTERRUPTED");
        }
    });

    private boolean requestPracticeFocus(AudioAttributes attributes) {
        AudioManager am = audioManager();
        if (am == null) return true;
        int result;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            practiceFocusRequest = new AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN_TRANSIENT)
                .setAudioAttributes(attributes)
                .setOnAudioFocusChangeListener(practiceFocusListener, main)
                .build();
            result = am.requestAudioFocus(practiceFocusRequest);
        } else {
            result = am.requestAudioFocus(practiceFocusListener, AudioManager.STREAM_MUSIC, AudioManager.AUDIOFOCUS_GAIN_TRANSIENT);
        }
        return result == AudioManager.AUDIOFOCUS_REQUEST_GRANTED;
    }

    /** Sempre devolve o foco: nunca deixa a música/outro app interrompido. */
    private void abandonPracticeFocus() {
        AudioManager am = audioManager();
        if (am == null) return;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            if (practiceFocusRequest != null) am.abandonAudioFocusRequest(practiceFocusRequest);
            practiceFocusRequest = null;
        } else {
            am.abandonAudioFocus(practiceFocusListener);
        }
    }

    @PluginMethod
    public void playPracticeRecording(PluginCall call) {
        main.post(() -> {
            if (practiceRecorder != null || practiceFile == null || !practiceFile.exists()) {
                call.reject("no recording", "NO_RECORDING");
                return;
            }
            if (practiceFile.length() < PRACTICE_MIN_BYTES) {
                call.reject("invalid file", "INVALID_FILE");
                return;
            }
            if (tts != null) tts.stop();
            finishSpeak(true);
            // Toque repetido: a reprodução anterior termina como "parada" (não erro).
            if (practicePlayCall != null) finishPracticePlay("STOPPED");
            releasePracticePlayer();
            JSObject volume = mediaVolume();
            String route = outputRoute();
            // Volume de mídia zerado não é erro de gravação: orienta o aluno.
            if (volume.getInteger("mediaVolumeCurrent", 1) == 0 || volume.getBoolean("mediaMuted", false)) {
                JSObject data = new JSObject();
                data.put("outputRoute", route);
                setPracticeState("RECORDED", "MEDIA_VOLUME_ZERO");
                call.reject("media volume zero", "MEDIA_VOLUME_ZERO", (Exception) null, data);
                return;
            }
            setPracticeState("PLAY_PREPARING", null);
            practicePlaybackStarted = false;
            AudioAttributes attributes = new AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_MEDIA)
                .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
                .build();
            practicePlayCall = call;
            call.setKeepAlive(true);
            try {
                practicePlayer = new MediaPlayer();
                // Mídia/fala ANTES do prepare: nunca a rota de chamada (earpiece).
                practicePlayer.setAudioAttributes(attributes);
                practicePlayer.setDataSource(practiceFile.getAbsolutePath());
                practicePlayer.setOnCompletionListener((player) -> finishPracticePlay(practicePlaybackStarted ? null : "PLAYBACK_START_FAILED"));
                practicePlayer.setOnErrorListener((player, what, extra) -> {
                    finishPracticePlay("PLAYBACK_ERROR");
                    return true;
                });
                practicePlayer.prepare();
            } catch (Exception e) {
                finishPracticePlay("PLAYER_PREPARE_FAILED");
                return;
            }
            JSObject prepared = new JSObject();
            prepared.put("state", "PLAY_PREPARING");
            prepared.put("playbackPrepared", true);
            notifyListeners("practiceRecordingState", prepared);
            if (!requestPracticeFocus(attributes)) {
                finishPracticePlay("AUDIO_FOCUS_FAILED");
                return;
            }
            try {
                practicePlayer.start();
            } catch (RuntimeException e) {
                finishPracticePlay("PLAYBACK_START_FAILED");
                return;
            }
            // PLAYING só depois de o player confirmar que está tocando.
            playingProbe = () -> {
                playingProbe = null;
                if (practicePlayer == null) return;
                boolean playing;
                try {
                    playing = practicePlayer.isPlaying();
                } catch (RuntimeException e) {
                    playing = false;
                }
                if (!playing && !practicePlaybackStarted) {
                    finishPracticePlay("PLAYBACK_START_FAILED");
                    return;
                }
                if (!practicePlaybackStarted) markPracticePlaying(route, volume);
            };
            main.postDelayed(() -> {
                if (practicePlayer != null && !practicePlaybackStarted) {
                    try {
                        if (practicePlayer.isPlaying()) markPracticePlaying(route, volume);
                    } catch (RuntimeException ignored) {}
                }
            }, 60);
            main.postDelayed(playingProbe, PLAYING_CONFIRM_MS);
        });
    }

    private void markPracticePlaying(String route, JSObject volume) {
        practicePlaybackStarted = true;
        JSObject event = new JSObject();
        event.put("state", "PLAYING");
        event.put("playbackStarted", true);
        event.put("outputRoute", route);
        event.put("mediaVolumeCurrent", volume.getInteger("mediaVolumeCurrent", -1));
        event.put("mediaVolumeMax", volume.getInteger("mediaVolumeMax", -1));
        practiceState = "PLAYING";
        notifyListeners("practiceRecordingState", event);
    }

    /** "Parar" durante a reprodução: resolve como parada, sem erro, e libera tudo. */
    @PluginMethod
    public void stopPracticePlayback(PluginCall call) {
        main.post(() -> {
            if (practicePlayCall != null || practicePlayer != null) finishPracticePlay("STOPPED");
            call.resolve();
        });
    }

    /**
     * Fecha a reprodução. `code == null` = tocou até o fim DEPOIS de PLAYING.
     * "STOPPED" = o aluno parou (resolve sem erro). Qualquer outro = falha.
     */
    private void finishPracticePlay(String code) {
        if (playingProbe != null) {
            main.removeCallbacks(playingProbe);
            playingProbe = null;
        }
        boolean started = practicePlaybackStarted;
        PluginCall call = practicePlayCall;
        practicePlayCall = null;
        releasePracticePlayer();
        abandonPracticeFocus();
        practicePlaybackStarted = false;
        boolean hasFile = practiceFile != null && practiceFile.exists();
        if (code == null) setPracticeState("PLAYED", null);
        else if ("STOPPED".equals(code)) setPracticeState(hasFile ? "RECORDED" : "IDLE", null);
        else setPracticeState(hasFile ? "RECORDED" : "FAILED", code);
        if (call == null) return;
        call.setKeepAlive(false);
        if (code == null || "STOPPED".equals(code)) {
            JSObject ret = new JSObject();
            ret.put("played", code == null);
            ret.put("stopped", "STOPPED".equals(code));
            ret.put("playbackPrepared", true);
            ret.put("playbackStarted", started);
            ret.put("playbackCompleted", code == null);
            call.resolve(ret);
        } else {
            call.reject("playback failed", code);
        }
    }

    private void releasePracticePlayer() {
        if (practicePlayer != null) {
            try {
                practicePlayer.stop();
            } catch (RuntimeException ignored) {}
            practicePlayer.release();
            practicePlayer = null;
        }
    }

    @PluginMethod
    public void deletePracticeRecording(PluginCall call) {
        main.post(() -> {
            discardPracticeRecording();
            JSObject ret = new JSObject();
            ret.put("deleted", true);
            call.resolve(ret);
        });
    }

    /**
     * RC2.2.21 — pausa TRANSITÓRIA (diálogo de permissão, painel de notificação,
     * sobreposição do sistema): para o microfone na hora e para a reprodução,
     * mas NÃO apaga uma gravação válida. Captura interrompida no meio é
     * descartada (não é uma gravação completa).
     */
    private void interruptPractice() {
        if (practiceRecorder != null) {
            stopAmplitudeSampler();
            try {
                practiceRecorder.stop();
            } catch (RuntimeException ignored) {}
            practiceRecorder.release();
            practiceRecorder = null;
            File file = practiceFile != null ? practiceFile : practiceFile();
            if (file.exists()) {
                //noinspection ResultOfMethodCallIgnored
                file.delete();
            }
            practiceFile = null;
            setPracticeState("FAILED", "RECORDING_INTERRUPTED");
        }
        if (practicePlayCall != null || practicePlayer != null) finishPracticePlay("PLAYBACK_INTERRUPTED");
    }

    /** Para gravação/reprodução, libera foco e APAGA o arquivo. Idempotente. */
    private void discardPracticeRecording() {
        stopAmplitudeSampler();
        if (practiceRecorder != null) {
            try {
                practiceRecorder.stop();
            } catch (RuntimeException ignored) {}
            practiceRecorder.release();
            practiceRecorder = null;
        }
        if (practicePlayCall != null) finishPracticePlay("PLAYBACK_INTERRUPTED");
        releasePracticePlayer();
        abandonPracticeFocus();
        File file = practiceFile != null ? practiceFile : practiceFile();
        if (file.exists()) {
            //noinspection ResultOfMethodCallIgnored
            file.delete();
        }
        practiceFile = null;
        practiceState = "IDLE";
    }

    // ── Permissão do microfone ────────────────────────────────────────────

    @PluginMethod
    public void requestMicrophone(PluginCall call) {
        if (getPermissionState("microphone") == PermissionState.GRANTED) {
            resolvePermission(call);
            return;
        }
        requestPermissionForAlias("microphone", call, "microphonePermissionCallback");
    }

    @PermissionCallback
    private void microphonePermissionCallback(PluginCall call) {
        resolvePermission(call);
    }

    private void resolvePermission(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("microphone", getPermissionState("microphone").toString());
        call.resolve(ret);
    }

    /** "Negado para sempre": só a tela do app no Android resolve. */
    @PluginMethod
    public void openAppSettings(PluginCall call) {
        Intent intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
        intent.setData(Uri.fromParts("package", getContext().getPackageName(), null));
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        getContext().startActivity(intent);
        call.resolve();
    }

    @PluginMethod
    public void openNotificationSettings(PluginCall call) {
        Intent intent;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            intent = new Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS);
            intent.putExtra(Settings.EXTRA_APP_PACKAGE, getContext().getPackageName());
        } else {
            intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
            intent.setData(Uri.fromParts("package", getContext().getPackageName(), null));
        }
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        getContext().startActivity(intent);
        call.resolve();
    }

    // ── Ciclo de vida ─────────────────────────────────────────────────────

    /**
     * Pausa (inclusive transitória): para a voz, cancela o reconhecimento e
     * interrompe microfone/reprodução — nunca escuta nem toca escondido. A
     * gravação VÁLIDA só é apagada no background real (onStop) ou ao fechar.
     */
    @Override
    protected void handleOnPause() {
        super.handleOnPause();
        if (tts != null) tts.stop();
        finishSpeak(true);
        failRecognition("CANCELLED");
        // RC2.2.21 — diálogo de permissão/painel também pausam: não apaga aqui.
        interruptPractice();
    }

    /** Background de verdade (Activity invisível): a gravação temporária some. */
    @Override
    protected void handleOnStop() {
        super.handleOnStop();
        // RC2.2.17 · AB — sair do app apaga a gravação de prática.
        discardPracticeRecording();
    }

    @Override
    protected void handleOnDestroy() {
        failRecognition("CANCELLED");
        discardPracticeRecording();
        releaseSupportProbe();
        releaseModelDownloader();
        finishSpeak(true);
        if (tts != null) {
            tts.stop();
            tts.shutdown();
            tts = null;
        }
        super.handleOnDestroy();
    }
}
