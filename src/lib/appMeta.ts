/** Metadados de build embutidos no bundle (Vite define). */
export const APP_VERSION =
  typeof __APP_VERSION__ !== "undefined" ? __APP_VERSION__ : "0.1.0";

export const BUILD_SHA =
  typeof __BUILD_SHA__ !== "undefined" ? __BUILD_SHA__ : "dev";
