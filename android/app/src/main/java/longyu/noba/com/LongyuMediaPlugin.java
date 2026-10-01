package longyu.noba.com;

import android.content.res.AssetFileDescriptor;
import android.net.Uri;
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

/**
 * RC2.2.31 — player canônico Media3 com isolamento por requestId.
 *
 * Regras:
 *   - MediaItem.mediaId == requestId (callbacks leem mediaId, nao currentRequestId mutavel)
 *   - cancelCanonicalAudio(requestId) so para o player se requestId == sessao ativa
 *   - stopAllCanonicalAudio() e o unico stop global
 *   - androidAssetPath preferido; AssetManager preflight antes de ExoPlayer
 */
@CapacitorPlugin(name = "LongyuMedia")
public class LongyuMediaPlugin extends Plugin {

    private static final String TAG = "LongyuMedia";
    private static final String EVENT_READY = "AUDIO_READY";
    private static final String EVENT_STARTED = "AUDIO_STARTED";
    private static final String EVENT_ENDED = "AUDIO_ENDED";
    private static final String EVENT_ERROR = "AUDIO_ERROR";
    private static final String EVENT_STALE = "STALE_MEDIA_CALLBACK_IGNORED";

    /** Uma sessao nativa por request — estado de started vive aqui, nao em flag global. */
    private static final class NativeMediaSession {
        final String requestId;
        final String audioId;
        final String mediaId;
        final long generation;
        final String assetPath;
        String state = "IDLE";
        boolean started = false;
        long createdAt = System.currentTimeMillis();
        long preparedAt = 0;
        long startedAt = 0;
        long endedAt = 0;
        long cancelledAt = 0;
        long positionMs = 0;
        @Nullable String errorCode = null;

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
    @Nullable private NativeMediaSession activeSession;
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
        exo.addListener(new Player.Listener() {
            @Override
            public void onPlaybackStateChanged(int playbackState) {
                String mediaId = currentMediaId();
                NativeMediaSession session = sessionForMediaId(mediaId);
                if (session == null) {
                    if (mediaId != null) emitStale(mediaId, "STATE_" + playbackState);
                    return;
                }
                if (playbackState == Player.STATE_READY && !session.started) {
                    session.state = "READY";
                    session.preparedAt = System.currentTimeMillis();
                    setState("READY");
                    emit(EVENT_READY, session, null);
                }
                if (playbackState == Player.STATE_ENDED) {
                    session.state = "ENDED";
                    session.endedAt = System.currentTimeMillis();
                    session.positionMs = safePosition();
                    setState("ENDED");
                    emit(EVENT_ENDED, session, null);
                }
            }

            @Override
            public void onIsPlayingChanged(boolean isPlaying) {
                String mediaId = currentMediaId();
                NativeMediaSession session = sessionForMediaId(mediaId);
                if (session == null) {
                    if (mediaId != null) emitStale(mediaId, "IS_PLAYING_" + isPlaying);
                    return;
                }
                if (isPlaying && !session.started) {
                    // Prova de start: isPlaying e/ou position > 0.
                    long pos = safePosition();
                    session.started = true;
                    session.state = "PLAYING";
                    session.startedAt = System.currentTimeMillis();
                    session.positionMs = pos;
                    setState("PLAYING");
                    emit(EVENT_STARTED, session, null);
                } else if (isPlaying) {
                    session.positionMs = safePosition();
                }
            }

            @Override
            public void onPlayerError(PlaybackException error) {
                String mediaId = currentMediaId();
                NativeMediaSession session = sessionForMediaId(mediaId);
                String code = error != null ? error.getErrorCodeName() : "PLAYER_ERROR";
                if (session == null) {
                    if (mediaId != null) emitStale(mediaId, code);
                    return;
                }
                session.state = "ERROR";
                session.errorCode = code;
                setState("ERROR");
                emit(EVENT_ERROR, session, code);
            }
        });
        player = exo;
        return exo;
    }

    @Nullable
    private String currentMediaId() {
        if (player == null) return null;
        MediaItem item = player.getCurrentMediaItem();
        if (item == null || item.mediaId == null || item.mediaId.isEmpty()) return null;
        return item.mediaId;
    }

    @Nullable
    private NativeMediaSession sessionForMediaId(@Nullable String mediaId) {
        if (mediaId == null || activeSession == null) return null;
        if (!mediaId.equals(activeSession.mediaId)) return null;
        return activeSession;
    }

    private long safePosition() {
        if (player == null) return 0;
        try {
            return Math.max(0, player.getCurrentPosition());
        } catch (Exception e) {
            return 0;
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
        data.put("state", session.state);
        data.put("positionMs", session.positionMs);
        data.put("isPlaying", player != null && player.isPlaying());
        if (reason != null) data.put("reason", reason);
        notifyListeners(event, data);
    }

    private void emitStale(String mediaId, String reason) {
        Log.i(TAG, "STALE_MEDIA_CALLBACK_IGNORED mediaId=" + mediaId + " reason=" + reason
            + " active=" + (activeSession != null ? activeSession.mediaId : "null"));
        JSObject data = new JSObject();
        data.put("mediaId", mediaId);
        data.put("reason", reason);
        if (activeSession != null) data.put("activeRequestId", activeSession.requestId);
        notifyListeners(EVENT_STALE, data);
    }

    /**
     * Resolve caminho nativo. Preferencia:
     *   1) androidAssetPath (ex: audio/core/guided-try-nihao.mp3)
     *   2) uri asset://...
     *   3) uri /audio/... → audio/... sob assets/ (NAO public/ adivinhado)
     */
    private String resolveAssetPath(@Nullable String androidAssetPath, @Nullable String uri) {
        if (androidAssetPath != null && !androidAssetPath.isEmpty()) {
            return androidAssetPath.startsWith("/") ? androidAssetPath.substring(1) : androidAssetPath;
        }
        if (uri == null || uri.isEmpty()) return null;
        if (uri.startsWith("asset://")) {
            return uri.substring("asset://".length());
        }
        if (uri.startsWith("/audio/")) {
            return uri.substring(1); // audio/core/...
        }
        if (uri.startsWith("audio/")) return uri;
        return null;
    }

    /** AssetManager preflight — existe + length > 0. */
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
        // Media3 AssetDataSource: asset:///path relativo a assets/
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

                ExoPlayer exo = ensurePlayer();
                // Nova sessao substitui a ativa — cancel de request antiga NAO deve
                // matar esta (ver cancelCanonicalAudio).
                generationCounter += 1;
                NativeMediaSession session = new NativeMediaSession(requestId, audioId, assetPath, generationCounter);
                session.state = "PREPARING";
                activeSession = session;
                setState("PREPARING");

                MediaItem item = new MediaItem.Builder()
                    .setUri(assetUri(assetPath))
                    .setMediaId(requestId)
                    .build();
                exo.setMediaItem(item);
                exo.prepare();
                exo.play();

                JSObject ok = new JSObject();
                ok.put("ok", true);
                ok.put("state", playerState);
                ok.put("requestId", requestId);
                ok.put("mediaId", requestId);
                ok.put("generation", session.generation);
                ok.put("assetPath", assetPath);
                ok.put("preflight", preflight);
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

    /**
     * Cancel REQUEST-AWARE. Se requestId != sessao ativa → ignored STALE_REQUEST,
     * sem player.stop() / clearMediaItems.
     */
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
            // Cancela so a sessao ativa (esta request).
            session.cancelledAt = System.currentTimeMillis();
            session.state = "CANCELLED";
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

    /** Alias: stopCanonicalAudio com requestId = cancel request-aware. Sem requestId = stopAll. */
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
            if (player != null) {
                try {
                    player.stop();
                    player.clearMediaItems();
                } catch (Exception ignored) {
                }
            }
            if (activeSession != null) {
                activeSession.cancelledAt = System.currentTimeMillis();
                activeSession.state = "CANCELLED";
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
        boolean isPlaying = player != null && player.isPlaying();
        long positionMs = safePosition();
        long durationMs = 0;
        try {
            if (player != null) durationMs = Math.max(0, player.getDuration());
        } catch (Exception ignored) {
        }
        result.put("isPlaying", isPlaying);
        result.put("positionMs", positionMs);
        result.put("durationMs", durationMs);
        result.put("volume", player != null ? player.getVolume() : 0);
        if (activeSession != null) {
            result.put("requestId", activeSession.requestId);
            result.put("mediaId", activeSession.mediaId);
            result.put("audioId", activeSession.audioId);
            result.put("generation", activeSession.generation);
            result.put("assetPath", activeSession.assetPath);
            result.put("started", activeSession.started);
            result.put("sessionState", activeSession.state);
            if (activeSession.errorCode != null) result.put("errorCode", activeSession.errorCode);
        }
        String mediaId = currentMediaId();
        if (mediaId != null) result.put("playerMediaId", mediaId);
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
