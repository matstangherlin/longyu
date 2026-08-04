import { Navigate, useLocation } from "react-router-dom";
import { MarketingArticle, PublicMarketingLayout } from "./PublicMarketingLayout";
import { marketingContentForPath } from "./content";

export function MarketingPage() {
  const { pathname } = useLocation();
  const content = marketingContentForPath(pathname);

  if (!content) {
    return <Navigate to="/" replace />;
  }

  return (
    <PublicMarketingLayout>
      <MarketingArticle title={content.heading} lead={content.lead} sections={content.sections} />
    </PublicMarketingLayout>
  );
}
