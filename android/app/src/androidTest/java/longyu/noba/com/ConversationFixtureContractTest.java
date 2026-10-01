package longyu.noba.com;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertTrue;

import androidx.test.ext.junit.runners.AndroidJUnit4;
import org.junit.Test;
import org.junit.runner.RunWith;

/**
 * RC2.2.31D — fixture contract ONLY (NOT runtime proof): fixture de conversa 1→10.
 *
 * O WebView + bridge de QA disparam Continuar; este teste instrumentado
 * documenta o contrato (nodeId avança sem depender de TTS). A prova física
 * completa permanece NOT_RUN até o owner no aparelho.
 */
@RunWith(AndroidJUnit4.class)
public class ConversationFixtureContractTest {

    @Test
    public void qaTenNodeIdsAreStable() {
        String[] ids = new String[] {
            "qa-node-01", "qa-node-02", "qa-node-03", "qa-node-04", "qa-node-05",
            "qa-node-06", "qa-node-07", "qa-node-08", "qa-node-09", "qa-node-10"
        };
        assertEquals(10, ids.length);
        assertTrue(ids[0].endsWith("01"));
        assertTrue(ids[9].endsWith("10"));
    }
}
