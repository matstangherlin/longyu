import React, { Suspense } from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider, createBrowserRouter, Outlet } from "react-router-dom";
import "./index.css";
import { routes } from "./routes";
import { ErrorBoundary } from "./components/system/ErrorBoundary";
import { PwaUpdateBanner } from "./components/system/PwaUpdateBanner";
import { FeedbackProvider } from "./components/feedback/FeedbackContext";
import { SeoHead } from "./components/seo/SeoHead";
import { PageFallback } from "./components/system/PageFallback";

import { I18nProvider } from "./i18n/provider";
import { bootstrapInterfaceLocale } from "./i18n/locale";

bootstrapInterfaceLocale();

const router = createBrowserRouter([
  {
    element: (
      <>
        <SeoHead />
        <Suspense fallback={<PageFallback />}>
          <Outlet />
        </Suspense>
      </>
    ),
    children: routes,
  },
]);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <I18nProvider>
      <FeedbackProvider>
        <ErrorBoundary fullScreen area="root">
          <RouterProvider router={router} />
        </ErrorBoundary>
        <PwaUpdateBanner />
      </FeedbackProvider>
    </I18nProvider>
  </React.StrictMode>
);
