/**
 * RC2.2.16 — identidade Android canônica e CONGELADA do Longyu.
 *
 * `longyu.noba.com` é o package do app criado pelo owner no Google Play
 * Console. Ele é, ao mesmo tempo: Capacitor appId, Gradle applicationId,
 * namespace, package Java, esquema de deep link e package do AAB final.
 *
 * Depois do primeiro upload real ao Play este valor não muda NUNCA (a Play
 * recusa outro package para o mesmo app e o Android trata outro id como outro
 * aplicativo, com dados zerados). validate:android-release-identity compara
 * esta constante com docs/release/android-package-identity.json, com o ledger
 * de uploads e com o bundle compilado.
 *
 * Sem imports: tools e gates importam este módulo direto.
 */
export const ANDROID_APPLICATION_ID = "longyu.noba.com";
export const ANDROID_URL_SCHEME = ANDROID_APPLICATION_ID;
export const ANDROID_FILE_PROVIDER_AUTHORITY = `${ANDROID_APPLICATION_ID}.fileprovider`;
export const ANDROID_JAVA_SOURCE_DIR = `android/app/src/main/java/${ANDROID_APPLICATION_ID.split(".").join("/")}`;
/** Ids que já existiram só em builds de desenvolvimento, nunca publicados. */
export const LEGACY_ANDROID_APPLICATION_IDS = Object.freeze(["com.longyu.app"]);
export const PACKAGE_IDENTITY_MANIFEST = "docs/release/android-package-identity.json";
