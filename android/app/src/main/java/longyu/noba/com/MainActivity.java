package longyu.noba.com;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // RC2.2.13 — plugin interno de voz (TTS + reconhecimento nativos).
        registerPlugin(LongyuSpeechPlugin.class);
        // RC2.2.28 — player canônico de assets (Media3 / ExoPlayer). TTS não toca assets.
        registerPlugin(LongyuMediaPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
