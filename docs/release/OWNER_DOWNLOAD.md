# Owner download — THIS IS THE RC TO TEST

| Field | Value |
|---|---|
| RC ID | **RC2.3.12-RC2** |
| **artifactSourceSha** (code inside APK/AAB) | `529d2cd4a9c1b949d61e815dc434162d5fb3a589` |
| workflowMergeSha (CI checkout) | `3f5cc1b3174cb1807ec181ec3e3b915c0f961428` |
| version | `0.2.0-rc.2` |
| versionCode | `596` |
| fingerprint | `cc66373bb602` |
| **APK** | `longyu-android-debug-0.2.0-rc.2-3f5cc1b.apk` |
| APK SHA256 | `b4c2a846e87af7bd1a8c495bbe2fc8b2b77ff740fc12d5b1c15dc6b61f1b57a0` |
| AAB SHA256 | `d77b93503c7b0607b9d31cba714beecc27fd5f8cfd3552ac5dc8fe397ab2bdf4` |
| Hosted run | https://github.com/matstangherlin/longyu/actions/runs/37908317177 |

**RC1 does not certify this UI** (cognitive UI foundation in RC2.3.13A). RC1 provenance is frozen in `docs/release/rc1-artifacts.json`.

Do **not** confuse workflow merge SHA with artifact source SHA. QA Release Truth must show the **artifact** identity (`sourceHeadSha`).

## How to get the APK

1. Open the run above → artifact **`longyu-android-debug-0.2.0-rc.2-3f5cc1b`**  
2. Or use agent path (same bytes): `/opt/cursor/artifacts/rc2-apk/longyu-android-debug-0.2.0-rc.2-3f5cc1b.apk`  
3. Verify SHA256 before install.

## Rules

1. Install **only** this APK (SHA256 must match).  
2. This is a **debug diagnostic** build (`deviceQaBuild=true`) for physical certification — not a Play production upload.  
3. Physical beta QA must use **RC2**, not RC1.  
4. Then run `OWNER_RC2_DEVICE_TEST.md` (or updated RC1 script renamed for RC2 identity).
