export function getTimezones(): string[] {
  try {
    // @ts-ignore - supportedValuesOf may not exist in all environments
    const vals = Intl.supportedValuesOf?.("timeZone");
    if (Array.isArray(vals) && vals.length > 0) return vals;
  } catch {}
  return [
    "UTC",
    "Europe/London",
    "Europe/Paris",
    "Europe/Berlin",
    "Europe/Madrid",
    "America/New_York",
    "America/Chicago",
    "America/Denver",
    "America/Los_Angeles",
    "America/Toronto",
    "America/Mexico_City",
    "Asia/Dubai",
    "Asia/Singapore",
    "Asia/Hong_Kong",
    "Asia/Tokyo",
    "Australia/Sydney",
  ];
}