package longyu.noba.com;

import android.content.Context;
import android.content.res.AssetFileDescriptor;
import android.media.AudioFocusRequest;
import android.media.AudioManager;
import android.media.MediaPlayer;
import android.net.Uri;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;
import androidx.annotation.Nullable;
import androidx.media3.common.AudioAttributes;
import androidx.media3.common.C;
import androidx.media3.common.MediaItem;
import androidx.media3.common.PlaybackException;
import androidx.media3.common.Player;
import androidx.media3.exoplayer.ExoPlayer;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.IOException;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.List;

/**
 * RC2.2.31D — Media3 + Direct Asset MediaPlayer, session-scoped async failover.
 *
 * Fixed packaged speech prefers DIRECT_MEDIA_PLAYER (AssetFileDescriptor).
 * Async Direct failure before STARTED → Media3 (same requestId).
 * Terminal AUDIO_ERROR only after local backends exhausted.
 * STARTED requires isPlaying or positionMs proof.
 */
@CapacitorPlugin(name = "LongyuMedia")
public class LongyuMediaPlugin extends Plugin {

    private static final String TAG = "LongyuMedia";
    private static final String EVENT_READY = "AUDIO_READY";
    private static final String EVENT_STARTED = "AUDIO_STARTED";
    private static final String EVENT_ENDED = "AUDIO_ENDED";
    private static final String EVENT_ERROR = "AUDIO_ERROR";
    private static final String EVENT_CANCELLED = "AUDIO_CANCELLED";
    private static final String EVENT_SUPERSEDED = "AUDIO_SUPERSEDED";
    private static final String EVENT_STALE = "STALE_MEDIA_CALLBACK_IGNORED";
    private static final String EVENT_BACKEND_SELECTED = "AUDIO_BACKEND_SELECTED";
    private static final String EVENT_BACKEND_FAILED = "AUDIO_BACKEND_FAILED";
    private static final String EVENT_FOCUS_GRANTED = "AUDIO_FOCUS_GRANTED";
    private static final String EVENT_FOCUS_DENIED = "AUDIO_FOCUS_DENIED";
    private static final String EVENT_START_PROVED = "AUDIO_START_PROVED";
    private static final String EVENT_LOCAL_EXHAUSTED = "AUDIO_LOCAL_BACKENDS_EXHAUSTED";
    private static final long MIN_PLAYBACK_PROOF_MS = 100L;
    private static final long DIRECT_PREPARE_TIMEOUT_MS = 1400L;
    private static final long DIRECT_START_PROOF_TIMEOUT_MS = 1000L;
    private static final String BACKEND_DIRECT = "DIRECT_MEDIA_PLAYER";
    private static final String BACKEND_MEDIA3 = "MEDIA3";

    private static final class NativeMediaSession {
        final String requestId;
        final String audioId;
        final String mediaId;
        final long generation;
        final String assetPath;
        String backend = BACKEND_MEDIA3;
        String state = "IDLE";
        boolean started = false;
        long createdAt = System.currentTimeMillis();
        long preparedAt = 0;
        long startedAt = 0;
        long endedAt = 0;
        long cancelledAt = 0;
        long positionMs = 0;
        int fallbackCount = 0;
        final List<String> attemptedBackends = new ArrayList<>();
        final List<String> backendErrors = new ArrayList<>();
        String audioFocus = "NONE";
        @Nullable String errorCode = null;
        @Nullable Player.Listener listener = null;

        NativeMediaSession(String requestId, String audioId, String assetPath, long generation) {
            this.requestId = requestId;
            this.audioId = audioId;
            this.mediaId = requestId;
            this.assetPath = assetPath;
            this.generation = generation;
        }
    }

    private final Handler main = new Handler(Looper.getMainLooper());
    @Nullable private ExoPlayer player;
    @Nullable private MediaPlayer directPlayer;
    @Nullable private NativeMediaSession activeSession;
    @Nullable private Runnable positionWatchdog;
    @Nullable private Runnable directPrepareTimeout;
    @Nullable private Runnable directStartProofTimeout;
    @Nullable private AudioFocusRequest audioFocusRequest;
    private boolean audioFocusHeld = false;
    private long generationCounter = 0;
    private String playerState = "IDLE";

    private ExoPlayer ensurePlayer() {
        if (player != null) return player;
        ExoPlayer exo = new ExoPlayer.Builder(getContext()).build();
        AudioAttributes attrs = new AudioAttributes.Builder()
            .setContentType(C.AUDIO_CONTENT_TYPE_SPEECH)
            .setUsage(C.USAGE_MEDIA)
            .build();
        exo.setAudioAttributes(attrs, /* handleAudioFocus= */ true);
        exo.setVolume(1f);
        player = exo;
        return exo;
    }

    private void clearPositionWatchdog() {
        if (positionWatchdog != null) {
            main.removeCallbacks(positionWatchdog);
            positionWatchdog = null;
        }
    }

    /**
     * RC2.2.31B — Media3 short-clip: STATE_ENDED / position advance can land
     * without a durable onIsPlayingChanged(true). Emit STARTED once so JS can
     * confirm AUDIO_HEARD and unlock Continuar / conversation advance.
     */
    private void clearDirectTimeouts() {
        if (directPrepareTimeout != null) {
            main.removeCallbacks(directPrepareTimeout);
            directPrepareTimeout = null;
        }
        if (directStartProofTimeout != null) {
            main.removeCallbacks(directStartProofTimeout);
            directStartProofTimeout = null;
        }
    }

    private void abandonAudioFocus() {
        if (!audioFocusHeld) return;
        try {
            AudioManager am = (AudioManager) getContext().getSystemService(Context.AUDIO_SERVICE);
            if (am == null) return;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && audioFocusRequest != null) {
                am.abandonAudioFocusRequest(audioFocusRequest);
            } else {
                am.abandonAudioFocus(null);
            }
        } catch (Exception ignored) {
        }
        audioFocusHeld = false;
        audioFocusRequest = null;
        if (activeSession != null) activeSession.audioFocus = "ABANDONED";
    }

    /** Transient focus for short speech clips (Direct MediaPlayer). */
    private boolean requestAudioFocus(NativeMediaSession session) {
        try {
            AudioManager am = (AudioManager) getContext().getSystemService(Context.AUDIO_SERVICE);
            if (am == null) {
                session.audioFocus = "DENIED";
                emit(EVENT_FOCUS_DENIED, session, "NO_AUDIO_MANAGER");
                return false;
            }
            int result;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                android.media.AudioAttributes attrs = new android.media.AudioAttributes.Builder()
                    .setUsage(android.media.AudioAttributes.USAGE_MEDIA)
                    .setContentType(android.media.AudioAttributes.CONTENT_TYPE_SPEECH)
                    .build();
                audioFocusRequest = new AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK)
                    .setAudioAttributes(attrs)
                    .setAcceptsDelayedFocusGain(false)
                    .setOnAudioFocusChangeListener(focusChange -> {
                        /* short clips — no duck resume needed */
                    })
                    .build();
                result = am.requestAudioFocus(audioFocusRequest);
            } else {
                result = am.requestAudioFocus(
                    null,
                    AudioManager.STREAM_MUSIC,
                    AudioManager.AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK
                );
            }
            if (result == AudioManager.AUDIOFOCUS_REQUEST_GRANTED) {
                audioFocusHeld = true;
                session.audioFocus = "GRANTED";
                emit(EVENT_FOCUS_GRANTED, session, null);
                return true;
            }
            session.audioFocus = "DENIED";
            emit(EVENT_FOCUS_DENIED, session, "FOCUS_RESULT_" + result);
            return false;
        } catch (Exception e) {
            session.audioFocus = "DENIED";
            emit(EVENT_FOCUS_DENIED, session, "FOCUS_EXCEPTION");
            return false;
        }
    }

    private void markStarted(NativeMediaSession s, String why) {
        if (s == null || s.started) return;
        clearDirectTimeouts();
        long pos = safePosition();
        s.started = true;
        s.state = "PLAYING";
        s.startedAt = System.currentTimeMillis();
        s.positionMs = pos;
        setState("PLAYING");
        Log.i(TAG, "AUDIO_STARTED requestId=" + s.requestId + " why=" + why + " positionMs=" + pos);
        emit(EVENT_STARTED, s, why);
        emit(EVENT_START_PROVED, s, why);
    }

    private void armPositionWatchdog(final NativeMediaSession session) {
        clearPositionWatchdog();
        final long capturedGeneration = session.generation;
        final String capturedRequestId = session.requestId;
        final long[] ticks = new long[] {0};
        positionWatchdog = new Runnable() {
            @Override
            public void run() {
                NativeMediaSession active = activeSession;
                if (active == null
                    || active.generation != capturedGeneration
                    || !capturedRequestId.equals(active.requestId)
                    || active.started
                    || "ENDED".equals(active.state)
                    || "ERROR".equals(active.state)
                    || "CANCELLED".equals(active.state)
                    || "SUPERSEDED".equals(active.state)) {
                    positionWatchdog = null;
                    return;
                }
                long pos = safePosition();
                active.positionMs = pos;
                boolean playing = player != null && player.isPlaying();
                if (playing || pos >= MIN_PLAYBACK_PROOF_MS) {
                    markStarted(active, playing ? "IS_PLAYING_WATCHDOG" : "POSITION_PROOF");
                    positionWatchdog = null;
                    return;
                }
                // Se READY mas player ainda parado (foco atrasado), re-pedir play.
                if (player != null && !player.isPlaying() && "READY".equals(active.state)) {
                    try {
                        player.play();
                    } catch (Exception ignored) {
                    }
                }
                ticks[0] += 1;
                if (ticks[0] < 40) {
                    main.postDelayed(this, 50);
                } else {
                    positionWatchdog = null;
                }
            }
        };
        main.postDelayed(positionWatchdog, 50);
    }

    /** Listener capturado por sessão — identidade fixa, nunca currentMediaItem global. */
    private Player.Listener bindSessionListener(final NativeMediaSession session) {
        final String capturedRequestId = session.requestId;
        final long capturedGeneration = session.generation;
        return new Player.Listener() {
            private boolean isLive() {
                NativeMediaSession active = activeSession;
                if (active == null) return false;
                if (active.generation != capturedGeneration) return false;
                if (!capturedRequestId.equals(active.requestId)) return false;
                return true;
            }

            private void stale(String reason) {
                Log.i(TAG, "STALE_CALLBACK requestId=" + capturedRequestId
                    + " gen=" + capturedGeneration + " reason=" + reason
                    + " active=" + (activeSession != null ? activeSession.requestId : "null"));
                JSObject data = new JSObject();
                data.put("mediaId", capturedRequestId);
                data.put("requestId", capturedRequestId);
                data.put("generation", capturedGeneration);
                data.put("reason", reason);
                if (activeSession != null) data.put("activeRequestId", activeSession.requestId);
                notifyListeners(EVENT_STALE, data);
            }

            @Override
            public void onPlaybackStateChanged(int playbackState) {
                if (!isLive()) {
                    stale("STATE_" + playbackState);
                    return;
                }
                NativeMediaSession s = activeSession;
                if (s == null) return;
                if (playbackState == Player.STATE_READY && !s.started) {
                    s.state = "READY";
                    s.preparedAt = System.currentTimeMillis();
                    setState("READY");
                    emit(EVENT_READY, s, null);
                    armPositionWatchdog(s);
                }
                if (playbackState == Player.STATE_ENDED) {
                    clearPositionWatchdog();
                    // RC2.2.31C — only repair STARTED with real position proof (not preparedAt alone).
                    long pos = safePosition();
                    if (!s.started && pos >= MIN_PLAYBACK_PROOF_MS) {
                        markStarted(s, "ENDED_REPAIR");
                    }
                    s.state = "ENDED";
                    s.endedAt = System.currentTimeMillis();
                    s.positionMs = pos;
                    setState("ENDED");
                    emit(EVENT_ENDED, s, null);
                }
            }

            @Override
            public void onIsPlayingChanged(boolean isPlaying) {
                if (!isLive()) {
                    stale("IS_PLAYING_" + isPlaying);
                    return;
                }
                NativeMediaSession s = activeSession;
                if (s == null) return;
                if (isPlaying && !s.started) {
                    clearPositionWatchdog();
                    markStarted(s, "IS_PLAYING");
                } else if (isPlaying) {
                    s.positionMs = safePosition();
                }
            }

            @Override
            public void onPlayerError(PlaybackException error) {
                if (!isLive()) {
                    stale(error != null ? error.getErrorCodeName() : "PLAYER_ERROR");
                    return;
                }
                clearPositionWatchdog();
                clearDirectTimeouts();
                NativeMediaSession s = activeSession;
                if (s == null) return;
                String code = error != null ? error.getErrorCodeName() : "PLAYER_ERROR";
                s.backendErrors.add(code);
                emit(EVENT_BACKEND_FAILED, s, code);
                // Media3 is last local backend — terminal only after exhaustion.
                emitLocalExhausted(s, code);
            }
        };
    }

    private void detachSessionListener(@Nullable NativeMediaSession session) {
        if (session == null || session.listener == null || player == null) return;
        try {
            player.removeListener(session.listener);
        } catch (Exception ignored) {
        }
        session.listener = null;
    }

    /** A → SUPERSEDED terminal antes de B. */
    private void supersedeActive(@Nullable String reason) {
        clearPositionWatchdog();
        clearDirectTimeouts();
        abandonAudioFocus();
        NativeMediaSession prev = activeSession;
        if (prev == null) {
            releaseDirectPlayer();
            return;
        }
        if ("ENDED".equals(prev.state) || "ERROR".equals(prev.state)
            || "CANCELLED".equals(prev.state) || "SUPERSEDED".equals(prev.state)) {
            detachSessionListener(prev);
            releaseDirectPlayer();
            return;
        }
        prev.state = "SUPERSEDED";
        prev.cancelledAt = System.currentTimeMillis();
        prev.positionMs = safePosition();
        emit(EVENT_SUPERSEDED, prev, reason != null ? reason : "SUPERSEDED");
        detachSessionListener(prev);
        releaseDirectPlayer();
    }

    /** Intermediate backend failure — never terminal AUDIO_ERROR. Same requestId. */
    private void failDirectBackend(NativeMediaSession session, String reason) {
        if (session == null || session.started) return;
        if (!BACKEND_DIRECT.equals(session.backend)) return;
        if ("ERROR".equals(session.state) || "ENDED".equals(session.state)
            || "CANCELLED".equals(session.state) || "SUPERSEDED".equals(session.state)) {
            return;
        }
        clearDirectTimeouts();
        clearPositionWatchdog();
        session.backendErrors.add(reason);
        session.fallbackCount += 1;
        Log.w(TAG, "AUDIO_BACKEND_FAILED requestId=" + session.requestId + " backend=DIRECT reason=" + reason);
        emit(EVENT_BACKEND_FAILED, session, reason);
        releaseDirectPlayer();
        abandonAudioFocus();
        startMedia3Backend(session);
    }

    private void emitLocalExhausted(NativeMediaSession session, String reason) {
        session.state = "ERROR";
        session.errorCode = reason != null ? reason : "LOCAL_BACKENDS_EXHAUSTED";
        setState("ERROR");
        emit(EVENT_LOCAL_EXHAUSTED, session, session.errorCode);
        emit(EVENT_ERROR, session, session.errorCode);
        abandonAudioFocus();
    }

    private void startMedia3Backend(final NativeMediaSession session) {
        if (session.started) return;
        if (session.attemptedBackends.contains(BACKEND_MEDIA3)) {
            emitLocalExhausted(session, "MEDIA3_ALREADY_ATTEMPTED");
            return;
        }
        try {
            ExoPlayer exo = ensurePlayer();
            session.backend = BACKEND_MEDIA3;
            session.attemptedBackends.add(BACKEND_MEDIA3);
            session.state = "PREPARING";
            setState("PREPARING");
            emit(EVENT_BACKEND_SELECTED, session, BACKEND_MEDIA3);
            Player.Listener listener = bindSessionListener(session);
            session.listener = listener;
            exo.addListener(listener);
            activeSession = session;
            MediaItem item = new MediaItem.Builder()
                .setUri(assetUri(session.assetPath))
                .setMediaId(session.requestId)
                .build();
            exo.setMediaItem(item);
            exo.prepare();
            exo.play();
        } catch (Exception e) {
            session.backendErrors.add("MEDIA3_START_FAILED");
            emit(EVENT_BACKEND_FAILED, session, "MEDIA3_START_FAILED");
            emitLocalExhausted(session, "MEDIA3_START_FAILED");
        }
    }

    private long safePosition() {
        if (directPlayer != null) {
            try {
                return Math.max(0, directPlayer.getCurrentPosition());
            } catch (Exception e) {
                /* fall through */
            }
        }
        if (player == null) return 0;
        try {
            return Math.max(0, player.getCurrentPosition());
        } catch (Exception e) {
            return 0;
        }
    }

    private void releaseDirectPlayer() {
        clearDirectTimeouts();
        if (directPlayer == null) return;
        try {
            directPlayer.setOnPreparedListener(null);
            directPlayer.setOnCompletionListener(null);
            directPlayer.setOnErrorListener(null);
            directPlayer.stop();
        } catch (Exception ignored) {
        }
        try {
            directPlayer.release();
        } catch (Exception ignored) {
        }
        directPlayer = null;
    }

    private int streamMusicVolume() {
        try {
            AudioManager am = (AudioManager) getContext().getSystemService(Context.AUDIO_SERVICE);
            if (am == null) return -1;
            return am.getStreamVolume(AudioManager.STREAM_MUSIC);
        } catch (Exception e) {
            return -1;
        }
    }

    private int streamMusicMaxVolume() {
        try {
            AudioManager am = (AudioManager) getContext().getSystemService(Context.AUDIO_SERVICE);
            if (am == null) return -1;
            return am.getStreamMaxVolume(AudioManager.STREAM_MUSIC);
        } catch (Exception e) {
            return -1;
        }
    }

    /** RC2.2.31D — packaged fixed speech; async failures failover to Media3 before STARTED. */
    private boolean playDirectAsset(final NativeMediaSession session, String assetPath) {
        releaseDirectPlayer();
        try {
            AssetFileDescriptor afd;
            try {
                afd = getContext().getAssets().openFd(assetPath);
            } catch (IOException openFdErr) {
                // Confirm existence via open(); compressed assets may refuse openFd.
                try (InputStream in = getContext().getAssets().open(assetPath)) {
                    if (in != null) {
                        session.backendErrors.add("ASSET_COMPRESSED_FD_UNAVAILABLE");
                        Log.w(TAG, "ASSET_COMPRESSED_FD_UNAVAILABLE " + assetPath);
                        return false;
                    }
                } catch (IOException openErr) {
                    session.backendErrors.add("AUDIO_ASSET_NOT_PACKAGED");
                    return false;
                }
                return false;
            }
            MediaPlayer mp = new MediaPlayer();
            android.media.AudioAttributes attrs = new android.media.AudioAttributes.Builder()
                .setUsage(android.media.AudioAttributes.USAGE_MEDIA)
                .setContentType(android.media.AudioAttributes.CONTENT_TYPE_SPEECH)
                .build();
            mp.setAudioAttributes(attrs);
            mp.setDataSource(afd.getFileDescriptor(), afd.getStartOffset(), afd.getLength());
            afd.close();
            final String capturedRequestId = session.requestId;
            final long capturedGeneration = session.generation;
            mp.setOnPreparedListener(player -> {
                NativeMediaSession active = activeSession;
                if (active == null || active.generation != capturedGeneration
                    || !capturedRequestId.equals(active.requestId)) {
                    return;
                }
                if (directPrepareTimeout != null) {
                    main.removeCallbacks(directPrepareTimeout);
                    directPrepareTimeout = null;
                }
                active.state = "READY";
                active.preparedAt = System.currentTimeMillis();
                setState("READY");
                emit(EVENT_READY, active, null);
                if (!requestAudioFocus(active)) {
                    failDirectBackend(active, "AUDIO_FOCUS_DENIED");
                    return;
                }
                try {
                    player.start();
                } catch (Exception e) {
                    failDirectBackend(active, "DIRECT_START_FAILED");
                    return;
                }
                directStartProofTimeout = () -> {
                    NativeMediaSession live = activeSession;
                    if (live == null || live.generation != capturedGeneration
                        || !capturedRequestId.equals(live.requestId) || live.started) {
                        return;
                    }
                    failDirectBackend(live, "DIRECT_START_PROOF_TIMEOUT");
                };
                main.postDelayed(directStartProofTimeout, DIRECT_START_PROOF_TIMEOUT_MS);
                main.postDelayed(() -> {
                    NativeMediaSession live = activeSession;
                    if (live == null || live.generation != capturedGeneration
                        || !capturedRequestId.equals(live.requestId) || live.started) {
                        return;
                    }
                    try {
                        long pos = player.getCurrentPosition();
                        live.positionMs = pos;
                        if (player.isPlaying() || pos >= MIN_PLAYBACK_PROOF_MS) {
                            markStarted(live, player.isPlaying() ? "DIRECT_IS_PLAYING" : "DIRECT_POSITION_PROOF");
                        }
                    } catch (Exception ignored) {
                    }
                }, 80);
            });
            mp.setOnCompletionListener(player -> {
                NativeMediaSession active = activeSession;
                if (active == null || active.generation != capturedGeneration
                    || !capturedRequestId.equals(active.requestId)) {
                    return;
                }
                clearDirectTimeouts();
                long pos = 0;
                try {
                    pos = player.getCurrentPosition();
                } catch (Exception ignored) {
                }
                active.positionMs = pos;
                if (!active.started && pos >= MIN_PLAYBACK_PROOF_MS) {
                    markStarted(active, "DIRECT_ENDED_REPAIR");
                }
                if (!active.started) {
                    // Completed without proof — treat as async Direct failure → Media3.
                    failDirectBackend(active, "DIRECT_ENDED_WITHOUT_PROOF");
                    return;
                }
                active.state = "ENDED";
                active.endedAt = System.currentTimeMillis();
                setState("ENDED");
                emit(EVENT_ENDED, active, null);
                abandonAudioFocus();
                releaseDirectPlayer();
            });
            mp.setOnErrorListener((player, what, extra) -> {
                NativeMediaSession active = activeSession;
                if (active == null || active.generation != capturedGeneration
                    || !capturedRequestId.equals(active.requestId)) {
                    return true;
                }
                if (active.started) {
                    active.state = "ERROR";
                    active.errorCode = "DIRECT_MEDIA_ERROR_" + what;
                    setState("ERROR");
                    emit(EVENT_ERROR, active, active.errorCode);
                    abandonAudioFocus();
                    return true;
                }
                failDirectBackend(active, "DIRECT_MEDIA_ERROR_" + what);
                return true;
            });
            session.backend = BACKEND_DIRECT;
            session.attemptedBackends.add(BACKEND_DIRECT);
            directPlayer = mp;
            activeSession = session;
            setState("PREPARING");
            emit(EVENT_BACKEND_SELECTED, session, BACKEND_DIRECT);
            directPrepareTimeout = () -> {
                NativeMediaSession live = activeSession;
                if (live == null || live.generation != capturedGeneration
                    || !capturedRequestId.equals(live.requestId) || live.started
                    || live.preparedAt > 0) {
                    return;
                }
                failDirectBackend(live, "DIRECT_PREPARE_TIMEOUT");
            };
            main.postDelayed(directPrepareTimeout, DIRECT_PREPARE_TIMEOUT_MS);
            mp.prepareAsync();
            return true;
        } catch (Exception e) {
            Log.w(TAG, "DIRECT_ASSET_FAILED " + assetPath + " " + e.getMessage());
            releaseDirectPlayer();
            return false;
        }
    }

    private void setState(String state) {
        playerState = state;
    }

    private void emit(String event, NativeMediaSession session, @Nullable String reason) {
        JSObject data = new JSObject();
        data.put("requestId", session.requestId);
        data.put("mediaId", session.mediaId);
        data.put("audioId", session.audioId);
        data.put("generation", session.generation);
        data.put("backend", session.backend);
        data.put("state", session.state);
        data.put("positionMs", session.positionMs);
        data.put("fallbackCount", session.fallbackCount);
        data.put("audioFocus", session.audioFocus);
        data.put("started", session.started);
        boolean playing = false;
        try {
            if (directPlayer != null) playing = directPlayer.isPlaying();
            else if (player != null) playing = player.isPlaying();
        } catch (Exception ignored) {
        }
        data.put("isPlaying", playing);
        data.put("streamVolume", streamMusicVolume());
        data.put("streamMaxVolume", streamMusicMaxVolume());
        if (reason != null) data.put("reason", reason);
        notifyListeners(event, data);
    }

    private String resolveAssetPath(@Nullable String androidAssetPath, @Nullable String uri) {
        if (androidAssetPath != null && !androidAssetPath.isEmpty()) {
            return androidAssetPath.startsWith("/") ? androidAssetPath.substring(1) : androidAssetPath;
        }
        if (uri == null || uri.isEmpty()) return null;
        if (uri.startsWith("asset://")) {
            return uri.substring("asset://".length());
        }
        if (uri.startsWith("/audio/")) {
            return uri.substring(1);
        }
        if (uri.startsWith("audio/")) return uri;
        return null;
    }

    private JSObject preflightAsset(String assetPath) {
        JSObject out = new JSObject();
        out.put("assetPath", assetPath);
        try (AssetFileDescriptor afd = getContext().getAssets().openFd(assetPath)) {
            long length = afd.getLength();
            out.put("exists", true);
            out.put("length", length);
            out.put("startOffset", afd.getStartOffset());
            if (length <= 0) {
                out.put("ok", false);
                out.put("reason", "AUDIO_ASSET_EMPTY");
            } else {
                out.put("ok", true);
            }
            return out;
        } catch (IOException e) {
            out.put("ok", false);
            out.put("exists", false);
            out.put("reason", "AUDIO_ASSET_NOT_PACKAGED");
            out.put("error", e.getMessage() != null ? e.getMessage() : "openFd failed");
            return out;
        }
    }

    private Uri assetUri(String assetPath) {
        return Uri.parse("asset:///" + assetPath);
    }

    @PluginMethod
    public void playCanonicalAudio(PluginCall call) {
        String audioId = call.getString("audioId", "");
        String uri = call.getString("uri", "");
        String androidAssetPath = call.getString("androidAssetPath", "");
        String requestId = call.getString("requestId", "");
        if (requestId == null || requestId.isEmpty()) {
            call.reject("MISSING_REQUEST_ID");
            return;
        }
        main.post(() -> {
            try {
                String assetPath = resolveAssetPath(androidAssetPath, uri);
                if (assetPath == null || assetPath.isEmpty()) {
                    setState("ERROR");
                    JSObject err = new JSObject();
                    err.put("ok", false);
                    err.put("reason", "MISSING_ASSET_PATH");
                    call.resolve(err);
                    return;
                }

                JSObject preflight = preflightAsset(assetPath);
                if (!preflight.optBoolean("ok", false)) {
                    setState("ERROR");
                    supersedeActive("ERROR_PREFLIGHT");
                    generationCounter += 1;
                    NativeMediaSession failed = new NativeMediaSession(requestId, audioId, assetPath, generationCounter);
                    failed.state = "ERROR";
                    failed.errorCode = preflight.optString("reason", "AUDIO_ASSET_NOT_PACKAGED");
                    activeSession = failed;
                    emit(EVENT_ERROR, failed, failed.errorCode);
                    JSObject err = new JSObject();
                    err.put("ok", false);
                    err.put("reason", failed.errorCode);
                    err.put("preflight", preflight);
                    call.resolve(err);
                    return;
                }

                // Terminal para A antes de B — Promise JS de A precisa resolver.
                supersedeActive("REPLACED");
                try {
                    if (player != null) {
                        player.stop();
                        player.clearMediaItems();
                    }
                } catch (Exception ignored) {
                }

                generationCounter += 1;
                NativeMediaSession session = new NativeMediaSession(requestId, audioId, assetPath, generationCounter);
                session.state = "PREPARING";

                int streamVol = streamMusicVolume();
                int streamMax = streamMusicMaxVolume();
                if (streamVol == 0 && streamMax > 0) {
                    activeSession = session;
                    session.state = "ERROR";
                    session.errorCode = "MEDIA_VOLUME_ZERO";
                    setState("ERROR");
                    emit(EVENT_ERROR, session, "MEDIA_VOLUME_ZERO");
                    JSObject err = new JSObject();
                    err.put("ok", false);
                    err.put("reason", "MEDIA_VOLUME_ZERO");
                    err.put("streamVolume", streamVol);
                    err.put("streamMaxVolume", streamMax);
                    call.resolve(err);
                    return;
                }

                // RC2.2.31D — Direct first; sync failure OR later async failure → Media3 same requestId.
                if (playDirectAsset(session, assetPath)) {
                    JSObject ok = new JSObject();
                    ok.put("ok", true);
                    ok.put("state", playerState);
                    ok.put("backend", BACKEND_DIRECT);
                    ok.put("requestId", requestId);
                    ok.put("mediaId", requestId);
                    ok.put("generation", session.generation);
                    ok.put("assetPath", assetPath);
                    ok.put("preflight", preflight);
                    ok.put("streamVolume", streamVol);
                    ok.put("streamMaxVolume", streamMax);
                    call.resolve(ok);
                    return;
                }

                // Sync Direct failure — start Media3 immediately (same session/requestId).
                emit(EVENT_BACKEND_FAILED, session, session.backendErrors.isEmpty()
                    ? "DIRECT_SYNC_FAILED" : session.backendErrors.get(session.backendErrors.size() - 1));
                session.fallbackCount += 1;
                startMedia3Backend(session);

                JSObject ok = new JSObject();
                ok.put("ok", true);
                ok.put("state", playerState);
                ok.put("backend", session.backend);
                ok.put("requestId", requestId);
                ok.put("mediaId", requestId);
                ok.put("generation", session.generation);
                ok.put("assetPath", assetPath);
                ok.put("preflight", preflight);
                ok.put("streamVolume", streamVol);
                ok.put("streamMaxVolume", streamMax);
                ok.put("fallbackCount", session.fallbackCount);
                call.resolve(ok);
            } catch (Exception e) {
                setState("ERROR");
                String msg = e.getMessage() != null ? e.getMessage() : "PLAY_FAILED";
                if (activeSession != null && requestId.equals(activeSession.requestId)) {
                    activeSession.state = "ERROR";
                    activeSession.errorCode = msg;
                    emit(EVENT_ERROR, activeSession, msg);
                }
                JSObject err = new JSObject();
                err.put("ok", false);
                err.put("reason", msg);
                call.resolve(err);
            }
        });
    }

    @PluginMethod
    public void cancelCanonicalAudio(PluginCall call) {
        String requestId = call.getString("requestId", "");
        main.post(() -> {
            JSObject result = new JSObject();
            if (requestId == null || requestId.isEmpty()) {
                result.put("ok", true);
                result.put("ignored", true);
                result.put("reason", "MISSING_REQUEST_ID");
                call.resolve(result);
                return;
            }
            NativeMediaSession session = activeSession;
            if (session == null || !requestId.equals(session.requestId)) {
                result.put("ok", true);
                result.put("ignored", true);
                result.put("reason", "STALE_REQUEST");
                result.put("requestId", requestId);
                if (session != null) result.put("activeRequestId", session.requestId);
                call.resolve(result);
                return;
            }
            clearPositionWatchdog();
            clearDirectTimeouts();
            session.cancelledAt = System.currentTimeMillis();
            session.state = "CANCELLED";
            session.positionMs = safePosition();
            emit(EVENT_CANCELLED, session, "CANCELLED");
            detachSessionListener(session);
            releaseDirectPlayer();
            abandonAudioFocus();
            if (player != null) {
                try {
                    player.stop();
                    player.clearMediaItems();
                } catch (Exception ignored) {
                }
            }
            activeSession = null;
            setState("IDLE");
            result.put("ok", true);
            result.put("ignored", false);
            result.put("requestId", requestId);
            call.resolve(result);
        });
    }

    @PluginMethod
    public void stopCanonicalAudio(PluginCall call) {
        String requestId = call.getString("requestId", null);
        if (requestId != null && !requestId.isEmpty()) {
            cancelCanonicalAudio(call);
            return;
        }
        stopAllCanonicalAudio(call);
    }

    @PluginMethod
    public void stopAllCanonicalAudio(PluginCall call) {
        main.post(() -> {
            clearPositionWatchdog();
            clearDirectTimeouts();
            if (activeSession != null
                && !"ENDED".equals(activeSession.state)
                && !"ERROR".equals(activeSession.state)
                && !"CANCELLED".equals(activeSession.state)
                && !"SUPERSEDED".equals(activeSession.state)) {
                activeSession.cancelledAt = System.currentTimeMillis();
                activeSession.state = "CANCELLED";
                emit(EVENT_CANCELLED, activeSession, "STOP_ALL");
            }
            detachSessionListener(activeSession);
            releaseDirectPlayer();
            abandonAudioFocus();
            if (player != null) {
                try {
                    player.stop();
                    player.clearMediaItems();
                } catch (Exception ignored) {
                }
            }
            activeSession = null;
            setState("IDLE");
            JSObject ok = new JSObject();
            ok.put("ok", true);
            call.resolve(ok);
        });
    }

    @PluginMethod
    public void getCanonicalPlayerState(PluginCall call) {
        JSObject result = new JSObject();
        result.put("state", playerState);
        boolean isPlaying = false;
        try {
            if (directPlayer != null) isPlaying = directPlayer.isPlaying();
            else if (player != null) isPlaying = player.isPlaying();
        } catch (Exception ignored) {
        }
        long positionMs = safePosition();
        long durationMs = 0;
        try {
            if (directPlayer != null) durationMs = Math.max(0, directPlayer.getDuration());
            else if (player != null) durationMs = Math.max(0, player.getDuration());
        } catch (Exception ignored) {
        }
        result.put("isPlaying", isPlaying);
        result.put("positionMs", positionMs);
        result.put("durationMs", durationMs);
        result.put("volume", player != null ? player.getVolume() : (directPlayer != null ? 1f : 0));
        result.put("streamVolume", streamMusicVolume());
        result.put("streamMaxVolume", streamMusicMaxVolume());
        if (activeSession != null) {
            result.put("requestId", activeSession.requestId);
            result.put("mediaId", activeSession.mediaId);
            result.put("audioId", activeSession.audioId);
            result.put("generation", activeSession.generation);
            result.put("assetPath", activeSession.assetPath);
            result.put("backend", activeSession.backend);
            result.put("started", activeSession.started);
            result.put("sessionState", activeSession.state);
            result.put("fallbackCount", activeSession.fallbackCount);
            result.put("audioFocus", activeSession.audioFocus);
            result.put("attemptedBackends", String.join(",", activeSession.attemptedBackends));
            result.put("backendErrors", String.join(",", activeSession.backendErrors));
            if (activeSession.errorCode != null) result.put("errorCode", activeSession.errorCode);
        }
        call.resolve(result);
    }

    @PluginMethod
    public void preflightCanonicalAsset(PluginCall call) {
        String androidAssetPath = call.getString("androidAssetPath", "");
        String uri = call.getString("uri", "");
        String assetPath = resolveAssetPath(androidAssetPath, uri);
        if (assetPath == null || assetPath.isEmpty()) {
            JSObject err = new JSObject();
            err.put("ok", false);
            err.put("reason", "MISSING_ASSET_PATH");
            call.resolve(err);
            return;
        }
        call.resolve(preflightAsset(assetPath));
    }

    @PluginMethod
    public void releaseCanonicalPlayer(PluginCall call) {
        main.post(() -> {
            clearPositionWatchdog();
            detachSessionListener(activeSession);
            releaseDirectPlayer();
            if (player != null) {
                try {
                    player.release();
                } catch (Exception ignored) {
                }
                player = null;
            }
            activeSession = null;
            setState("IDLE");
            JSObject ok = new JSObject();
            ok.put("ok", true);
            call.resolve(ok);
        });
    }

    @Override
    protected void handleOnDestroy() {
        clearPositionWatchdog();
        clearDirectTimeouts();
        detachSessionListener(activeSession);
        releaseDirectPlayer();
        abandonAudioFocus();
        if (player != null) {
            try {
                player.release();
            } catch (Exception ignored) {
            }
            player = null;
        }
        activeSession = null;
        super.handleOnDestroy();
    }
}
