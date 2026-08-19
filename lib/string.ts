export function isNullOrEmpty(
  text: string | null | undefined,
): text is null | undefined {
  return text === undefined || text === null || text === "";
}
