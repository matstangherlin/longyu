# Resilient State System — RC2.3.13R.3.2.5

A resilient screen tells the truth about where the learner's work is and always
offers a next step. It never shows a blank frame, a raw server message, or a
"saved in the cloud" that has not happened. The gate
`validate:resilient-ui-states` executes or pins every rule on this page.

## Loading

| Rule | Where |
| --- | --- |
| One loading treatment: spinner + text, `role="status"` | `PageFallback`, `LoadingState` |
| A load that resolves fast never flashes a spinner: it fades in after 320 ms (`.loading-delayed-reveal`); with reduced motion it shows at once | `src/index.css` resilient-states block |
| The frame after the splash is the same loading state as the next one (no blank `aria-hidden` screen) | `RequireCloudSession` renders `<PageFallback />` |
| Route changes never blank the shell. A learner already let in keeps AppShell mounted while the session is re-checked (stale-while-revalidate). Any other audience still waits at the gate, so no private content shows before the session is known | `RequireCloudSession` |
| Loading is neutral, never the error tone | Ligas "Carregando a liga…" strip |
| A loading line never pushes content under the finger. Image tiles keep their own skeleton and the "loading" text is screen-reader only | `ImageChoiceGrid` |
| Status loops stay status loops: spinners, the recording dot and the listening disc. Every `animate-pulse` / `animate-ping` stops under reduced motion. The Hanzi Builder "Verificar" no longer pulses forever; it gets one emphasis | CSS + components |

## Empty

An empty state names what is missing and offers the way forward.

- Review empty → **Continuar na Jornada** (primary). The Journey is what feeds
  the queue. Hànzì stays secondary. The copy has no jargon: "Conclua lições na
  Jornada e as palavras voltam aqui no momento certo."
- Achievements with an empty filter → **Ver todas**.
- Culture collection still being prepared → **Voltar à Cultura**.
- `EmptyState` takes an `action`. A screen that can offer one does.

## Error

- **Never raw.** `localizeUserMessage` maps known copy onto the catalog. App
  copy we wrote passes through. Technical text fails closed to
  `errors.unknown`: error class names, JWT, PostgREST, SQL, HTTP status lines
  and snake_case reason codes. Every engine's network wording maps to
  `errors.backendUnavailable`: "Failed to fetch", "Load failed",
  "NetworkError…". The gate runs the localizer on real samples.
- **Never a dead end.** `ErrorState` has an `onRetry`, and Família passes its
  reload. The league error has a real retry button that shows `loading`.
- **Retry must be able to work.** When a lazy chunk failed, React keeps the
  rejected promise, so clearing the error did nothing. `ErrorBoundary` now
  reloads instead. While offline, the card says "Sem conexão. Conecte-se e tente
  de novo." rather than pretending.
- **Copy never accuses.** "Conclua a lição de verdade" is gone. A server that
  has not confirmed a lesson reward says so neutrally.

## Offline

- **One signal.** `lib/platform/networkStatus` combines window events with the
  Android Network plugin. `CloudSyncBootstrap` and `EconomyBootstrap` both use
  it and act **once per offline → online transition**: progress push, intent
  queue flush, and economy fetch. The interval push no longer spins while
  offline.
- **Lessons.** A single compact "Sem conexão" pill. The full sentence is
  available to screen readers and on long-press. It used to be a 3-line block
  on every step.
- **Cold start.** If the access token expired while the phone was offline,
  Supabase cannot refresh it, and the learner was sent to /login, away from the
  progress stored on the phone. The last account the server confirmed as
  `cloud_ready` is remembered, and **only while offline** it stands in for the
  session. Online, the server always decides again. An online "no session"
  answer forgets it, and so does sign-out. The gate re-checks the audience when
  the network returns.
- **Economy intents.** The bridge queues every transport failure, and the queue
  and amounts are unchanged. While offline, the learner reads "Salvo neste
  aparelho — confirmamos quando a conexão voltar", not "não confirmado pelo
  servidor". A real server answer keeps its specific message.

## Sync truth

| Surface | Rule |
| --- | --- |
| Conta badge + "where" line | Green "Progresso salvo na nuvem" only when `cloudSyncState` is synced (or idle) **and** online. Pending or loading → "Sincronizando progresso…". Error → "Progresso local seguro — toque para tentar de novo". Offline → "Você pode continuar. O progresso será sincronizado quando a conexão voltar." |
| `SyncStatusChip` | Offline shows "Offline · salvo neste aparelho" instead of "Salvando…" forever. A retrying problem is calm gold, with the reassurance read to screen readers. |
| Sign-out | When this device still has unsynced progress, the confirmation says so before the learner confirms. |
| Global sync banner | Shown through the catalog, so EN learners no longer read Portuguese. |
| League | No backend text ever. The weekly claim allows one request in flight and reports its result as a sentence. |

## Rules

1. Every state names where the learner's work is: on this device, syncing, or
   in the cloud.
2. Every error offers a retry or a way back. Every empty state offers the next
   step.
3. Learners never see raw server or engine text.
4. Loading never blanks the shell, never flashes, and never shifts content
   under the finger.
5. The network signal is the shared one, and reconnecting acts once.
6. Status loops are the only infinite animations outside the ambient budget,
   and reduced motion stops them.
