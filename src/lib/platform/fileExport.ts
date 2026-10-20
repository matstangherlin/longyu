import { isNativeApp } from "./nativePlatform";

export type FileExportOutcome = "downloaded" | "copied" | "unavailable";

/**
 * RC2.3.13R.3.2.6 — honest data export.
 *
 * On the web the browser saves the JSON through a download link. Inside the
 * Android app (WebView) a blob download link saves nothing the learner can
 * find, so the app never claims it did: it copies the same JSON to the
 * clipboard when the platform allows, and otherwise says the file export
 * lives on the web version. Callers show the copy that matches the outcome.
 */
export async function exportJsonFile(fileName: string, data: unknown): Promise<FileExportOutcome> {
  const json = JSON.stringify(data, null, 2);
  if (!isNativeApp()) {
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    return "downloaded";
  }
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(json);
      return "copied";
    }
  } catch {
    /* clipboard refused: say so below */
  }
  return "unavailable";
}
