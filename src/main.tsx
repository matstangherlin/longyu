import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider, createBrowserRouter } from "react-router-dom";
import "./index.css";
import { routes } from "./routes";
import { AppErrorBoundary } from "./components/system/AppErrorBoundary";
import { E2eCrashProbe } from "./components/system/E2eCrashProbe";
import { installGlobalErrorCapture } from "./services/errorReportingService";

installGlobalErrorCapture();

const router = createBrowserRouter(routes);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AppErrorBoundary onNavigateJourney={() => window.location.assign("/jornada")}>
      <E2eCrashProbe />
      <RouterProvider router={router} />
    </AppErrorBoundary>
  </React.StrictMode>
);
