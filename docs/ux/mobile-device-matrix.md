# RC2.3.13D — Mobile device matrix

Logical viewport classes for code + physical QA. Physical rows are filled by the owner/device QA run — never invent device PII.

## Logical classes

| Class | CSS viewport | Role |
| --- | --- | --- |
| **SMALL** | 360×640 | Hard mode — first-class |
| **COMPACT** | 375×667 | Common mid phones |
| **TARGET** | 390×844 | Primary design target |

## Surfaces to exercise per class

Home · More Options · Conta · Journey · Lesson · Guided Try · Conversation · Speech · Hànzì · Review · Victory.

## Physical device log (owner fills)

| Field | Device A | Device B |
| --- | --- | --- |
| Manufacturer / model (generic OK) | | |
| Android version | | |
| Logical class (SMALL/COMPACT/TARGET) | | |
| Physical CSS viewport (approx) | | |
| Density (ldpi…xxxhdpi) | | |
| Navigation (gesture / 3-button) | | |
| Font scale | 100% / ~120% / largest | |
| Display size | default / enlarged | |
| TalkBack run? | | |
| Reduced motion? | | |

Avoid storing IMEI, phone numbers, account emails, or other unnecessary identifiers.

## Vocabulary

| Label | Meaning |
| --- | --- |
| `CODE_PASS` | Static gate / TypeScript / unit assertions |
| `EMULATED_PASS` | Browser / emulator / Playwright viewport |
| `PHYSICAL_PASS` | Real Android evidence only |

Never promote `CODE_PASS` → `PHYSICAL_PASS`.

## Android Back matrix (contract)

| Context | Back behavior |
| --- | --- |
| HOME | Normal OS / shell |
| MODAL / SHEET | Dismiss overlay |
| KEYBOARD open | Close keyboard first |
| LESSON step 0 | Exit per current contract (no confirm) |
| MID-LESSON (`idx > 0`) | Exit confirmation (`player.leaveConfirm`) |
| RECORDING | Must not corrupt recorder; stop/safe exit |
| COMPLETION | Must not duplicate reward / completion |

## Keyboard / IME contract

- Focused field stays visible
- Conversation `data-conversation-answer-dock` Check/Continue reachable
- Back closes keyboard before abandoning lesson
- After IME dismiss, scroll restores without infinite jump

## Related

- Device QA JSON: `docs/release/rc2-3-13d-device-qa.json`
- Owner checklist: `docs/release/OWNER_RC_LEARNING_FLOW_TEST.md`
- Cert: `docs/release/rc2-3-13d-ux-certification.json`
