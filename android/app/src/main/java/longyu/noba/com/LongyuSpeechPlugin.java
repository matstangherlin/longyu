package longyu.noba.com;

import android.content.ActivityNotFoundException;
import android.content.Intent;
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
                if (status == TextToSpeech.SUCCESS) tts.setOnUtteranceProgressListener(progressListener);
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
        ensureTts(() -> {
            JSObject ret = new JSObject();
            String status = languageStatus(localeFor(language));
            ret.put("available", "AVAILABLE".equals(status));
            ret.put("status", status);
            ret.put("engine", tts != null ? tts.getDefaultEngine() : null);
            // RC2.2.17 · H — diagnóstico sem PII.
            ret.put("initStatus", ttsInitStatus == TextToSpeech.SUCCESS ? "SUCCESS" : ttsInitStatus == -1 ? "PENDING" : "ERROR");
            ret.put("requestedLocale", localeFor(language).toLanguageTag());
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
        main.post(() -> {
            // Microfone e voz do sistema não disputam o áudio.
            if (tts != null) tts.stop();
            finishSpeak(true);
            boolean onDevice = Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && SpeechRecognizer.isOnDeviceRecognitionAvailable(getContext());
            if (onDevice) {
                recognizer = SpeechRecognizer.createOnDeviceSpeechRecognizer(getContext());
            } else if (SpeechRecognizer.isRecognitionAvailable(getContext())) {
                recognizer = SpeechRecognizer.createSpeechRecognizer(getContext());
            } else {
                failRecognition("RECOGNITION_UNAVAILABLE");
                return;
            }
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
        public void onBeginningOfSpeech() {}

        @Override
        public void onRmsChanged(float rmsdB) {}

        @Override
        public void onBufferReceived(byte[] buffer) {}

        @Override
        public void onEndOfSpeech() {}

        @Override
        public void onError(int error) {
            failRecognition(errorCode(error));
        }

        @Override
        public void onResults(Bundle results) {
            ArrayList<String> matches = results == null ? null : results.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION);
            PluginCall call = recognitionCall;
            releaseRecognizer();
            if (call == null) return;
            call.setKeepAlive(false);
            if (matches == null || matches.isEmpty()) {
                call.reject("no match", "NO_MATCH");
                return;
            }
            JSObject ret = new JSObject();
            ret.put("matches", new JSArray(matches));
            call.resolve(ret);
        }

        @Override
        public void onPartialResults(Bundle partialResults) {}

        @Override
        public void onEvent(int eventType, Bundle params) {}
    };

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
        return "RECOGNITION_FAILED";
    }

    private void failRecognition(String code) {
        PluginCall call = recognitionCall;
        releaseRecognizer();
        if (call == null) return;
        call.setKeepAlive(false);
        call.reject(code, code);
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
        }
        recognitionCall = null;
    }

    // ── RC2.2.17 · AA — gravação temporária de prática ────────────────────

    private File practiceFile() {
        return new File(getContext().getCacheDir(), "longyu-practice.m4a");
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
            practiceFile = practiceFile();
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
                JSObject ret = new JSObject();
                ret.put("recording", true);
                call.resolve(ret);
            } catch (Exception e) {
                discardPracticeRecording();
                call.reject("recording failed", "RECORDING_FAILED");
            }
        });
    }

    @PluginMethod
    public void stopPracticeRecording(PluginCall call) {
        main.post(() -> {
            if (practiceRecorder == null) {
                call.reject("not recording", "NOT_RECORDING");
                return;
            }
            long duration = System.currentTimeMillis() - practiceStartedAt;
            try {
                practiceRecorder.stop();
            } catch (RuntimeException e) {
                // stop() logo após start(): nada gravado de verdade.
                discardPracticeRecording();
                call.reject("recording too short", "RECORDING_TOO_SHORT");
                return;
            }
            practiceRecorder.release();
            practiceRecorder = null;
            JSObject ret = new JSObject();
            ret.put("durationMs", duration);
            call.resolve(ret);
        });
    }

    @PluginMethod
    public void playPracticeRecording(PluginCall call) {
        main.post(() -> {
            if (practiceRecorder != null || practiceFile == null || !practiceFile.exists()) {
                call.reject("no recording", "NO_RECORDING");
                return;
            }
            if (tts != null) tts.stop();
            finishSpeak(true);
            releasePracticePlayer();
            try {
                practicePlayer = new MediaPlayer();
                practicePlayer.setDataSource(practiceFile.getAbsolutePath());
                practicePlayCall = call;
                call.setKeepAlive(true);
                practicePlayer.setOnCompletionListener((player) -> finishPracticePlay(true));
                practicePlayer.setOnErrorListener((player, what, extra) -> {
                    finishPracticePlay(false);
                    return true;
                });
                practicePlayer.prepare();
                practicePlayer.start();
            } catch (Exception e) {
                finishPracticePlay(false);
            }
        });
    }

    private void finishPracticePlay(boolean played) {
        PluginCall call = practicePlayCall;
        practicePlayCall = null;
        releasePracticePlayer();
        if (call == null) return;
        call.setKeepAlive(false);
        if (played) {
            JSObject ret = new JSObject();
            ret.put("played", true);
            call.resolve(ret);
        } else {
            call.reject("playback failed", "PLAYBACK_FAILED");
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

    /** Para gravação/reprodução e APAGA o arquivo. Idempotente. */
    private void discardPracticeRecording() {
        if (practiceRecorder != null) {
            try {
                practiceRecorder.stop();
            } catch (RuntimeException ignored) {}
            practiceRecorder.release();
            practiceRecorder = null;
        }
        if (practicePlayCall != null) finishPracticePlay(false);
        releasePracticePlayer();
        File file = practiceFile != null ? practiceFile : practiceFile();
        if (file.exists()) {
            //noinspection ResultOfMethodCallIgnored
            file.delete();
        }
        practiceFile = null;
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

    /** Background: para a voz e cancela o microfone (nunca escuta escondido). */
    @Override
    protected void handleOnPause() {
        super.handleOnPause();
        if (tts != null) tts.stop();
        finishSpeak(true);
        failRecognition("CANCELLED");
        // RC2.2.17 · AB — sair da atividade apaga a gravação de prática.
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
