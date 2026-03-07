# SALSA Compliance Analysis

**Safe and Local Supplier Approval — Impact Assessment for Opsly Platform**

|                |                     |
| -------------- | ------------------- |
| Prepared for   | Okja Onboarding     |
| Date           | February 2026       |
| SALSA Standard | Issue 6 (June 2022) |
| Status         | CONFIDENTIAL        |

---

## 1. What is SALSA?

SALSA (Safe and Local Supplier Approval) is the UK's leading food safety certification scheme for small and micro food producers. It was created by the Food & Drink Federation (FDF), National Farmers' Union (NFU), and UK Hospitality, and is accredited by the Institute of Food Science & Technology (IFST).

SALSA certification proves to buyers — including major retailers like Ocado, Asda, and food service providers like Centre Parcs — that a supplier produces safe, legal food to standards that exceed minimum enforcement requirements.

### Who needs SALSA?

- UK-based food and drink producers/suppliers
- Operating from commercial (not domestic) premises
- Between 1–50 full-time employees
- Under £10 million turnover
- Businesses wanting to supply retailers, wholesalers, or food service companies

For Okja, SALSA certification means tighter controls on production traceability, batch management, and documentation — exactly what Ben described with the batch sizes, expiry dates, and traceability requirements.

---

## 2. SALSA Standard Structure (Issue 6)

The SALSA standard is divided into five core sections, each assessed during an annual on-site audit. Here's how each section maps to Opsly:

| Section                        | Scope                                                                                                         | Opsly Module               | Status                                                                                                                                                                                          |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------- | -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. Prerequisite Controls       | Premises, hygiene, temperature monitoring, cleaning, pest control, allergen management, labelling, shelf-life | Checkly + Stockly          | **Strong** — temperature monitoring is production-grade (logs, breach actions, probe calibration). Cleaning fully templated. 14 UK allergens tracked. Labelling is the main gap.                |
| 2. HACCP                       | Hazard analysis, CCPs, monitoring, corrective actions, verification                                           | Checkly                    | **Partial** — CCP handled through task templates with `is_critical` flags and temperature thresholds, but no standalone HACCP plan builder. Sufficient for SALSA.                               |
| 3. Management Systems          | Training, non-conformance, traceability, recall, document control, specifications                             | Checkly + Teamly + Stockly | **Strong** — training records + compliance matrix + cert expiry tracking fully built. SOPs have version control. Incident tracking covers 4 types with auto-follow-up. Traceability is the gap. |
| 4. Good Manufacturing Practice | Process control, calibration, metal detection, quantity control                                               | Planly + Assetly           | **Partial** — probe calibration exists (task-based). PPM scheduling fully built. No production batch records or process control logging.                                                        |
| 5. Supplier Approval           | Supplier risk assessment, specifications, goods-in checks, food fraud                                         | Stockly                    | **Weak** — only an `is_approved` boolean on suppliers. No approval workflow, risk rating, review dates, or certificate storage.                                                                 |

---

## 3. Traceability Requirements (The Big One for Okja)

This is the area Ben flagged as the main driver for needing SALSA compliance. The SALSA standard requires full forwards and backwards traceability across all production stages.

### What SALSA requires

- Identify and trace ALL raw materials (including packaging) from supplier through all production stages to dispatch/delivery
- Trace forwards: raw material → which batches used it → which customers received those batches
- Trace backwards: customer complaint → which batch → which raw materials went into it → which supplier
- Test traceability both ways at least annually (mock recall exercise)
- Records must be retained for shelf-life of product plus one year

### Data required at each stage

| Stage               | Required Data                                                             |
| ------------------- | ------------------------------------------------------------------------- |
| Raw Material Intake | Material name, date, time, temperature, batch code, supplier, quantity    |
| Packaging Intake    | Packaging type, batch code, supplier                                      |
| In-Process Batches  | Ingredients mixed (inc. rework), batch code, quantities                   |
| Production Records  | Batch code, product, time, date, label, expiry code, temperature          |
| Storage Records     | Product, time, date, label, expiry code, temperature                      |
| Dispatch Records    | Product, customer & location, time, date, label, expiry code, temperature |

This is where Stockly and Planly intersect — the batch tracking needs to flow seamlessly from stock intake through production to dispatch.

**Current state:** Zero batch/lot tracking exists anywhere in the codebase. No batch codes on stock items, delivery lines, production records, or waste logs. This is the single biggest gap.

---

## 4. Opsly Gap Analysis vs SALSA Requirements

The table below maps every key SALSA requirement against what Opsly currently has, what needs updating, and what needs building from scratch.

| SALSA Requirement                        | Opsly Status  | What's Needed                                                                                                                                                                                                                                               | Module           |
| ---------------------------------------- | ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- |
| Batch code tracking on all raw materials | **New Build** | Batch code field on delivery lines + stock batches, auto-generation option                                                                                                                                                                                  | Stockly          |
| Batch-to-product traceability            | **New Build** | Link raw material batches to production batches via recipes/orders                                                                                                                                                                                          | Stockly + Planly |
| Forwards/backwards trace                 | **New Build** | Trace report: input a batch code, see full chain in both directions                                                                                                                                                                                         | Stockly          |
| Expiry date tracking                     | **New Build** | Expiry/best-before per batch on delivery lines, alerts for approaching expiry                                                                                                                                                                               | Stockly          |
| Stock rotation (FIFO)                    | **New Build** | Enforce FIFO via batch expiry dates, flag oldest stock for use first. Note: `costing_method` has a `fifo` option but zero stock layer implementation exists                                                                                                 | Stockly          |
| Production batch records                 | **New Build** | Production log per batch: recipe used, batch code assigned, quantities, temperatures, time                                                                                                                                                                  | Planly           |
| Supplier approval procedure              | **New Build** | Add approval status, risk rating, review date to supplier records. Currently only an `is_approved` boolean exists                                                                                                                                           | Stockly          |
| Raw material specifications              | **New Build** | Spec documents per stock item: allergens, storage conditions, shelf-life                                                                                                                                                                                    | Stockly          |
| Goods-in checks                          | **Partial**   | Delivery lines already have rejection tracking (reasons incl. temperature breach, quality issue, damaged), rejection notes, and rejection photo capture. Need to add: discrete temperature reading field, condition assessment, supplier batch code capture | Stockly          |
| Food fraud risk assessment               | **New Build** | Annual risk assessment per raw material — use existing Checkly compliance template system                                                                                                                                                                   | Checkly          |
| Temperature monitoring                   | **Existing**  | Production-grade: temperature logs with breach workflow, probe calibration, sparklines, min/max reference lines, EHO reporting. Ensure logs include equipment ID and batch association                                                                      | Checkly          |
| Cleaning schedules & records             | **Existing**  | Fully built in Checkly task template system with 25+ compliance templates                                                                                                                                                                                   | Checkly          |
| Allergen management                      | **Partial**   | 14 UK allergens already tracked on `stock_items` and `ingredients_library` (TEXT[]). EHO allergen report function exists. Gap: allergen tracking per batch/delivery and cross-contamination flagging in recipes                                             | Stockly + Planly |
| Calibration records                      | **Partial**   | Probe calibration template creates monthly tasks linked to assets. Gap: no dedicated calibration certificate store per asset                                                                                                                                | Assetly          |
| Staff training records                   | **Existing**  | One of the strongest modules: training courses, records, compliance matrix, certification expiry tracking, renewal reminders, 5 certification categories, competency sections in performance reviews                                                        | Teamly           |
| Document control                         | **Existing**  | SOPs have full version control (ref_code versioning), Draft/Published/Archived status, 8 category templates, AI generation. Gap: retention policy enforcement (shelf-life + 1 year auto-archiving)                                                          | Checkly          |
| Non-conformance management               | **Existing**  | Incidents system covers 4 types (accidents, food poisoning, complaints, staff sickness) with auto-follow-up task generation, PDF export, and EHO reporting. Gap: formal root cause analysis fields and corrective action closure tracking                   | Checkly          |
| Recall/withdrawal procedure              | **New Build** | Extend existing incidents system with a "Recall" incident type. Auto-identify affected batches and customers, communication log, SALSA notification reminder (3 working days), corrective action tracking                                                   | Stockly + Planly |
| Annual food safety review                | **New Build** | Scheduled annual review template covering all SALSA sections — use existing compliance template system                                                                                                                                                      | Checkly          |
| Shelf-life validation                    | **New Build** | Record shelf-life testing per product, link to specifications                                                                                                                                                                                               | Stockly + Planly |
| Labelling control                        | **New Build** | Label verification procedure + integration with batch label printer API. Checklist ensuring correct label applied per batch                                                                                                                                 | Planly + Checkly |

---

## 5. Implementation Priorities for Stockly

Based on the gap analysis, here are the features needed in Stockly, ranked by importance for SALSA compliance:

### Priority 1: Batch Tracking System (Critical)

This is the single biggest gap and the core of what Ben needs.

- Add `batch_code` and `expiry_date` fields to `delivery_lines` — each delivery line IS a batch receipt
- Auto-generate batch codes with configurable format (e.g., OKJA-2026-0218-001)
- Create a `stock_batches` table to track batch lifecycle (creation, depletion, expiry)
- Track batch depletion as stock is used in production or wasted
- FIFO enforcement: flag when older batches exist and newer ones are being used
- Expiry alerts: configurable warnings (e.g., 7 days, 3 days, expired) — `expiry_warning_days` setting already exists
- **Batch label printing**: integrate with Ben's batch label printer API to print labels on receipt

**Estimate: 3–4 days**

### Priority 2: Enhanced Goods-In Process

The delivery workflow already has:

- Two entry methods (AI invoice upload + manual entry)
- Rejection tracking with reasons (including temperature breach, expired, quality issue, damaged), notes, and photo capture
- Price change detection and accept/reject per line
- Delivery note number, invoice number capture

What's needed on top of the existing workflow:

- `temperature_reading` field on delivery lines (numeric, for chilled/frozen goods)
- `condition_assessment` field (structured: packaging integrity, pest signs, cleanliness)
- `supplier_batch_code` field (capture the supplier's batch code from their label)
- Validation rules: require temperature reading for chilled/frozen categories

**Estimate: 0.5–1 day** (schema addition + form field updates, not a new workflow)

### Priority 3: Supplier Approval Management

- Add `approval_status` enum to suppliers: Approved / Conditional / Suspended / New
- Add `risk_rating`: Low / Medium / High (based on product type and history)
- Add `next_review_date` with auto-reminders
- Document storage per supplier: certificates, specs, insurance docs (reuse existing document storage pattern from Teamly's `EmployeeDocument` system)
- Approved supplier list report (auditor will request this)

**Estimate: 1 day**

### Priority 4: Product Specifications

- Specification record per finished product: ingredients, allergens, storage conditions, shelf-life
- Raw material specifications: link supplier specs to stock items
- Version control on specs with review dates (reuse SOP versioning pattern)

**Estimate: 1.5 days**

### Priority 5: Traceability Reports

This is the most complex feature. The forward/backward trace requires traversing the full chain:

**Forward trace:** raw material batch → delivery_line → stock_item → recipe → production_order → planly_order → planly_customer

**Backward trace:** finished product batch → production_order → recipe → stock_items consumed → delivery_lines → supplier batches

- Forward trace: select a raw material batch → show all production batches and customers
- Backward trace: select a finished product batch → show all raw material batches and suppliers
- Mass balance report: quantities in vs quantities out per batch (the auditor will test this)
- Mock recall report: one-click generation for annual testing
- Usable UI with clear visualisation of the trace chain

**Estimate: 4–5 days** (including UI, edge cases, and testing with real data)

### Priority 6: Recall/Withdrawal Workflow

Extend the existing incidents system rather than building from scratch:

- Add "Recall" as a new incident type (alongside accidents, food poisoning, complaints, sickness)
- Leverage existing auto-follow-up task generation
- Incident trigger — log the issue, affected batch(es), severity
- Auto-identify affected customers from dispatch records (requires traceability chain)
- Communication log: who was notified, when, response received
- SALSA notification reminder (must notify within 3 working days)
- Corrective action tracking and closure

**Estimate: 1–1.5 days** (leveraging existing incidents infrastructure)

### Priority 7: Batch Label Printer Integration

Ben has already purchased a batch label printer with an API.

- Get printer API documentation from Ben
- Build label template system: batch code, product name, expiry date, allergens, production date
- Auto-print on batch creation (goods-in receipt or production batch)
- Manual reprint option for damaged/lost labels
- Label verification step in production workflow

**Estimate: 1–2 days** (dependent on printer API complexity)

---

## 6. Planly Implications

The Planly module has significant existing infrastructure that supports SALSA compliance:

**What already exists and helps:**

- **Process templates with multi-day stages** — production batch records can attach to existing stage execution
- **Daily production worksheet** — already shows what's being produced daily, add batch code generation here
- **Mix sheet** — already calculates ingredient quantities per recipe, add batch input tracking here
- **Delivery notes** — already generated per customer with product quantities, add batch codes to line items
- **Recipe → ingredient linkage** — exists via `recipe_ingredients` view, this is the basis for traceability

**What needs building on top:**

- Production batch record per run: recipe, batch code, start/end time, operator, temperatures
- Link input batches (raw materials consumed) to output batch (finished product)
- Record quantities at each stage for mass balance
- Rework tracking: if production waste is reused, it must remain traceable
- CCP monitoring integration: record critical control point measurements during production (e.g., cooking temperature, cooling time) — CCP `is_critical` flags already exist in the SOP template system
- Label verification step: integrate with batch label printer to confirm correct label applied before dispatch

Many of these can be implemented as required fields on the existing production order workflow rather than entirely new features.

---

## 7. Checkly & Teamly Additions

### Checkly additions

| Addition                                                 | Status               | Notes                                                                                                                                               |
| -------------------------------------------------------- | -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| HACCP plan template                                      | **New**              | Implement as a specialised SOP template type with hazard identification, risk assessment, CCP definition, monitoring procedures, corrective actions |
| Food fraud risk assessment template                      | **New**              | Annual, per raw material — use existing compliance template system                                                                                  |
| Annual food safety review template                       | **New**              | Template covering all 5 SALSA sections — use existing compliance template system                                                                    |
| Non-conformance register with corrective action tracking | **Extend existing**  | Incidents system already covers 4 types with auto-follow-up. Add root cause analysis fields and corrective action closure tracking                  |
| Incident/recall procedure template                       | **Extend existing**  | Add "Recall" incident type to existing system                                                                                                       |
| Internal audit schedule and records                      | **Already possible** | Create as a recurring audit task template in the existing system                                                                                    |

### Teamly additions

| Addition                          | Status               | Notes                                                                                                               |
| --------------------------------- | -------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Food safety training matrix       | **Already exists**   | Compliance matrix view at `/dashboard/people/training/matrix` — shows employee x course grid with compliance status |
| Competency assessment records     | **Extend existing**  | Review templates have a `competencies` section type — expand for food safety competency assessments                 |
| Refresher training scheduling     | **Already exists**   | `renewal_required`, `renewal_period_months`, `renewal_reminder_days` on training courses with auto-reminders        |
| Temporary staff induction records | **Already possible** | Use existing staff onboarding/document system                                                                       |
| Training record retention         | **Minor addition**   | Records exist — add retention policy enforcement (shelf-life + 1 year)                                              |

---

## 8. Estimated Build Effort

Revised estimates based on detailed codebase audit, accounting for existing infrastructure that can be leveraged:

| Feature                         | Module            | Effort     | Priority                     | Notes                                               |
| ------------------------------- | ----------------- | ---------- | ---------------------------- | --------------------------------------------------- |
| Batch tracking system (core)    | Stockly           | 3–4 days   | Critical — blocks everything | Foundational feature                                |
| Enhanced goods-in process       | Stockly           | 0.5–1 day  | Critical — audit requirement | Most workflow exists, adding fields                 |
| Supplier approval fields        | Stockly           | 1 day      | High — auditor checks list   | New fields + approval workflow                      |
| Product specifications          | Stockly           | 1.5 days   | High                         | Reuse ingredients_library pattern                   |
| Expiry date tracking + alerts   | Stockly           | 1–1.5 days | High — FIFO enforcement      | Setting already exists, add date field + cron       |
| Traceability reports            | Stockly           | 4–5 days   | Critical — mock recall       | Complex: forward/backward trace + mass balance + UI |
| Recall/withdrawal workflow      | Stockly + Checkly | 1–1.5 days | Medium — procedure first     | Extend existing incidents system                    |
| Allergen cross-contamination    | Stockly + Planly  | 1 day      | High — Natasha's Law         | Base allergens exist, add recipe-level flagging     |
| Production batch records        | Planly            | 2–3 days   | Critical — links to trace    | Integrate with existing process templates           |
| Batch label printer integration | Planly + Stockly  | 1–2 days   | High — physical workflow     | Dependent on printer API                            |
| HACCP + compliance templates    | Checkly           | 1 day      | Medium — can be manual first | Use existing template system                        |
| Calibration tracking            | Assetly           | 0.5 day    | Low — minor addition         | Add certificate store to existing task-based system |
| Root cause + corrective actions | Checkly           | 0.5 day    | Medium                       | Add fields to existing incidents                    |

**Total estimated effort: 18–24 days of development**

**Recommended approach:** Build batch tracking core first (it underpins traceability, recall, and production records), then layer the other features on top. Get the label printer API docs early so integration can happen in parallel.

---

## 9. Why This Matters for Opsly

Building SALSA compliance into Stockly and Planly creates significant competitive differentiation:

- **No competitor in the small producer space** offers unified compliance + inventory + production with built-in SALSA traceability
- **Trail** handles task compliance but has zero batch tracking or traceability
- **NotaZone** focuses on traceability only — no compliance, no rotas, no asset management
- **SALSA-ready features** make Opsly immediately relevant to the 4,000+ SALSA-certified UK producers
- **BRCGS stepping stone** — SALSA is explicitly designed as a pathway to BRCGS certification, positioning Opsly for growth

This also aligns perfectly with Okja's needs as a first beta customer — they're telling you exactly what features they need to run their business. If Opsly solves SALSA compliance for one food producer, it solves it for all of them.

---

## 10. Recommended Next Steps

1. **Confirm with Ben** which SALSA sections Okja is weakest on — prioritise those features first
2. **Get the batch label printer API documentation** from Ben — this integration should be planned from day one so batch tracking is a physical workflow, not just digital record-keeping
3. **Add SALSA-specific fields** to the onboarding email (equipment with nicknames, batch code formats, current traceability method)
4. **Build batch tracking** into Stockly as the foundational feature
5. **Integrate batch label printing** alongside batch creation workflow
6. **Ensure Planly production orders** integrate with batch system before beta
7. **Create a "SALSA Ready" compliance checklist** in Checkly as a template
8. **Run a mock traceability test** with Okja's data once batch tracking is live

---

## Appendix: Current Opsly Module Strengths (for Audit Conversations)

When discussing SALSA readiness with auditors or prospects, these are the features you can confidently demonstrate today:

| Area                   | What Exists                                                                            | SALSA Relevance                       |
| ---------------------- | -------------------------------------------------------------------------------------- | ------------------------------------- |
| Temperature monitoring | Logs, breach actions, probe calibration, sparklines, EHO reporting                     | Section 1 & 2 — CCP monitoring        |
| Cleaning schedules     | 25+ compliance templates, task scheduling, evidence capture                            | Section 1 — prerequisite controls     |
| Training management    | Courses, records, compliance matrix, cert expiry, renewal reminders, 5 cert categories | Section 3 — staff competence          |
| SOP management         | Version control, 8 category templates, AI generation, Draft/Published/Archived         | Section 3 — document control          |
| Incident management    | 4 types, auto-follow-up tasks, PDF export, EHO reporting                               | Section 3 — non-conformance           |
| Risk assessments       | General + COSHH, hazard scoring, versioning, AI generation                             | Section 2 — hazard analysis           |
| Equipment maintenance  | PPM scheduling, contractor management, callout system, compliance reports              | Section 4 — calibration & maintenance |
| Allergen tracking      | 14 UK allergens on all stock items, EHO allergen report                                | Section 1 — allergen management       |
| Delivery management    | AI invoice processing, rejection tracking with photos, price change detection          | Section 5 — goods-in (partial)        |
