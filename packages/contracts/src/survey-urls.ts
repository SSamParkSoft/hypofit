export function isExternalSurveyUrl(value: string): boolean {
  const input = value.trim();
  if (!/^https:\/\//i.test(input) || input.length > 2000 || /[\u0000-\u0020\u007f\\]/.test(input)) return false;
  try {
    const url = new URL(input);
    return !url.username && !url.password && !input.slice(8).split(/[/?#]/, 1)[0].includes("@") &&
      url.hostname.includes(".") && !/^[\d.]+$/.test(url.hostname) && !url.hostname.includes(":") &&
      (!url.port || Number(url.port) > 0);
  } catch {
    return false;
  }
}
