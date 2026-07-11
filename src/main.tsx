import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider, createBrowserRouter } from "react-router-dom";
import "./index.css";
import { routes } from "./routes";
import { AppErrorBoundary } from "./components/system/AppErrorBoundary";
import { ReleaseNotesProvider } from "./components/release/ReleaseNotesProvider";
import { usePwaUpdateRegistration } from "./hooks/usePwaUpdate";

const router = createBrowserRouter(routes);

function AppRoot() {
  usePwaUpdateRegistration();
  return (
    <ReleaseNotesProvider>
      <RouterProvider router={router} />
    </ReleaseNotesProvider>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AppErrorBoundary>
      <AppRoot />
    </AppErrorBoundary>
  </React.StrictMode>
);
