# Owner commercial test matrix (RC2.3.11)

Mode: **TEST only**. No live charges.

## WEB

1. Free account → learn without paywall on first value moments
2. Open `/pro` paywall → see Longyu Pro, prices, renewal copy, restore
3. TEST checkout success (when Price IDs configured)
4. TEST checkout cancel
5. Billing portal open (own customer only)
6. Cancel subscription → Pro until period end
7. Restore / refresh entitlement after webhook

## ANDROID

1. Paywall info-only (no sell while DISABLED_FOR_BETA)
2. Web Pro account → Android shows Pro via server
3. (Later) Play license tester purchase / cancel / restore

## CROSS PLATFORM

1. Web TEST purchase → Android same account Pro
2. (Later) Play purchase → Web same account Pro
3. Account A Pro → logout → Account B Free must not inherit
