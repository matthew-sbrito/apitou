/**
 * All peladas are played in Brazil, so event dates are always displayed in
 * America/Sao_Paulo — regardless of the server's own timezone. Without this,
 * `date-fns`'s `format(new Date(iso), ...)` reads the *host* timezone: it
 * matches on a dev machine set to Brasília time, but a UTC production server
 * (Vercel et al.) shifts every timestamp forward by 3h (e.g. 21:00 becomes
 * 00:00 the next day).
 */
const EVENT_TIME_ZONE = "America/Sao_Paulo";

export function formatEventDateTime(date: string | Date): string {
  const value = typeof date === "string" ? new Date(date) : date;
  const parts = new Intl.DateTimeFormat("pt-BR", {
    timeZone: EVENT_TIME_ZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(value);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? "";

  return `${get("day")}/${get("month")}/${get("year")} às ${get("hour")}:${get("minute")}`;
}
