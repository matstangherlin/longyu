import React, { Suspense } from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider, createBrowserRouter, Outlet } from "react-router-dom";
import "./index.css";
import { routes } from "./routes";
import { ErrorBoundary } from "./components/system/ErrorBoundary";
import { SeoHead } from "./components/seo/SeoHead";
import { PageFallback } from "./components/system/PageFallback";

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
    <ErrorBoundary fullScreen area="root">
      <RouterProvider router={router} />
    </ErrorBoundary>
  </React.StrictMode>
);
