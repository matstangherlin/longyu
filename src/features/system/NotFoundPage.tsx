import { Link } from "react-router-dom";
import { useTranslation } from "../../i18n/provider";
import { BrandLockup } from "../../components/layout/Brand";
import { Button, Card } from "../../components/ui/primitives";

export function NotFoundPage() {
  const { t } = useTranslation();
  return (
    <main className="flex min-h-dvh items-center justify-center bg-bg px-4 py-10" data-public-not-found="">
      <Card className="w-full max-w-lg p-6 text-center sm:p-8">
        <div className="flex justify-center"><BrandLockup size={32} /></div>
        <p className="mt-6 text-sm font-semibold tracking-[0.18em] text-accent">404</p>
        <h1 className="mt-2 font-serif text-3xl font-semibold text-ink">{t("errors.notFoundTitle")}</h1>
        <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-ink-soft">{t("errors.notFoundBody")}</p>
        <div className="mt-7 grid gap-2 sm:grid-cols-2">
          <Link to="/"><Button className="w-full">{t("marketing.backHome")}</Button></Link>
          <Link to="/comecar"><Button variant="outline" className="w-full">{t("marketing.getStarted")}</Button></Link>
        </div>
      </Card>
    </main>
  );
}
