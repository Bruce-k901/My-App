/**
 * Route code mappings for URL obfuscation.
 * Maps readable module names to short codes so URLs don't expose
 * the application's information architecture.
 *
 * /dashboard/stockly/recipes → /app/s/recipes
 */

// Module name → short code
export const ROUTE_CODES: Record<string, string> = {
  organization: "og",
  business: "bz",
  users: "u",
  sites: "st",
  training: "tr",
  documents: "dc",
  tasks: "tk",
  my_templates: "mt",
  my_tasks: "my",
  todays_tasks: "td",
  sops: "so",
  "risk-assessments": "ra",
  libraries: "lb",
  assets: "at",
  ppm: "pm",
  courses: "cr",
  logs: "lg",
  people: "pe",
  stockly: "s",
  messaging: "mg",
  calendar: "cl",
  reports: "rp",
  "eho-report": "eh",
  billing: "bl",
  settings: "x",
  support: "sp",
  incidents: "in",
  checklists: "ch",
  "coshh-data": "cd",
  help: "h",
  planly: "p",
  compliance: "cm",
  "compliance-templates": "ct",
  equipment: "eq",
  admin: "ad",
  archive: "av",
  "archived-assets": "aa",
  "sfbb-library": "sf",
  onboarding: "ob",
};

// Reverse: short code → module name
export const CODE_TO_MODULE: Record<string, string> = Object.fromEntries(
  Object.entries(ROUTE_CODES).map(([mod, code]) => [code, mod])
);

/** Convert a readable path to an obfuscated path */
export function toAppUrl(path: string): string {
  if (!path.startsWith("/dashboard")) return path;
  const rest = path.slice("/dashboard".length); // e.g. "/stockly/recipes" or ""
  if (!rest || rest === "/") return "/app";

  const segments = rest.split("/").filter(Boolean); // ["stockly", "recipes"]
  const module = segments[0];
  const code = ROUTE_CODES[module];
  if (!code) return path; // unknown module, keep as-is

  const subPath = segments.slice(1).join("/");
  return `/app/${code}${subPath ? `/${subPath}` : ""}`;
}

/** Convert an obfuscated path back to the real file-system path */
export function toRealPath(path: string): string {
  if (!path.startsWith("/app")) return path;
  const rest = path.slice("/app".length);
  if (!rest || rest === "/") return "/dashboard";

  const segments = rest.split("/").filter(Boolean);
  const code = segments[0];
  const module = CODE_TO_MODULE[code];
  if (!module) return path; // unknown code

  const subPath = segments.slice(1).join("/");
  return `/dashboard/${module}${subPath ? `/${subPath}` : ""}`;
}
