"use client";
import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import SetupLayout from "@/components/setup/SetupLayout";
import { AppContextProvider, useAppContext } from "@/context/AppContext";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/ui/ToastProvider";
import {
  mapCsvRows,
  CHECKLIST_TEMPLATE_HEADER_MAP,
  validateChecklistRows,
} from "@/lib/csv";

type ChecklistTemplate = {
  id?: string;
  company_id: string;
  name: string;
  day_part: "opening" | "service" | "close" | string;
  frequency: "daily" | "weekly" | "monthly" | string;
  role_required: string;
  category?: string | null;
  description?: string | null;
  active?: boolean;
};

const DAY_PART_TAGS: Record<string, { label: string; color: string }> = {
  opening: { label: "Opening", color: "#2563eb" },
  service: { label: "Service", color: "#f59e0b" },
  close: { label: "Close", color: "#6b7280" },
};

const STARTER_TEMPLATES: Omit<ChecklistTemplate, "company_id">[] = [
  {
    name: "Kitchen Opening Checks",
    day_part: "opening",
    frequency: "daily",
    role_required: "staff",
    category: "Food Safety",
    description: "Daily opening checks for kitchen readiness",
    active: true,
  },
  {
    name: "Front of House Pre-Service",
    day_part: "service",
    frequency: "daily",
    role_required: "staff",
    category: "General",
    description: "Ensure FOH is ready for service",
    active: true,
  },
  {
    name: "Close-down Routine",
    day_part: "close",
    frequency: "daily",
    role_required: "staff",
    category: "General",
    description: "End-of-day closing routine",
    active: true,
  },
];

function Tag({ part }: { part: string }) {
  const tag = DAY_PART_TAGS[part] || { label: part, color: "#9ca3af" };
  return (
    <span
      style={{
        backgroundColor: tag.color,
        color: "white",
        padding: "2px 8px",
        borderRadius: 12,
        fontSize: 12,
      }}
    >
      {tag.label}
    </span>
  );
}

function TemplateLibrary({
  companyId,
  onAdded,
}: {
  companyId: string;
  onAdded: () => void;
}) {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);

  const addTemplate = async (tmpl: Omit<ChecklistTemplate, "company_id">) => {
    setLoading(true);
    try {
      const insertPayload: ChecklistTemplate = {
        ...tmpl,
        company_id: companyId,
        active: true,
      };
      const { error } = await supabase
        .from("checklist_templates")
        .insert(insertPayload);
      if (error) throw error;

      await supabase.functions.invoke("clone_templates_to_sites", {
        body: { company_id: companyId },
      });
      showToast({ title: "Success", description: "Templates cloned to all sites.", type: "success" });
      onAdded();
    } catch (e: any) {
      showToast({ title: "Add failed", description: e?.message || "Failed to add starter template", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const addAll = async () => {
    setLoading(true);
    try {
      const payload = STARTER_TEMPLATES.map((t) => ({
        ...t,
        company_id: companyId,
        active: true,
      }));
      const { error } = await supabase.from("checklist_templates").insert(payload);
      if (error) throw error;
      await supabase.functions.invoke("clone_templates_to_sites", {
        body: { company_id: companyId },
      });
      showToast({ title: "Success", description: "Templates cloned to all sites.", type: "success" });
      onAdded();
    } catch (e: any) {
      showToast({ title: "Import failed", description: e?.message || "Failed to add starter templates", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ borderTop: "1px solid #e5e7eb", paddingTop: 16 }}>
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        {STARTER_TEMPLATES.map((t) => (
          <div
            key={t.name}
            style={{
              border: "1px solid #e5e7eb",
              borderRadius: 12,
              padding: 16,
              width: 280,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <strong>{t.name}</strong>
              <Tag part={t.day_part} />
            </div>
            <div style={{ marginTop: 8, fontSize: 12, color: "#6b7280" }}>
              {t.description}
            </div>
            <div style={{ marginTop: 12, fontSize: 12 }}>
              <span style={{ color: "#374151" }}>Frequency:</span> {t.frequency}
            </div>
            <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
              <button
                disabled={loading}
                onClick={() => addTemplate(t)}
                style={{
                  padding: "6px 10px",
                  borderRadius: 8,
                  background: "#111827",
                  color: "white",
                }}
              >
                Add
              </button>
              <button
                disabled={loading}
                onClick={addAll}
                style={{
                  padding: "6px 10px",
                  borderRadius: 8,
                  background: "#2563eb",
                  color: "white",
                }}
              >
                Add All
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CSVImporter({
  companyId,
  onAdded,
}: {
  companyId: string;
  onAdded: () => void;
}) {
  const { showToast } = useToast();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const hasRows = rows && rows.length > 0;

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const mapped = mapCsvRows(text, CHECKLIST_TEMPLATE_HEADER_MAP);
      const { valid, errors } = validateChecklistRows(mapped);
      if (!valid) {
        showToast({ title: "CSV invalid", description: errors?.[0]?.message || "Invalid rows", type: "error" });
        setRows([]);
        return;
      }
      setRows(mapped);
      showToast({ title: "CSV parsed", description: "Preview loaded.", type: "success" });
    } catch (err: any) {
      showToast({ title: "Read failed", description: err?.message || "Failed to read CSV", type: "error" });
    }
  };

  const save = async () => {
    if (!hasRows) return;
    setLoading(true);
    try {
      const payload: ChecklistTemplate[] = rows.map((r) => ({
        company_id: companyId,
        name: r.name,
        day_part: r.day_part,
        frequency: r.frequency,
        role_required: r.role_required,
        category: r.category || null,
        description: r.description || null,
        active: true,
      }));
      const { error } = await supabase.from("checklist_templates").insert(payload);
      if (error) throw error;
      await supabase.functions.invoke("clone_templates_to_sites", {
        body: { company_id: companyId },
      });
      showToast({ title: "Success", description: "Templates cloned to all sites.", type: "success" });
      onAdded();
      setRows([]);
    } catch (e: any) {
      showToast({ title: "Import failed", description: e?.message || "Failed to import CSV", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ borderTop: "1px solid #e5e7eb", paddingTop: 16 }}>
      <input type="file" accept="text/csv" onChange={onFile} />
      {hasRows && (
        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: 12, color: "#6b7280" }}>
            {rows.length} rows parsed
          </div>
          <button
            disabled={loading}
            onClick={save}
            style={{
              marginTop: 8,
              padding: "6px 10px",
              borderRadius: 8,
              background: "#2563eb",
              color: "white",
            }}
          >
            Import {rows.length} rows
          </button>
        </div>
      )}
    </div>
  );
}

function ChecklistBuilder({
  companyId,
  onAdded,
}: {
  companyId: string;
  onAdded: () => void;
}) {
  const { showToast } = useToast();
  const [form, setForm] = useState<ChecklistTemplate>({
    company_id: companyId,
    name: "",
    day_part: "opening",
    frequency: "daily",
    role_required: "staff",
    category: "General",
    description: "",
    active: true,
  });
  const [loading, setLoading] = useState(false);

  const update = (k: keyof ChecklistTemplate, v: any) =>
    setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    if (!form.name || !form.day_part || !form.frequency || !form.role_required) {
      showToast({ title: "Missing fields", description: "Please complete required fields", type: "error" });
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.from("checklist_templates").insert(form);
      if (error) throw error;
      await supabase.functions.invoke("clone_templates_to_sites", {
        body: { company_id: companyId },
      });
      showToast({ title: "Success", description: "Templates cloned to all sites.", type: "success" });
      onAdded();
      setForm({
        company_id: companyId,
        name: "",
        day_part: "opening",
        frequency: "daily",
        role_required: "staff",
        category: "General",
        description: "",
        active: true,
      });
    } catch (e: any) {
      showToast({ title: "Save failed", description: e?.message || "Failed to save checklist", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ borderTop: "1px solid #e5e7eb", paddingTop: 16 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div>
          <label>Name *</label>
          <input
            value={form.name}
            onChange={(e) => update("name", e.target.value)}
            placeholder="Checklist Name"
            style={{ width: "100%", padding: 8, border: "1px solid #e5e7eb", borderRadius: 8 }}
          />
        </div>
        <div>
          <label>Day Part *</label>
          <select
            value={form.day_part}
            onChange={(e) => update("day_part", e.target.value)}
            style={{ width: "100%", padding: 8, border: "1px solid #e5e7eb", borderRadius: 8 }}
          >
            <option value="opening">Opening</option>
            <option value="service">Service</option>
            <option value="close">Close</option>
          </select>
        </div>
        <div>
          <label>Frequency *</label>
          <select
            value={form.frequency}
            onChange={(e) => update("frequency", e.target.value)}
            style={{ width: "100%", padding: 8, border: "1px solid #e5e7eb", borderRadius: 8 }}
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
        </div>
        <div>
          <label>Role Required *</label>
          <select
            value={form.role_required}
            onChange={(e) => update("role_required", e.target.value)}
            style={{ width: "100%", padding: 8, border: "1px solid #e5e7eb", borderRadius: 8 }}
          >
            <option value="Staff">Staff</option>
            <option value="Manager">Manager</option>
          </select>
        </div>
        <div>
          <label>Category</label>
          <input
            value={form.category || ""}
            onChange={(e) => update("category", e.target.value)}
            placeholder="General, Food Safety, etc."
            style={{ width: "100%", padding: 8, border: "1px solid #e5e7eb", borderRadius: 8 }}
          />
        </div>
        <div style={{ gridColumn: "1 / span 2" }}>
          <label>Description</label>
          <textarea
            value={form.description || ""}
            onChange={(e) => update("description", e.target.value)}
            placeholder="Optional description"
            rows={3}
            style={{ width: "100%", padding: 8, border: "1px solid #e5e7eb", borderRadius: 8 }}
          />
        </div>
      </div>
      <button
        disabled={loading}
        onClick={save}
        style={{
          marginTop: 12,
          padding: "8px 12px",
          borderRadius: 8,
          background: "#111827",
          color: "white",
        }}
      >
        Save Checklist
      </button>
    </div>
  );
}

function TemplateList({
  companyId,
  templates,
  onChanged,
}: {
  companyId: string;
  templates: ChecklistTemplate[];
  onChanged: () => void;
}) {
  const { showToast } = useToast();
  const [savingId, setSavingId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, Partial<ChecklistTemplate>>>({});

  const updateDraft = (id: string, k: keyof ChecklistTemplate, v: any) =>
    setDrafts((d) => ({ ...d, [id]: { ...(d[id] || {}), [k]: v } }));

  const saveRow = async (t: ChecklistTemplate) => {
    if (!t.id) return;
    setSavingId(t.id);
    try {
      const patch = drafts[t.id] || {};
      if (Object.keys(patch).length === 0) return;
      const { error } = await supabase
        .from("checklist_templates")
        .update(patch)
        .eq("id", t.id)
        .eq("company_id", companyId);
      if (error) throw error;
      showToast({ title: "Updated", description: "Template updated", type: "success" });
      onChanged();
    } catch (e: any) {
      showToast({ title: "Update failed", description: e?.message || "Failed to update", type: "error" });
    } finally {
      setSavingId(null);
    }
  };

  const deleteRow = async (t: ChecklistTemplate) => {
    if (!t.id) return;
    if (!confirm(`Delete template "${t.name}"?`)) return;
    try {
      const { error } = await supabase
        .from("checklist_templates")
        .delete()
        .eq("id", t.id)
        .eq("company_id", companyId);
      if (error) throw error;
      showToast({ title: "Deleted", description: "Template deleted", type: "success" });
      onChanged();
    } catch (e: any) {
      showToast({ title: "Delete failed", description: e?.message || "Failed to delete", type: "error" });
    }
  };

  return (
    <div style={{ marginTop: 16 }}>
      <div style={{
        display: "grid",
        gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 160px",
        gap: 8,
        padding: 8,
        borderBottom: "1px solid #e5e7eb",
        fontWeight: 600,
      }}>
        <div>Checklist Name</div>
        <div>Day Part</div>
        <div>Frequency</div>
        <div>Role</div>
        <div>Category</div>
        <div>Actions</div>
      </div>
      {templates.map((t) => (
        <div
          key={t.id || t.name}
          style={{
            display: "grid",
            gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 160px",
            gap: 8,
            padding: 8,
            borderBottom: "1px solid #f3f4f6",
            alignItems: "center",
          }}
        >
          <div>{t.name}</div>
          <div>
            <select
              defaultValue={t.day_part}
              onChange={(e) => updateDraft(t.id as string, "day_part", e.target.value)}
            >
              <option value="opening">Opening</option>
              <option value="service">Service</option>
              <option value="close">Close</option>
            </select>
          </div>
          <div>
            <select
              defaultValue={t.frequency}
              onChange={(e) => updateDraft(t.id as string, "frequency", e.target.value)}
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>
          <div>
            <select
              defaultValue={t.role_required}
              onChange={(e) => updateDraft(t.id as string, "role_required", e.target.value)}
            >
              <option value="Staff">Staff</option>
              <option value="Manager">Manager</option>
            </select>
          </div>
          <div>
            <input
              defaultValue={t.category || ""}
              onChange={(e) => updateDraft(t.id as string, "category", e.target.value)}
            />
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => saveRow(t)}
              disabled={savingId === t.id}
              style={{ padding: "6px 10px", borderRadius: 8, background: "#111827", color: "white" }}
            >
              Save
            </button>
            <button
              onClick={() => deleteRow(t)}
              style={{ padding: "6px 10px", borderRadius: 8, background: "#ef4444", color: "white" }}
            >
              Delete
            </button>
          </div>
        </div>
      ))}
      <div style={{ marginTop: 12, fontSize: 12, color: "#6b7280" }}>
        {templates.length} template{templates.length === 1 ? "" : "s"} added
      </div>
    </div>
  );
}

function LibraryImport({ companyId, onImported }: { companyId: string; onImported: () => void }) {
  const { siteId } = useAppContext();
  const { showToast } = useToast();
  const [items, setItems] = useState<any[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | "all">("all");
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      if (!companyId) return;
      const { data, error } = await supabase
        .from("task_library")
        .select("id,name,category,daypart,role_required")
        .eq("company_id", companyId);
      if (error) {
        showToast({ title: "Load failed", description: error.message, type: "error" });
        return;
      }
      const rows = data || [];
      setItems(rows);
      const cats = Array.from(new Set(rows.map((x: any) => x.category).filter(Boolean))).sort();
      setCategories(cats);
    })();
  }, [companyId]);

  const importSelected = async () => {
    if (!selected) {
      showToast({ title: "Pick a library item", description: "Select an item to import", type: "error" });
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.functions.invoke("import_task_library", {
        body: { library_id: selected, company_id: companyId, site_id: siteId },
      });
      if (error) throw error;
      showToast({ title: "Imported", description: "Template added from library", type: "success" });
      onImported();
    } catch (e: any) {
      showToast({ title: "Import failed", description: e?.message || "Failed to import", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 12, marginBottom: 12 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <p style={{ fontWeight: 600 }}>Import from Task Library</p>
          <p style={{ fontSize: 12, color: "#6b7280" }}>Uses your current site selection{siteId ? ` (${siteId})` : " (none)"}.</p>
        </div>
        <button
          type="button"
          onClick={importSelected}
          disabled={!selected || loading}
          style={{ padding: "6px 10px", borderRadius: 8, background: !selected || loading ? "#e5e7eb" : "#2563eb", color: !selected || loading ? "#111827" : "white" }}
        >
          {loading ? "Importing..." : "Import Selected"}
        </button>
      </div>
      {categories.length > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
          <label htmlFor="lib-category" style={{ fontSize: 12, color: "#374151" }}>Category:</label>
          <select
            id="lib-category"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            style={{ padding: 6, borderRadius: 8, border: "1px solid #e5e7eb" }}
          >
            <option value="all">All</option>
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      )}
      <ul style={{ marginTop: 8, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        {items.length === 0 ? (
          <li style={{ fontSize: 12, color: "#6b7280" }}>No library items found.</li>
        ) : (
          items
            .filter((it) => selectedCategory === "all" || (it.category || "") === selectedCategory)
            .map((it) => (
            <li key={it.id} style={{ display: "flex", alignItems: "center", gap: 8, border: "1px solid #f3f4f6", borderRadius: 8, padding: 8 }}>
              <input type="radio" name="library" checked={selected === it.id} onChange={() => setSelected(it.id)} />
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 14, fontWeight: 500, color: "#111827" }}>{it.name}</p>
                <p style={{ fontSize: 12, color: "#6b7280" }}>{it.category || "General"} · {it.daypart || "unspecified"} · {it.role_required || "staff"}</p>
              </div>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}

function ChecklistContent() {
  const router = useRouter();
  const { companyId } = useAppContext();
  const { showToast } = useToast();
  const [templates, setTemplates] = useState<ChecklistTemplate[]>([]);
  const [mode, setMode] = useState<"starter" | "csv" | "create">("starter");
  const canNext = useMemo(() => templates.filter((t) => t.active !== false).length > 0, [templates]);

  const loadTemplates = async () => {
    if (!companyId) return;
    const { data, error } = await supabase
      .from("checklist_templates")
      .select("*")
      .eq("company_id", companyId)
      .eq("active", true);
    if (error) {
      showToast({ title: "Load failed", description: error.message, type: "error" });
      return;
    }
    setTemplates(data || []);
  };

  useEffect(() => {
    loadTemplates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId]);

  const goBack = () => router.push("/setup/team");

  const goNext = async () => {
    if (!canNext) {
      showToast({ title: "Validation", description: "Add at least one active checklist to continue", type: "error" });
      return;
    }
    try {
      const res = await fetch("/api/company/setup-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId, status: "checklists_added" }),
      });
      if (!res.ok) throw new Error("Failed to update setup status");
      router.push("/setup/equipment");
    } catch (e: any) {
      showToast({ title: "Next failed", description: e?.message || "Failed to continue", type: "error" });
    }
  };

  return (
    <>
      {companyId && (
        <LibraryImport companyId={companyId!} onImported={loadTemplates} />
      )}
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <button
          onClick={() => setMode("starter")}
          style={{ padding: "6px 10px", borderRadius: 8, background: mode === "starter" ? "#2563eb" : "#e5e7eb", color: mode === "starter" ? "white" : "#111827" }}
        >
          Starter Templates
        </button>
        <button
          onClick={() => setMode("csv")}
          style={{ padding: "6px 10px", borderRadius: 8, background: mode === "csv" ? "#2563eb" : "#e5e7eb", color: mode === "csv" ? "white" : "#111827" }}
        >
          Import via CSV
        </button>
        <button
          onClick={() => setMode("create")}
          style={{ padding: "6px 10px", borderRadius: 8, background: mode === "create" ? "#2563eb" : "#e5e7eb", color: mode === "create" ? "white" : "#111827" }}
        >
          Build Manually
        </button>
      </div>

      {mode === "starter" && (
        <TemplateLibrary companyId={companyId!} onAdded={loadTemplates} />
      )}
      {mode === "csv" && <CSVImporter companyId={companyId!} onAdded={loadTemplates} />}
      {mode === "create" && (
        <ChecklistBuilder companyId={companyId!} onAdded={loadTemplates} />
      )}

      <div style={{ marginTop: 24 }}>
        <h3 style={{ fontWeight: 600 }}>Templates</h3>
        <TemplateList companyId={companyId!} templates={templates} onChanged={loadTemplates} />
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 24 }}>
        <button
          onClick={goBack}
          style={{ padding: "8px 14px", borderRadius: 8, background: "#e5e7eb", color: "#111827" }}
        >
          Back
        </button>
        <button
          onClick={goNext}
          disabled={!canNext}
          style={{ padding: "8px 14px", borderRadius: 8, background: !canNext ? "#9ca3af" : "#2563eb", color: "white", opacity: !canNext ? 0.7 : 1 }}
        >
          Next
        </button>
      </div>
    </>
  );
}

export default function ChecklistsPage() {
  return (
    <AppContextProvider>
      <SetupLayout stepLabel="Step 4 of 5">
        <ChecklistContent />
      </SetupLayout>
    </AppContextProvider>
  );
}