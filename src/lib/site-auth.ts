// Пароль закрытого теста. После входа в браузере лежит cookie с
// «отпечатком» пароля (сам пароль там не хранится). Смена SITE_PASSWORD
// на сервере меняет отпечаток — и все входят заново.
export const AUTH_COOKIE = "site_auth";
// Год — чтобы приложение на телефоне не спрашивало пароль при каждом запуске
export const AUTH_MAX_AGE = 60 * 60 * 24 * 365;

export async function authToken(password: string): Promise<string> {
  const bytes = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(`spoiler:${password}`),
  );
  return [...new Uint8Array(bytes)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

// Адрес сайта, каким его видит браузер. За прокси Timeweb адрес запроса
// внутри сервера может быть внутренним, поэтому смотрим заголовки прокси
export function publicBase(request: Request): string {
  const host =
    request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const proto = request.headers.get("x-forwarded-proto") ?? "http";
  return host ? `${proto}://${host}` : request.url;
}

// Куда вернуть после входа: только адрес этого же сайта
export function safeNext(value: string | null | undefined): string {
  return value && value.startsWith("/") && !value.startsWith("//")
    ? value
    : "/";
}
