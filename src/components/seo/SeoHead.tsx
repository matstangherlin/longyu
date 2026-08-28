import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { buildJsonLd, resolveSeo } from "../../lib/seo";
import { LOCALE_OG } from "../../i18n/config";
import { useTranslation } from "../../i18n/useTranslation";

function upsertMeta(attr: "name" | "property", key: string, content: string) {
  const selector = `meta[${attr}="${key}"]`;
  let el = document.head.querySelector(selector) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function upsertLink(rel: string, href: string) {
  let el = document.head.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement | null;
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", rel);
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
}

function upsertJsonLd(data: Record<string, unknown>) {
  const id = "longyu-jsonld";
  let el = document.getElementById(id) as HTMLScriptElement | null;
  if (!el) {
    el = document.createElement("script");
    el.type = "application/ld+json";
    el.id = id;
    document.head.appendChild(el);
  }
  el.textContent = JSON.stringify(data);
}

/**
 * Atualiza title, description, robots, canonical, Open Graph e Twitter Cards
 * conforme a rota. Páginas privadas e de auth recebem noindex.
 */
export function SeoHead() {
  const location = useLocation();
  const { locale, t } = useTranslation();

  useEffect(() => {
    const seo = resolveSeo(location.pathname);
    const path = location.pathname;
    const chromeSeo =
      path === "/" ||
      path === "/login" ||
      path === "/esqueci-senha" ||
      path === "/redefinir-senha" ||
      path === "/confirmar-email" ||
      path === "/sobre" ||
      path === "/privacidade" ||
      path === "/comecar" ||
      path === "/finalizar-cadastro";
    const title =
      path === "/sobre"
        ? t("marketing.aboutDocumentTitle")
        : path === "/privacidade"
          ? t("marketing.privacyDocumentTitle")
          : chromeSeo
            ? t("marketing.documentTitle")
            : seo.title;
    const description =
      path === "/sobre"
        ? t("marketing.aboutLead")
        : path === "/privacidade"
          ? t("hub.privacyDesc")
          : chromeSeo
            ? t("marketing.documentDescription")
            : seo.description;
    document.title = title;

    upsertMeta("name", "description", description);
    upsertMeta("name", "robots", seo.robots);
    upsertMeta("name", "googlebot", seo.robots);
    upsertLink("canonical", seo.canonical);

    upsertMeta("property", "og:type", "website");
    upsertMeta("property", "og:site_name", "Longyu");
    upsertMeta("property", "og:locale", LOCALE_OG[locale]);
    upsertMeta("property", "og:title", title);
    upsertMeta("property", "og:description", description);
    upsertMeta("property", "og:url", seo.canonical);
    upsertMeta("property", "og:image", seo.ogImage);
    upsertMeta("property", "og:image:width", "1200");
    upsertMeta("property", "og:image:height", "630");
    upsertMeta("property", "og:image:alt", t("marketing.ogImageAlt"));

    upsertMeta("name", "twitter:card", "summary_large_image");
    upsertMeta("name", "twitter:title", title);
    upsertMeta("name", "twitter:description", description);
    upsertMeta("name", "twitter:image", seo.ogImage);

    upsertJsonLd(buildJsonLd());
  }, [location.pathname, locale, t]);

  return null;
}
