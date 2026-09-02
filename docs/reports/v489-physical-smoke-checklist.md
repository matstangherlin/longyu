# V4.8.9 — Physical smoke checklist

Identity for every run: `backend-rc-v489-preapply` plus the exact frontend git SHA. This is a human-device contract; automation must not turn a row into PASS.

## Devices

| Device / browser | Status | Evidence required |
| --- | --- | --- |
| Android phone / current Chrome | `NOT_RUN` | model, OS/browser versions, timestamp, screen capture, test account alias |
| iPhone / current Safari | `NOT_RUN` | model, iOS/Safari versions, timestamp, screen capture, test account alias |
| Desktop / current Chrome | `NOT_RUN` | OS/browser versions, timestamp, capture and network log for failures |

## Core smoke sequence

- [ ] Visitor opens `/comecar`; course language and interface language remain independent.
- [ ] Placement completes and the server-derived result matches raw evidence.
- [ ] Account creation sends a real confirmation email; link is opened in a second browser/device.
- [ ] Finalize onboarding reaches Journey without infinite loading or duplicate placement attempts.
- [ ] Complete M1 on device A; device B shows 1/4 after sign-in without first-device storage.
- [ ] Complete M2 on device B; device A converges to 2/4 with no mastery regression, duplicate XP/Qi or lost SRS.
- [ ] Password recovery returns to a valid authenticated session and preserves progress.
- [ ] Logout/login preserves course language, interface language, placement, progress and entitlement independently.
- [ ] Network loss/reconnect and double-submit do not create false success or duplicate rewards.
- [ ] Account page, Review and paywall render in the selected interface language; no Stripe Live action is performed.

For each failure record correlation ID, route, UTC time, expected/actual result and whether retry was safe. Never record password, token, confirmation URL, payment data or lesson answer history.

`PHYSICAL_QA_READY = NOT_PROMOTED`

`READY_FOR_PUBLIC_BETA = NOT_PROMOTED`

`MANDARIMPROJECT_WRITES = 0`

`STRIPE_LIVE_WRITES = 0`
