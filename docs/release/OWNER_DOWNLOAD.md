# Owner download — THIS IS THE RC TO TEST

| Field | Value |
|---|---|
| RC ID | **RC2.3.12-RC1** |
| **artifactSourceSha** (code inside APK/AAB) | `2d64f0d7b59f38d761e4970a1770cbf703b8c1d8` |
| certificationHeadSha (#329 orchestration only) | `aca759cb179d9ce1aedaa9c7baa4a7165c6cf2cb` |
| version | `0.2.0-rc.1` |
| versionCode | `570` |
| fingerprint | `5a64821d0b7d` |
| **APK** | `longyu-android-debug-0.2.0-rc.1-2c56701.apk` |
| APK SHA256 | `dc99c03bd803a17d1ff55ab82964df2db820ce316f02568c7887a47a414cc492` |
| AAB SHA256 | `c9f8f0981f4d3abdf10efe7b45e5dee30539afce352fe9f62ebc39fbaae29a85` |
| Hosted run | https://github.com/matstangherlin/longyu/actions/runs/37877291018 |

Do **not** confuse certification HEAD with artifact source SHA. QA Release Truth must show the **artifact** identity.

## How to get the APK

1. Open the run above → artifact **`longyu-android-debug-0.2.0-rc.1-2c56701`**  
2. Or use agent path (same bytes): `/opt/cursor/artifacts/rc-apk/longyu-android-debug-0.2.0-rc.1-2c56701.apk`  
3. Verify SHA256 before install.

## Rules

1. Install **only** this APK (SHA256 must match).  
2. This is a **debug diagnostic** build (`deviceQaBuild=true`) for physical certification — not a Play production upload.  
3. After you install it on your phone (or send to any tester), reply: **RC1 distributed** → candidate becomes immutable (next code fix = RC2).  
4. Then run `OWNER_RC1_DEVICE_TEST.md` (20 checkpoints).
