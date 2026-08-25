import { useEffect } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import {
  beginQaSession,
  endQaSession,
  isQaModeAllowed,
  QA_FIXTURES,
  type QaFixtureId,
} from "../../lib/qaSession";
import { LessonPlayer } from "../lesson/LessonPlayer";

/**
 * Hub de QA físico (V4.6). Só em DEV / preview com fixtures.
 * Não escreve progresso real — LessonPlayer respeita sessão QA.
 */
export function QaHubPage() {
  useEffect(() => {
    beginQaSession();
    return () => endQaSession();
  }, []);

  if (!isQaModeAllowed()) {
    return <Navigate to="/jornada" replace />;
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-8" data-qa-hub>
      <h1 className="font-serif text-2xl font-semibold text-ink">QA físico — atalhos</h1>
      <p className="mt-2 text-sm text-ink-soft">
        Modo DEV/preview. Não altera progresso, Pérolas, streak, SRS nem entitlement.
      </p>
      <ul className="mt-6 grid gap-2">
        {QA_FIXTURES.map((fixture) => (
          <li key={fixture.id}>
            <Link
              className="block rounded-xl border border-line bg-surface px-3.5 py-3 text-sm font-semibold text-ink hover:border-accent"
              to={
                fixture.route
                  ? fixture.route
                  : `/qa/player/${fixture.id}`
              }
              data-qa-fixture={fixture.id}
            >
              {fixture.labelPt}
              {fixture.notePt ? (
                <span className="mt-0.5 block text-xs font-normal text-ink-mute">{fixture.notePt}</span>
              ) : null}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Abre LessonPlayer em sessão QA com fixture determinística. */
export function QaPlayerPage() {
  const { fixtureId } = useParams<{ fixtureId: string }>();
  const fixture = QA_FIXTURES.find((entry) => entry.id === (fixtureId as QaFixtureId));

  useEffect(() => {
    beginQaSession();
    return () => endQaSession();
  }, []);

  if (!isQaModeAllowed()) {
    return <Navigate to="/jornada" replace />;
  }

  if (!fixture?.lessonId) {
    return <Navigate to="/qa" replace />;
  }

  return (
    <div data-qa-player data-qa-fixture={fixture.id} data-qa-lesson={fixture.lessonId}>
      <div className="border-b border-line bg-amber-50 px-3 py-2 text-center text-xs font-semibold text-amber-900">
        QA mode — sem mutação de progresso · {fixture.labelPt}
      </div>
      <LessonPlayer qaMode lessonIdOverride={fixture.lessonId} />
    </div>
  );
}
