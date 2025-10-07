export type HeaderMap = Record<string, string[]>;

export const CHECKLIST_TEMPLATE_HEADER_MAP: HeaderMap = {
  name: ["name", "checklist", "title"],
  daypart: ["daypart", "shift", "time_of_day"],
  frequency: ["frequency", "freq", "interval"],
  role: ["role", "team", "department"],
};

export const EQUIPMENT_HEADER_MAP: HeaderMap = {
  name: ["name", "asset", "equipment"],
  type: ["type", "category"],
  serial: ["serial", "sn", "serial_number"],
  service_interval_days: [
    "service_interval_days",
    "interval",
    "ppm_interval_days",
    "service_interval",
  ],
  supplier: ["supplier", "vendor"],
  warranty_expiry: ["warranty_expiry", "warranty", "warranty_expiration", "warranty_end"],
  site_id: ["site_id", "site", "location_id"],
};

export type ValidationError = { line: number; message: string; field?: string };

// Robust CSV parser supporting quoted values and embedded commas/newlines (RFC 4180-ish)
export function parseCsv(text: string): { rows: any[]; headers: string[] } {
  if (!text) return { rows: [], headers: [] };
  // Strip BOM
  if (text.charCodeAt(0) === 0xfeff) {
    text = text.slice(1);
  }
  const rowsArr: string[][] = [];
  let field = "";
  let row: string[] = [];
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];
    if (inQuotes) {
      if (ch === '"') {
        if (next === '"') {
          field += '"';
          i++; // skip escaped quote
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        row.push(field.trim());
        field = "";
      } else if (ch === '\n' || ch === '\r') {
        // handle CRLF
        if (ch === '\r' && next === '\n') i++;
        row.push(field.trim());
        field = "";
        if (row.length > 1 || (row.length === 1 && row[0] !== "")) {
          rowsArr.push(row);
        }
        row = [];
      } else {
        field += ch;
      }
    }
  }
  // flush last field
  row.push(field.trim());
  if (row.length > 1 || (row.length === 1 && row[0] !== "")) {
    rowsArr.push(row);
  }
  if (rowsArr.length === 0) return { rows: [], headers: [] };
  const headers = (rowsArr[0] || []).map((h) => h.trim().toLowerCase());
  const rows = rowsArr.slice(1).map((cols) => {
    const obj: any = {};
    headers.forEach((h, i) => (obj[h] = (cols[i] ?? "").trim()))
    return obj;
  });
  return { rows, headers };
}

export function mapCsvRows(text: string, headerMap: HeaderMap): any[] {
  const { rows } = parseCsv(text);
  return rows.map((row) => normalizeRow(row, headerMap));
}

export function normalizeRow(row: any, headerMap: HeaderMap): any {
  const out: any = {};
  const lowerRow: any = {};
  Object.keys(row || {}).forEach((k) => (lowerRow[k.toLowerCase()] = row[k]));
  for (const key of Object.keys(headerMap)) {
    const candidates = headerMap[key];
    const found = candidates.find((c) => lowerRow[c] !== undefined && lowerRow[c] !== "");
    if (found) out[key] = lowerRow[found];
  }
  return out;
}

function isValidISODate(yyyyMmDd: string): boolean {
  if (!yyyyMmDd) return false;
  const m = /^\d{4}-\d{2}-\d{2}$/.exec(yyyyMmDd);
  if (!m) return false;
  const [y, mo, d] = yyyyMmDd.split("-").map((x) => Number(x));
  if (mo < 1 || mo > 12) return false;
  if (d < 1) return false;
  const isLeap = (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
  const daysInMonth = [31, isLeap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][mo - 1];
  if (d > daysInMonth) return false;
  return true;
}

export function validateChecklistRows(rows: any[]): { valid: any[]; errors: ValidationError[] } {
  const errors: ValidationError[] = [];
  const valid: any[] = [];
  const allowedFreq = new Set(["daily", "weekly", "monthly"]);
  const allowedDaypart = new Set(["opening", "pre-service", "post-service"]);
  rows.forEach((r, idx) => {
    const line = idx + 2; // +1 for header, +1 for 1-indexed
    const name = (r.name || "").trim();
    const freq = String(r.frequency || "").trim().toLowerCase();
    const daypart = String(r.daypart || "").trim().toLowerCase();
    if (!name) errors.push({ line, field: "name", message: "Missing checklist name" });
    if (freq && !allowedFreq.has(freq)) errors.push({ line, field: "frequency", message: `Invalid frequency: ${r.frequency}` });
    if (daypart && !allowedDaypart.has(daypart)) errors.push({ line, field: "daypart", message: `Invalid daypart: ${r.daypart}` });
    const role = (r.role || "").trim();
    valid.push({ ...r, name, frequency: freq || "daily", daypart: daypart || "opening", role: role || "kitchen" });
  });
  return { valid, errors };
}

export function validateEquipmentRows(rows: any[]): { valid: any[]; errors: ValidationError[] } {
  const errors: ValidationError[] = [];
  const valid: any[] = [];
  rows.forEach((r, idx) => {
    const line = idx + 2;
    const name = (r.name || "").trim();
    if (!name) errors.push({ line, field: "name", message: "Missing asset name" });
    let interval = r.service_interval_days;
    interval = interval === undefined || interval === null || interval === "" ? undefined : Number(interval);
    if (interval !== undefined && (!Number.isFinite(interval) || interval <= 0)) {
      errors.push({ line, field: "service_interval_days", message: `Invalid service interval days: ${r.service_interval_days}` });
    }
    const expiry = (r.warranty_expiry || "").trim();
    if (expiry && !isValidISODate(expiry)) errors.push({ line, field: "warranty_expiry", message: `Invalid warranty expiry date (YYYY-MM-DD): ${expiry}` });
    const siteId = (r.site_id || "").trim();
    valid.push({ ...r, name, service_interval_days: interval, warranty_expiry: expiry || null, site_id: siteId || null });
  });
  return { valid, errors };
}