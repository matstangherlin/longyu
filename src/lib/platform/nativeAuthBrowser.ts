/**
 * RC2.3.8 — in-app browser for OAuth on Android (Custom Tabs via @capacitor/browser).
 * The only place auth touches a Capacitor plugin (platform boundary).
 */
export async function openAuthBrowser(url: string): Promise<void> {
  const { Browser } = await import("@capacitor/browser");
  await Browser.open({ url });
}

export async function closeAuthBrowser(): Promise<void> {
  try {
    const { Browser } = await import("@capacitor/browser");
    await Browser.close();
  } catch {
    /* already closed / not native */
  }
}
