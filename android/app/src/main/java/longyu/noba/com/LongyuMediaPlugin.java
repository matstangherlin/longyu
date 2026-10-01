package longyu.noba.com;

import android.net.Uri;
import android.os.Handler;
import android.os.Looper;
import androidx.annotation.Nullable;
import androidx.media3.common.MediaItem;
import androidx.media3.common.PlaybackException;
import androidx.media3.common.Player;
import androidx.media3.exoplayer.ExoPlayer;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.File;

/**
 * RC2.2.28 — player nativo de áudio CANÔNICO (Media3 / ExoPlayer).
 *
 * NÃO usa TextToSpeech. Contrato com o front:
 *   playCanonicalAudio({ audioId, uri, requestId })
 *
 * Estados: IDLE → PREPARING → READY → PLAYING → ENDED | ERROR
 * Eventos: AUDIO_READY | AUDIO_STARTED | AUDIO_ENDED | AUDIO_ERROR
 * Correlação: sempre requestId.
 *
 * Um player reutilizável por sessão; release() só no destroy do plugin.
 */
@CapacitorPlugin(name = "LongyuMedia")
public class LongyuMediaPlugin extends Plugin {

    private static final String EVENT_READY = "AUDIO_READY";
    private static final String EVENT_STARTED = "AUDIO_STARTED";
    private static final String EVENT_ENDED = "AUDIO_ENDED";
    private static final String EVENT_ERROR = "AUDIO_ERROR";

    private final Handler main = new Handler(Looper.getMainLooper());
    @Nullable private ExoPlayer player;
    @Nullable private String currentRequestId;
    @Nullable private String currentAudioId;
    private String playerState = "IDLE";
    private boolean startedForCurrent = false;

    private ExoPlayer ensurePlayer() {
        if (player != null) return player;
        ExoPlayer exo = new ExoPlayer.Builder(getContext()).build();
        exo.addListener(new Player.Listener() {
            @Override
            public void onPlaybackStateChanged(int playbackState) {
                String rid = currentRequestId;
                if (rid == null) return;
                if (playbackState == Player.STATE_READY && !startedForCurrent) {
                    setState("READY");
                    emit(EVENT_READY, rid, null);
                }
                if (playbackState == Player.STATE_ENDED) {
                    setState("ENDED");
                    emit(EVENT_ENDED, rid, null);
                }
            }

            @Override
            public void onIsPlayingChanged(boolean isPlaying) {
                String rid = currentRequestId;
                if (rid == null) return;
                if (isPlaying && !startedForCurrent) {
                    startedForCurrent = true;
                    setState("PLAYING");
                    emit(EVENT_STARTED, rid, null);
                }
            }

            @Override
            public void onPlayerError(PlaybackException error) {
                String rid = currentRequestId;
                setState("ERROR");
                emit(EVENT_ERROR, rid, error != null ? error.getErrorCodeName() : "PLAYER_ERROR");
            }
        });
        player = exo;
        return exo;
    }

    private void setState(String state) {
        playerState = state;
    }

    private void emit(String event, @Nullable String requestId, @Nullable String reason) {
        JSObject data = new JSObject();
        if (requestId != null) data.put("requestId", requestId);
        if (currentAudioId != null) data.put("audioId", currentAudioId);
        data.put("state", playerState);
        if (reason != null) data.put("reason", reason);
        notifyListeners(event, data);
    }

    /**
     * Resolve URI: asset://audio/core/x.mp3 → file from android assets;
     * /audio/core/x.mp3 → file:///android_asset/public/... or https;
     * file:// e https:// passam direto.
     */
    private Uri resolveUri(String uri) {
        if (uri == null || uri.isEmpty()) return Uri.EMPTY;
        if (uri.startsWith("file://") || uri.startsWith("http://") || uri.startsWith("https://") || uri.startsWith("content://")) {
            return Uri.parse(uri);
        }
        if (uri.startsWith("asset://")) {
            String path = uri.substring("asset://".length());
            return Uri.parse("file:///android_asset/" + path);
        }
        // Web-style absolute path served from Capacitor public assets.
        String path = uri.startsWith("/") ? uri.substring(1) : uri;
        // Capacitor copies dist/ into android assets/public.
        File local = new File(getContext().getFilesDir(), path);
        if (local.exists()) return Uri.fromFile(local);
        return Uri.parse("file:///android_asset/public/" + path);
    }

    @PluginMethod
    public void playCanonicalAudio(PluginCall call) {
        String audioId = call.getString("audioId", "");
        String uri = call.getString("uri", "");
        String requestId = call.getString("requestId", "");
        if (requestId == null || requestId.isEmpty()) {
            call.reject("MISSING_REQUEST_ID");
            return;
        }
        if (uri == null || uri.isEmpty()) {
            call.reject("MISSING_URI");
            return;
        }
        main.post(() -> {
            try {
                ExoPlayer exo = ensurePlayer();
                currentRequestId = requestId;
                currentAudioId = audioId;
                startedForCurrent = false;
                setState("PREPARING");
                Uri mediaUri = resolveUri(uri);
                if (mediaUri == null || Uri.EMPTY.equals(mediaUri)) {
                    setState("ERROR");
                    emit(EVENT_ERROR, requestId, "INVALID_URI");
                    JSObject err = new JSObject();
                    err.put("ok", false);
                    err.put("reason", "INVALID_URI");
                    call.resolve(err);
                    return;
                }
                MediaItem item = MediaItem.fromUri(mediaUri);
                exo.setMediaItem(item);
                exo.prepare();
                exo.play();
                JSObject ok = new JSObject();
                ok.put("ok", true);
                ok.put("state", playerState);
                call.resolve(ok);
            } catch (Exception e) {
                setState("ERROR");
                emit(EVENT_ERROR, requestId, e.getMessage() != null ? e.getMessage() : "PLAY_FAILED");
                JSObject err = new JSObject();
                err.put("ok", false);
                err.put("reason", e.getMessage() != null ? e.getMessage() : "PLAY_FAILED");
                call.resolve(err);
            }
        });
    }

    @PluginMethod
    public void stopCanonicalAudio(PluginCall call) {
        main.post(() -> {
            if (player != null) {
                try {
                    player.stop();
                    player.clearMediaItems();
                } catch (Exception ignored) {
                }
            }
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
        if (currentRequestId != null) result.put("requestId", currentRequestId);
        if (currentAudioId != null) result.put("audioId", currentAudioId);
        call.resolve(result);
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
            currentRequestId = null;
            currentAudioId = null;
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
        super.handleOnDestroy();
    }
}
