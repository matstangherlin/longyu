# Final UI / Motion Closure — RC2.3.13R

## Before

- Culture / Review / PageHeader used ad-hoc `text-[10px]` / `text-[11px]` / mixed serif sizes for the same semantic roles.
- Journey ↔ Culture content swapped instantly (selector thumb moved; panel did not).
- No shared `--motion-*` tokens; reduced-motion handled per-animation without a panel enter contract.

## After

- Semantic type classes (`type-page-title`, `type-card-title`, `type-eyebrow`, `type-button`, Mandarin/Pinyin roles) in `src/index.css`.
- Culture current-path card mapped to those roles; primary CTA hierarchy clarified; secondary path switch stays weaker.
- Motion tokens + Journey ↔ Culture directional panel enter (~12px) with `useLayoutEffect` scroll restore (no flash→jump).
- Culture path card enter on path change; reduced-motion → short fade only.
- Sticky chrome from H.1 preserved; TopBar not remounted; fingerprint unchanged.

## Parent

PR #339 @ `51f8bd514d9e275fe5c83553fdb5d6e85f182262`
