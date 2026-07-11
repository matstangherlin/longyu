import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { Button } from "../ui/primitives";
import { Mascot } from "../brand/Mascot";
import { APP_VERSION } from "../../lib/appMeta";
import { topHighlightsForVersion } from "../../data/releaseNotes";
import { RELEASE_NOTE_KIND_LABEL } from "../../data/releaseNotes";
import { setLastSeenReleaseVersion, shouldShowReleaseNotes } from "../../lib/releaseStorage";

interface ReleaseNotesModalProps {
  open: boolean;
  onClose: () => void;
}

export function ReleaseNotesModal({ open, onClose }: ReleaseNotesModalProps) {
  const highlights = topHighlightsForVersion(APP_VERSION, 3);

  if (!open) return null;

  const acknowledge = () => {
    setLastSeenReleaseVersion(APP_VERSION);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/35 p-4 sm:items-center">
      <div
        role="dialog"
        aria-labelledby="release-notes-title"
        className="w-full max-w-md rounded-[28px] border border-line bg-surface p-6 shadow-lift"
      >
        <div className="mx-auto flex justify-center">
          <Mascot size={72} variant="wave" />
        </div>
        <h2 id="release-notes-title" className="mt-3 text-center font-serif text-2xl font-semibold text-ink">
          Novidades
        </h2>
        <p className="mt-1 text-center text-sm text-ink-soft">Versão {APP_VERSION}</p>
        <ul className="mt-4 space-y-2 text-sm text-ink-soft">
          {highlights.map((item) => (
            <li key={`${item.kind}-${item.text}`} className="rounded-xl bg-surface-2 px-3 py-2">
              <span className="font-semibold text-ink">{RELEASE_NOTE_KIND_LABEL[item.kind]}: </span>
              {item.text}
            </li>
          ))}
        </ul>
        <div className="mt-5 grid gap-2">
          <Button size="lg" className="w-full" onClick={acknowledge}>
            Entendi
          </Button>
          <Link to="/sobre#changelog" onClick={acknowledge}>
            <Button variant="outline" className="w-full">
              Ver todas as mudanças
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

export function ReleaseNotesProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (shouldShowReleaseNotes(APP_VERSION)) {
      const timer = window.setTimeout(() => setOpen(true), 600);
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, []);

  return (
    <>
      {children}
      <ReleaseNotesModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
