import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { BetaBadge } from "../../components/feedback/BetaBadge";
import { FeedbackPrompt } from "../../components/feedback/FeedbackPrompt";
import { MyFeedbackList } from "../../components/feedback/MyFeedbackList";
import { AppVersionLabel } from "../../components/system/AppVersionLabel";
import { BetaNotice } from "../../components/system/BetaNotice";
import { Card, SectionTitle } from "../../components/ui/primitives";
import { BETA_LABEL } from "../../lib/feedback";
import { isSupabaseBackendEnabled } from "../../lib/backendConfig";
import { useTranslation } from "../../i18n/useTranslation";

export function AboutPage() {
  const { t } = useTranslation();
  const cloud = isSupabaseBackendEnabled();
  const location = useLocation();
  const points = [
    {
      title: t("marketing.aboutInDevTitle"),
      desc: t("marketing.aboutInDevDesc"),
    },
    {
      title: cloud ? t("marketing.aboutProgressCloudTitle") : t("marketing.aboutProgressLocalTitle"),
      desc: cloud ? t("marketing.aboutProgressCloudDesc") : t("marketing.aboutProgressLocalDesc"),
    },
    {
      title: cloud ? t("marketing.aboutAccountCloudTitle") : t("marketing.aboutAccountLocalTitle"),
      desc: cloud ? t("marketing.aboutAccountCloudDesc") : t("marketing.aboutAccountLocalDesc"),
    },
    {
      title: t("marketing.aboutFeedbackTitle"),
      desc: t("marketing.aboutFeedbackDesc"),
    },
  ];

  useEffect(() => {
    const id = location.hash.replace("#", "");
    if (!id) return;
    const target = document.getElementById(id);
    if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [location.hash]);

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
      <SectionTitle
        eyebrow={t("marketing.aboutEyebrow")}
        title={t("marketing.aboutTitle")}
        desc={t("marketing.aboutLead")}
      />

      <Card className="rounded-2xl p-5 shadow-none sm:p-6">
        <div className="flex flex-wrap items-center gap-2">
          <BetaBadge />
          <AppVersionLabel className="text-xs" />
          <span className="text-xs text-ink-faint">{t("marketing.aboutTagline")}</span>
        </div>
        <h2 className="mt-4 font-serif text-2xl font-semibold text-ink">{BETA_LABEL}</h2>
        <p className="mt-2 text-sm leading-7 text-ink-soft">{t("marketing.aboutIntro")}</p>
        <BetaNotice className="mt-3" />
      </Card>

      <section className="grid gap-3">
        {points.map((point) => (
          <Card key={point.title} className="rounded-xl p-4 shadow-none">
            <h3 className="font-serif text-lg font-semibold text-ink">{point.title}</h3>
            <p className="mt-1 text-sm leading-6 text-ink-soft">{point.desc}</p>
          </Card>
        ))}
      </section>

      <section id="feedback" className="scroll-mt-6 space-y-3">
        <FeedbackPrompt context={{ screen: "/sobre" }} compact />
        <Card className="rounded-xl p-4 shadow-none">
          <h3 className="font-serif text-lg font-semibold text-ink">{t("marketing.yourFeedbacks")}</h3>
          <p className="mt-1 mb-3 text-sm text-ink-soft">{t("marketing.yourFeedbacksLead")}</p>
          <MyFeedbackList />
        </Card>
      </section>

      <p className="text-center text-xs text-ink-faint">
        Longyu (龙语) · <AppVersionLabel /> ·{" "}
        {cloud ? t("marketing.cloudAvailable") : t("marketing.savedOnDevice")} · áudio via Web Speech API
      </p>
    </div>
  );
}
