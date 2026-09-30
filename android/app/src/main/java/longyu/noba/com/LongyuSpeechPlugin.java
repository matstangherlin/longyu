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
    private PluginCall speakCall;
    private int utteranceSeq = 0;
    /** RC2.2.17 — só a fala CORRENTE pode resolver/rejeitar speakCall. */
    private String currentUtteranceId;

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
    }

    @PluginMethod
    public void speak(PluginCall call) {
        String text = call.getString("text", "");
        if (text == null || text.trim().isEmpty()) {
            call.reject("empty text", "TTS_EMPTY_TEXT");
            return;
        }
        String language = call.getString("language", "zh-CN");
        Float rate = call.getFloat("rate", 0.85f);
        Float pitch = call.getFloat("pitch", 1.0f);
        ensureTts(() -> {
            Locale locale = localeFor(language);
            String status = languageStatus(locale);
            if (!"AVAILABLE".equals(status)) {
                // Nunca finge que tocou.
                call.reject(status, status);
                return;
            }
            // Uma fala por vez: a anterior termina como "interrompida".
            finishSpeak(true);
            tts.setLanguage(locale);
            tts.setSpeechRate(rate == null ? 0.85f : Math.max(0.3f, Math.min(2.0f, rate)));
            tts.setPitch(pitch == null ? 1.0f : Math.max(0.5f, Math.min(2.0f, pitch)));
            String id = UTTERANCE_PREFIX + (++utteranceSeq);
            speakCall = call;
            currentUtteranceId = id;
            call.setKeepAlive(true);
            int result = tts.speak(text, TextToSpeech.QUEUE_FLUSH, null, id);
            if (result != TextToSpeech.SUCCESS) {
                speakCall = null;
                currentUtteranceId = null;
                call.setKeepAlive(false);
                call.reject("speak failed", "TTS_SPEAK_FAILED");
            }
        });
    }

    private final UtteranceProgressListener progressListener = new UtteranceProgressListener() {
        /** RC2.2.17 · B — o motor começou a falar: é isso que o app chama de "tocou". */
        @Override
        public void onStart(String utteranceId) {
            main.post(() -> {
                if (utteranceId == null || !utteranceId.equals(currentUtteranceId)) return;
                JSObject event = new JSObject();
                event.put("state", "start");
                notifyListeners("ttsState", event);
            });
        }

        @Override
        public void onDone(String utteranceId) {
            main.post(() -> {
                // O onStop/onDone atrasado da fala ANTERIOR não encerra a atual.
                if (utteranceId == null || !utteranceId.equals(currentUtteranceId)) return;
                finishSpeak(false);
            });
        }

        @Override
        public void onError(String utteranceId) {
            main.post(() -> {
                if (utteranceId == null || !utteranceId.equals(currentUtteranceId)) return;
                PluginCall call = speakCall;
                speakCall = null;
                currentUtteranceId = null;
                if (call != null) {
                    call.setKeepAlive(false);
                    call.reject("tts error", "TTS_SPEAK_FAILED");
                }
            });
        }

        @Override
        public void onStop(String utteranceId, boolean interrupted) {
            main.post(() -> {
                if (utteranceId == null || !utteranceId.equals(currentUtteranceId)) return;
                finishSpeak(true);
            });
        }
    };

    private void finishSpeak(boolean interrupted) {
        PluginCall call = speakCall;
        speakCall = null;
        currentUtteranceId = null;
        if (call == null) return;
        JSObject ret = new JSObject();
        ret.put("interrupted", interrupted);
        call.setKeepAlive(false);
        call.resolve(ret);
    }

    @PluginMethod
    public void stop(PluginCall call) {
        if (tts != null) tts.stop();
        finishSpeak(true);
        call.resolve();
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
            ret.put("activeTtsUtterances", speakCall != null ? 1 : 0);
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
