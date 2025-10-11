"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/ui/ToastProvider";
import DatePicker from "react-datepicker";

type Site = Record<string, any>;

export default function SiteAccordion({ sites, onRefresh }: { sites: Site[]; onRefresh?: () => void }) {
  return (
    <div className="space-y-2">
      {(sites || []).map((site) => (
        <AccordionItem key={site.id ?? `${(site.name || site.site_name || "site")}-${Math.random()}` } site={site} onRefresh={onRefresh} />
      ))}
    </div>
  );
}

function AccordionItem({ site, onRefresh }: { site: Site; onRefresh?: () => void }) {
  const { showToast } = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Site>({ ...site });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // Keep form in sync with site when collapsing or when site changes
    if (!open) setForm({ ...site });
  }, [site, open]);

  const title = site.name || site.site_name || "Untitled site";
  const city = site.city || "No city";
  const type = site.site_type || "No type";

  const handleSave = async () => {
    if (!site.id) {
      showToast({ title: "Save failed", description: "Missing site id", type: "error" });
      return;
    }
    setSaving(true);
    const payload = Object.fromEntries(
      Object.entries(form).filter(([k]) => !["id", "company_id", "created_at"].includes(k))
    );
    const { error } = await supabase
      .from("sites")
      .update(payload)
      .eq("id", site.id)
      .select("*")
      .single();
    setSaving(false);
    if (error) {
      showToast({ title: "Save failed", description: error.message || "Unable to save", type: "error" });
    } else {
      showToast({ title: "Saved", description: "Site updated successfully", type: "success" });
      onRefresh?.();
      setOpen(false);
    }
  };

  const handleDelete = async () => {
    if (!site.id) {
      showToast({ title: "Delete failed", description: "Missing site id", type: "error" });
      return;
    }
    if (!confirm("Delete this site?")) return;
    const { error } = await supabase.from("sites").delete().eq("id", site.id);
    if (error) {
      showToast({ title: "Delete failed", description: error.message || "Unable to delete", type: "error" });
    } else {
      showToast({ title: "Site deleted", description: "The site was removed successfully.", type: "success" });
      onRefresh?.();
    }
  };

  const handleCancel = () => {
    setForm({ ...site });
    setOpen(false);
  };

  // --- auto-fill helper ---
  const propagateDefaultTimes = (updatedDays: Record<string, any>) => {
    const firstFilled = Object.values(updatedDays).find(
      (d) => d.open && d.from && d.to
    );
    if (!firstFilled) return updatedDays;

    const newDays = {} as Record<string, any>;
    for (const [day, d] of Object.entries(updatedDays)) {
      // Only apply defaults to open days missing values; keep custom times intact
      if ((d as any)?.open) {
        newDays[day] = {
          ...d,
          from: (d as any).from || (firstFilled as any).from,
          to: (d as any).to || (firstFilled as any).to,
        };
      } else {
        newDays[day] = d as any;
      }
    }
    return newDays;
  };

  const roundToQuarter = (value: string) => {
    if (!value) return value;
    const [hhStr, mmStr] = value.split(":");
    const hh = Number(hhStr);
    const mm = Number(mmStr);
    let rounded = Math.round(mm / 15) * 15;
    let newHour = hh;
    if (rounded === 60) {
      newHour = (hh + 1) % 24;
      rounded = 0;
    }
    const h = String(newHour).padStart(2, "0");
    const m = String(rounded).padStart(2, "0");
    return `${h}:${m}`;
  };
  // Helpers for hour/minute handling and consistent dropdown UX
  const splitHM = (val?: string) => {
    const [h, m] = (val || "").split(":");
    return { h: h || "", m: m || "" };
  };
  // Quarter-hour dropdown controls for consistent UX across browsers
  const HOURS = Array.from({ length: 24 }, (_, h) => String(h).padStart(2, "0"));
  const MINUTES = ["00", "15", "30", "45"];

  return (
    <div className="rounded-xl border border-gray-700 bg-gray-900 p-4">
      <div
        className="flex justify-between items-center cursor-pointer"
        onClick={() => setOpen(!open)}
      >
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold text-white">{title}</h3>
          <span className="text-sm text-gray-400">{city} • {type}</span>
        </div>
        <span className="text-pink-400">{open ? "−" : "+"}</span>
      </div>

      {open && (
        <div className="mt-4">
          {/* Name + Address fields */}
          {[
            "name",
            "address_line1",
            "address_line2",
            "city",
            "postcode",
            "country",
          ].map((key) => (
            <div key={key} className="mb-2">
              <label className="block text-sm text-gray-400 capitalize mb-1">
                {key.replace(/_/g, " ")}
              </label>
              <input
                type="text"
                value={
                  key === "name"
                    ? form.name ?? form.site_name ?? ""
                    : form[key] ?? ""
                }
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    [key]: e.target.value,
                  }))
                }
                className="w-full bg-gray-800 text-gray-200 border border-gray-700 rounded-lg p-2"
              />
            </div>
          ))}

          {/* Operating Schedule (per-day) + Yearly Closures */}
          <section className="mt-4 border-t border-gray-700 pt-4">
            <div className="mt-4 border-t border-gray-700 pt-4">
              <label className="block text-sm text-gray-400 mb-2">Operating Schedule</label>
              <div className="grid grid-cols-1 gap-2">
                {["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"].map((day) => {
                  const key = day.toLowerCase();
                  const dayData = (form.days_open?.[key] as any) || { open: false, from: "", to: "" };
                  return (
                    <div
                      key={key}
                      className="grid grid-cols-5 items-center gap-2 bg-gray-800/60 border border-gray-700 rounded-md p-2"
                    >
                      <div className="text-gray-300 text-sm col-span-1">{day.slice(0,3)}</div>
                      <div className="col-span-1">
                        <input
                          type="checkbox"
                          checked={!!dayData.open}
                          onChange={(e) =>
                            setForm((prev) => {
                              const updatedDays = {
                                ...prev.days_open,
                                [key]: { ...dayData, open: e.target.checked },
                              };
                              return { ...prev, days_open: propagateDefaultTimes(updatedDays) };
                            })
                          }
                          className="accent-magenta-500 w-4 h-4"
                        />
                      </div>
                      <div className="col-span-1">
                        <div className="flex gap-1">
                          <select
                            className={`w-full bg-gray-800 border border-gray-700 rounded-md p-1 text-sm text-gray-200 ${
                              !dayData.open ? "opacity-40 cursor-not-allowed" : ""
                            }`}
                            disabled={!dayData.open}
                            value={splitHM(dayData.from).h}
                            onChange={(e) =>
                              setForm((prev) => {
                                const newHour = e.target.value;
                                const curMin = splitHM(dayData.from).m;
                                const combined = newHour && curMin ? `${newHour}:${curMin}` : "";
                                const updatedDays = {
                                  ...prev.days_open,
                                  [key]: { ...dayData, from: combined ? roundToQuarter(combined) : "" },
                                };
                                return { ...prev, days_open: propagateDefaultTimes(updatedDays) };
                              })
                            }
                          >
                            <option value="">HH</option>
                            {HOURS.map((h) => (
                              <option key={h} value={h}>{h}</option>
                            ))}
                          </select>
                          <select
                            className={`w-full bg-gray-800 border border-gray-700 rounded-md p-1 text-sm text-gray-200 ${
                              !dayData.open ? "opacity-40 cursor-not-allowed" : ""
                            }`}
                            disabled={!dayData.open}
                            value={splitHM(dayData.from).m}
                            onChange={(e) =>
                              setForm((prev) => {
                                const newMin = e.target.value;
                                const curHour = splitHM(dayData.from).h;
                                const combined = curHour && newMin ? `${curHour}:${newMin}` : "";
                                const updatedDays = {
                                  ...prev.days_open,
                                  [key]: { ...dayData, from: combined ? roundToQuarter(combined) : "" },
                                };
                                return { ...prev, days_open: propagateDefaultTimes(updatedDays) };
                              })
                            }
                          >
                            <option value="">MM</option>
                            {MINUTES.map((m) => (
                              <option key={m} value={m}>{m}</option>
                            ))}
                          </select>
                        </div>
                        {dayData.open && (!splitHM(dayData.from).h || !splitHM(dayData.from).m) && (
                          <p className="text-red-400 text-xs mt-1">Select hour and minutes</p>
                        )}
                      </div>
                      <div className="col-span-1">
                        <div className="flex gap-1">
                          <select
                            className={`w-full bg-gray-800 border border-gray-700 rounded-md p-1 text-sm text-gray-200 ${
                              !dayData.open ? "opacity-40 cursor-not-allowed" : ""
                            }`}
                            disabled={!dayData.open}
                            value={splitHM(dayData.to).h}
                            onChange={(e) =>
                              setForm((prev) => {
                                const newHour = e.target.value;
                                const curMin = splitHM(dayData.to).m;
                                const combined = newHour && curMin ? `${newHour}:${curMin}` : "";
                                const updatedDays = {
                                  ...prev.days_open,
                                  [key]: { ...dayData, to: combined ? roundToQuarter(combined) : "" },
                                };
                                return { ...prev, days_open: propagateDefaultTimes(updatedDays) };
                              })
                            }
                          >
                            <option value="">HH</option>
                            {HOURS.map((h) => (
                              <option key={h} value={h}>{h}</option>
                            ))}
                          </select>
                          <select
                            className={`w-full bg-gray-800 border border-gray-700 rounded-md p-1 text-sm text-gray-200 ${
                              !dayData.open ? "opacity-40 cursor-not-allowed" : ""
                            }`}
                            disabled={!dayData.open}
                            value={splitHM(dayData.to).m}
                            onChange={(e) =>
                              setForm((prev) => {
                                const newMin = e.target.value;
                                const curHour = splitHM(dayData.to).h;
                                const combined = curHour && newMin ? `${curHour}:${newMin}` : "";
                                const updatedDays = {
                                  ...prev.days_open,
                                  [key]: { ...dayData, to: combined ? roundToQuarter(combined) : "" },
                                };
                                return { ...prev, days_open: propagateDefaultTimes(updatedDays) };
                              })
                            }
                          >
                            <option value="">MM</option>
                            {MINUTES.map((m) => (
                              <option key={m} value={m}>{m}</option>
                            ))}
                          </select>
                        </div>
                        {dayData.open && (!splitHM(dayData.to).h || !splitHM(dayData.to).m) && (
                          <p className="text-red-400 text-xs mt-1">Select hour and minutes</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Yearly Closures with addable date ranges */}
            <div className="mb-4">
              <label className="block text-sm text-gray-400 mb-1">Yearly Closures</label>
              {(() => {
                const parsed = Array.isArray(form.yearly_closures)
                  ? form.yearly_closures
                  : (() => {
                      try {
                        return JSON.parse(form.yearly_closures || "[]");
                      } catch {
                        return [];
                      }
                    })();
                const ranges = parsed as Array<{ from: string | null; to: string | null }>; 
                return (
                  <div>
                    {(ranges || []).map((range, idx) => {
                      const fromDate = range?.from ? new Date(range.from) : null;
                      const toDate = range?.to ? new Date(range.to) : null;
                      return (
                        <div key={idx} className="flex items-center gap-2 mb-2">
                          <DatePicker
                            selected={fromDate}
                            onChange={(date: Date | null) =>
                              setForm((prev) => {
                                const current = Array.isArray(prev.yearly_closures)
                                  ? (prev.yearly_closures as any[])
                                  : (() => {
                                      try {
                                        return JSON.parse(prev.yearly_closures || "[]");
                                      } catch {
                                        return [];
                                      }
                                    })();
                                const updated = [...current];
                                updated[idx] = { ...updated[idx], from: date ? date.toISOString() : null };
                                return { ...prev, yearly_closures: updated };
                              })
                            }
                            placeholderText="From"
                            className="bg-gray-800 border border-gray-700 rounded-md p-2 text-gray-200"
                          />
                          <span className="text-gray-400">to</span>
                          <DatePicker
                            selected={toDate}
                            onChange={(date: Date | null) =>
                              setForm((prev) => {
                                const current = Array.isArray(prev.yearly_closures)
                                  ? (prev.yearly_closures as any[])
                                  : (() => {
                                      try {
                                        return JSON.parse(prev.yearly_closures || "[]");
                                      } catch {
                                        return [];
                                      }
                                    })();
                                const updated = [...current];
                                updated[idx] = { ...updated[idx], to: date ? date.toISOString() : null };
                                return { ...prev, yearly_closures: updated };
                              })
                            }
                            placeholderText="To"
                            className="bg-gray-800 border border-gray-700 rounded-md p-2 text-gray-200"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setForm((prev) => {
                                const current = Array.isArray(prev.yearly_closures)
                                  ? (prev.yearly_closures as any[])
                                  : (() => {
                                      try {
                                        return JSON.parse(prev.yearly_closures || "[]");
                                      } catch {
                                        return [];
                                      }
                                    })();
                                const updated = (current as any[]).filter((_: any, i: number) => i !== idx);
                                return { ...prev, yearly_closures: updated };
                              })
                            }
                            className="text-red-400 text-sm hover:text-red-300"
                          >
                            Remove
                          </button>
                        </div>
                      );
                    })}
                    <button
                      type="button"
                      onClick={() =>
                        setForm((prev) => {
                          const current = Array.isArray(prev.yearly_closures)
                            ? (prev.yearly_closures as any[])
                            : (() => {
                                try {
                                  return JSON.parse(prev.yearly_closures || "[]");
                                } catch {
                                  return [];
                                }
                              })();
                          const updated = [...current, { from: null, to: null }];
                          return { ...prev, yearly_closures: updated };
                        })
                      }
                      className="text-magenta-400 text-sm hover:text-magenta-300"
                    >
                      + Add closure
                    </button>
                  </div>
                );
              })()}
            </div>
          </section>

          {/* Render remaining fields except hidden and ones above */}
          {Object.keys(form)
            .filter((k) =>
              ![
                "id",
                "company_id",
                "created_at",
                "site_name",
                "name",
                "address_line1",
                "address_line2",
                "city",
                "postcode",
                "country",
                // Rendered via custom UI above
                "days_open",
                "opening_time_from",
                "opening_time_to",
                "yearly_closures",
              ].includes(k)
            )
            .map((key) => (
              <div key={key} className="mb-2">
                <label className="block text-sm text-gray-400 capitalize mb-1">
                  {key.replace(/_/g, " ")}
                </label>
                <input
                  type="text"
                  value={form[key] ?? ""}
                  onChange={(e) => setForm((prev) => ({ ...prev, [key]: e.target.value }))}
                  className="w-full bg-gray-800 text-gray-200 border border-gray-700 rounded-lg p-2"
                />
              </div>
            ))}

          <div className="flex justify-end gap-2 pt-3">
            <button
              onClick={handleCancel}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-md text-gray-300"
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-red-400 rounded-md"
            >
              Delete
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 bg-pink-500/20 hover:bg-pink-500/30 border border-pink-500/40 text-pink-300 rounded-md"
            >
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}