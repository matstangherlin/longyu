# RC2.2.24 — Paridade nativa por StepKind (Web mobile × APK Android)

Fonte: `docs/reports/rc2-2-24-native-step-parity.json` (gerado do plano REAL: 134 aulas × passes 0–3 = 536 planos; 35 aulas Pro incluídas).

**Web PASS não é APK PASS.** A coluna ANDROID APK fica `NOT_RUN` até o teste físico no aparelho do owner.

## OBSERVED

- Cenas de conversa nas aulas: **43** (43 V2, 0 V1); **27** aparecem em aulas Pro. Todas passam pelo MESMO contrato de transição (goTo sem TTS → render → fala).
- StepKinds distintos no plano: **42**. Para todos: `completion_committed → next_step_selected → next_step_rendered`; sem render em 1,5 s = `step_render_stall`.
- Código (APK): eventos TTS com requestId/utteranceId (TTS_QUEUED/STARTED/DONE/STOPPED/ERROR), ponte instalada no bootstrap e aguardada antes do speak.

## INFERRED

- O "ouviu mas o botão não liberou" vinha do START perdido no cold start (listener assíncrono instalado no primeiro play) + START sem identidade; a "mesma fala" vinha do TTS chamado no toque antes de trocar o nó.

## NOT_TESTED

- Toda a coluna ANDROID APK abaixo. Owner device: guidedTryAudioAdvance, guidedTryAllSevenSteps, conversationV1MultiLine, conversationV2MultiNode, conversationWithAudio, conversationWrongBranch, conversationRevealContinue, lessonAfterConversation, toneTrainerNoScroll, toneTraceTouch, journeyReturnAnchor, cultureReturnAnchor, toneReturnAnchor, logoutNoLocalProfile, coldStartTts, firstAudioAfterColdStart — **NOT_RUN**, com autoPlayAudio=true e =false.

## Matriz

Negrito = categorias prioritárias da spec.

| STEP KIND | AULAS | WEB MOBILE | ANDROID APK | AUDIO | ADVANCE | RESULT |
| --- | --- | --- | --- | --- | --- | --- |
| address_build | 1 (1 Pro) | WEB E2E | NOT_RUN | — | contrato de render (next_step_rendered) | APK NOT_RUN |
| audio_discrimination | 27 (11 Pro) | WEB E2E | NOT_RUN | — | contrato de render (next_step_rendered) | APK NOT_RUN |
| audio_to_action | 36 (19 Pro) | WEB E2E | NOT_RUN | — | contrato de render (next_step_rendered) | APK NOT_RUN |
| city_context | 4 (4 Pro) | WEB E2E | NOT_RUN | — | contrato de render (next_step_rendered) | APK NOT_RUN |
| compare_with_image | 3 (3 Pro) | WEB E2E | NOT_RUN | — | contrato de render (next_step_rendered) | APK NOT_RUN |
| comprehend | 99 (21 Pro) | WEB E2E | NOT_RUN | — | contrato de render (next_step_rendered) | APK NOT_RUN |
| **contextual_choice** | 105 (19 Pro) | WEB E2E | NOT_RUN | — | contrato de render (next_step_rendered) | APK NOT_RUN |
| conversation_repair | 48 (19 Pro) | WEB E2E | NOT_RUN | — | contrato de render (next_step_rendered) | APK NOT_RUN |
| **conversation_scene** | 110 (34 Pro) | WEB E2E | NOT_RUN | SIM | contrato de render (next_step_rendered) | APK NOT_RUN |
| decompose | 4 (1 Pro) | WEB E2E | NOT_RUN | — | contrato de render (next_step_rendered) | APK NOT_RUN |
| **dialogue_choice** | 119 (26 Pro) | WEB E2E | NOT_RUN | SIM | contrato de render (next_step_rendered) | APK NOT_RUN |
| dialogue_completion | 36 (16 Pro) | WEB E2E | NOT_RUN | — | contrato de render (next_step_rendered) | APK NOT_RUN |
| dictation | 23 (5 Pro) | WEB E2E | NOT_RUN | SIM | contrato de render (next_step_rendered) | APK NOT_RUN |
| fill_blank | 101 (27 Pro) | WEB E2E | NOT_RUN | — | contrato de render (next_step_rendered) | APK NOT_RUN |
| flashcard | 17 (12 Pro) | WEB E2E | NOT_RUN | — | contrato de render (next_step_rendered) | APK NOT_RUN |
| **free_production** | 86 (27 Pro) | WEB E2E | NOT_RUN | SIM | contrato de render (next_step_rendered) | APK NOT_RUN |
| hanzi_build | 62 (10 Pro) | WEB E2E | NOT_RUN | — | contrato de render (next_step_rendered) | APK NOT_RUN |
| image_choice | 100 (29 Pro) | WEB E2E | NOT_RUN | — | contrato de render (next_step_rendered) | APK NOT_RUN |
| intro | 92 (19 Pro) | WEB E2E | NOT_RUN | — | contrato de render (next_step_rendered) | APK NOT_RUN |
| **listen** | 47 (13 Pro) | WEB E2E | NOT_RUN | SIM | contrato de render (next_step_rendered) | APK NOT_RUN |
| **listen_select** | 99 (16 Pro) | WEB E2E | NOT_RUN | SIM | contrato de render (next_step_rendered) | APK NOT_RUN |
| map_direction | 2 (2 Pro) | WEB E2E | NOT_RUN | — | contrato de render (next_step_rendered) | APK NOT_RUN |
| match_pairs | 29 (5 Pro) | WEB E2E | NOT_RUN | — | contrato de render (next_step_rendered) | APK NOT_RUN |
| menu_reading | 2 (2 Pro) | WEB E2E | NOT_RUN | — | contrato de render (next_step_rendered) | APK NOT_RUN |
| microread | 1 (0 Pro) | WEB E2E | NOT_RUN | — | contrato de render (next_step_rendered) | APK NOT_RUN |
| odd_one_out | 23 (8 Pro) | WEB E2E | NOT_RUN | — | contrato de render (next_step_rendered) | APK NOT_RUN |
| place_label | 4 (4 Pro) | WEB E2E | NOT_RUN | — | contrato de render (next_step_rendered) | APK NOT_RUN |
| price_task | 3 (3 Pro) | WEB E2E | NOT_RUN | — | contrato de render (next_step_rendered) | APK NOT_RUN |
| produce | 17 (2 Pro) | WEB E2E | NOT_RUN | — | contrato de render (next_step_rendered) | APK NOT_RUN |
| recognize | 24 (5 Pro) | WEB E2E | NOT_RUN | — | contrato de render (next_step_rendered) | APK NOT_RUN |
| reverse_recall | 107 (21 Pro) | WEB E2E | NOT_RUN | — | contrato de render (next_step_rendered) | APK NOT_RUN |
| route_sequence | 3 (3 Pro) | WEB E2E | NOT_RUN | — | contrato de render (next_step_rendered) | APK NOT_RUN |
| sentence_build | 107 (31 Pro) | WEB E2E | NOT_RUN | — | contrato de render (next_step_rendered) | APK NOT_RUN |
| sentence_transform | 30 (14 Pro) | WEB E2E | NOT_RUN | — | contrato de render (next_step_rendered) | APK NOT_RUN |
| sign_reading | 1 (1 Pro) | WEB E2E | NOT_RUN | — | contrato de render (next_step_rendered) | APK NOT_RUN |
| spot_error | 38 (9 Pro) | WEB E2E | NOT_RUN | — | contrato de render (next_step_rendered) | APK NOT_RUN |
| substitution_drill | 19 (9 Pro) | WEB E2E | NOT_RUN | — | contrato de render (next_step_rendered) | APK NOT_RUN |
| **tone** | 18 (1 Pro) | WEB E2E | NOT_RUN | SIM | contrato de render (next_step_rendered) | APK NOT_RUN |
| tone_pair | 9 (5 Pro) | WEB E2E | NOT_RUN | SIM | contrato de render (next_step_rendered) | APK NOT_RUN |
| transfer_task | 17 (14 Pro) | WEB E2E | NOT_RUN | — | contrato de render (next_step_rendered) | APK NOT_RUN |
| translation_build | 2 (1 Pro) | WEB E2E | NOT_RUN | — | contrato de render (next_step_rendered) | APK NOT_RUN |
| write | 7 (4 Pro) | WEB E2E | NOT_RUN | — | contrato de render (next_step_rendered) | APK NOT_RUN |
