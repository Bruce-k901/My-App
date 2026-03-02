import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer';
import { formatUKDate, formatDateWithDay } from '../components/PDFStyles';

// ─── Types ───────────────────────────────────────────────────────────────

export interface PackingProduct {
  name: string;
  bg: string;
  quantities: { customer: string; qty: number; isFrozen?: boolean }[];
  total: number;
}

export interface PackingData {
  customers: string[];
  products: PackingProduct[];
  colTotals: { customer: string; total: number }[];
  grand: number;
}

export interface DoughSheetStyle {
  style_name: string;
  base_dough_name: string;
  sheets_needed: number;
  total_products: number;
}

export interface DoughSheetData {
  by_style: DoughSheetStyle[];
  total_sheets: number;
}

export interface CookieItem {
  name: string;
  qty: number;
}

export interface DoughMixIngredient {
  name: string;
  quantity: number;
  unit: string;
}

export interface DoughMixData {
  dough_name: string;
  total_kg: number;
  ingredients: DoughMixIngredient[];
}

export interface TrayGridProduct {
  name: string;
  bg: string;
  trayQuantities: { trayNum: number; qty: number }[];
}

export interface TrayGridData {
  name: string;
  dispatch?: string;
  trayNums: number[];
  products: TrayGridProduct[];
  totalItems: number;
}

export interface XCheckProduct {
  name: string;
  bg: string;
  destQuantities: { dest: string; qty: number }[];
  total: number;
}

export interface XCheckData {
  dests: string[];
  products: XCheckProduct[];
  grand: number;
}

export interface FrozenPackCustomer {
  name: string;
  products: { name: string; qty: number }[];
  total: number;
}

export interface FrozenPackStage {
  stage: string;
  customers: FrozenPackCustomer[];
}

export interface FrozenPackData {
  stages?: FrozenPackStage[] | null;
  fallbackCustomers?: { customer: string; products: { name: string; qty: number }[]; total: number }[] | null;
  totalItems: number;
}

export interface ProductionPlanPDFProps {
  siteName: string;
  date: string;
  dateLabels?: {
    today: string;
    tomorrow: string;
    dayAfter: string;
  };
  packing?: PackingData | null;
  frozenPack?: FrozenPackData | null;
  doughSheets?: DoughSheetData | null;
  cookies?: CookieItem[] | null;
  doughMix?: DoughMixData[] | null;
  trayGrids?: TrayGridData[] | null;
  xcheck?: XCheckData | null;
}

// Re-export for backwards compatibility
export interface ProductionPlanSection {
  name: string;
  items: {
    recipeName: string;
    quantity: number;
    unit: string;
    assignedTo?: string;
    notes?: string;
    startTime?: string;
  }[];
}

// ─── Colour Scheme ───────────────────────────────────────────────────────

const worksheetColours = {
  // Category headers
  categoryBg: '#f0fdfa',
  categoryBorder: '#14b8a6',
  categoryText: '#0f766e',

  // Data rows
  rowAlt: '#f9fafb',
  border: '#e5e7eb',
  borderDark: '#374151',

  // Totals
  totalBg: '#ecfdf5',
  totalText: '#059669',
  totalBgDark: '#d1fae5',

  // Tray Layout groupings
  wholesaleBg: '#dbeafe',
  wholesaleBorder: '#3b82f6',
  wholesaleText: '#1e40af',
  kioskBg: '#fef3c7',
  kioskBorder: '#f59e0b',
  kioskText: '#92400e',

  // Frozen indicator
  frozenBg: '#dbeafe',

  // General
  headerBg: '#f3f4f6',
  text: '#111827',
  textMuted: '#6b7280',
};

// ─── Styles - Improved layout ────────────────────────────────────────────

const styles = StyleSheet.create({
  page: {
    padding: 20,
    paddingBottom: 30,
    fontSize: 7,
    fontFamily: 'Helvetica',
    color: worksheetColours.text,
  },
  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
    paddingBottom: 6,
    borderBottomWidth: 1.5,
    borderBottomColor: '#1a1a2e',
  },
  headerTitle: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    color: '#1a1a2e',
  },
  headerSub: {
    fontSize: 8,
    color: worksheetColours.textMuted,
    marginTop: 2,
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  siteName: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
  },
  // Section box
  section: {
    marginBottom: 8,
    borderWidth: 0.5,
    borderColor: worksheetColours.border,
    borderRadius: 3,
    backgroundColor: '#ffffff',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: worksheetColours.border,
  },
  sectionTitle: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: worksheetColours.text,
  },
  sectionSub: {
    fontSize: 6,
    color: worksheetColours.textMuted,
  },
  // Tables
  table: {
    borderWidth: 0.5,
    borderColor: worksheetColours.border,
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: worksheetColours.headerBg,
    borderBottomWidth: 1,
    borderBottomColor: worksheetColours.borderDark,
  },
  th: {
    fontSize: 6,
    fontFamily: 'Helvetica-Bold',
    color: worksheetColours.borderDark,
    paddingVertical: 3,
    paddingHorizontal: 4,
    borderRightWidth: 0.5,
    borderRightColor: worksheetColours.border,
  },
  thLast: {
    borderRightWidth: 0,
  },
  // Category/Bake group divider row
  categoryRow: {
    flexDirection: 'row',
    backgroundColor: worksheetColours.categoryBg,
    borderBottomWidth: 1,
    borderBottomColor: worksheetColours.categoryBorder,
    borderTopWidth: 0.5,
    borderTopColor: worksheetColours.border,
  },
  categoryText: {
    fontSize: 6,
    fontFamily: 'Helvetica-Bold',
    color: worksheetColours.categoryText,
    paddingVertical: 3,
    paddingHorizontal: 6,
    textTransform: 'uppercase',
  },
  // Data rows
  tr: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: worksheetColours.border,
  },
  trAlt: {
    backgroundColor: worksheetColours.rowAlt,
  },
  td: {
    fontSize: 7,
    paddingVertical: 2,
    paddingHorizontal: 4,
    borderRightWidth: 0.5,
    borderRightColor: worksheetColours.border,
  },
  tdLast: {
    borderRightWidth: 0,
  },
  tdBold: {
    fontFamily: 'Helvetica-Bold',
  },
  tdCenter: {
    textAlign: 'center',
  },
  tdRight: {
    textAlign: 'right',
  },
  // Total column styling
  totalCell: {
    backgroundColor: worksheetColours.totalBg,
    textAlign: 'center',
  },
  totalText: {
    color: worksheetColours.totalText,
    fontFamily: 'Helvetica-Bold',
  },
  // Totals row
  totalsRow: {
    flexDirection: 'row',
    backgroundColor: worksheetColours.headerBg,
    borderTopWidth: 1.5,
    borderTopColor: worksheetColours.borderDark,
  },
  totalsRowTotal: {
    backgroundColor: worksheetColours.totalBgDark,
  },
  // Tray layout destination group headers
  wholesaleGroupHeader: {
    backgroundColor: worksheetColours.wholesaleBg,
    borderBottomWidth: 1,
    borderBottomColor: worksheetColours.wholesaleBorder,
    textAlign: 'center',
    paddingVertical: 3,
  },
  wholesaleGroupText: {
    fontSize: 6,
    fontFamily: 'Helvetica-Bold',
    color: worksheetColours.wholesaleText,
  },
  kioskGroupHeader: {
    backgroundColor: worksheetColours.kioskBg,
    borderBottomWidth: 1,
    borderBottomColor: worksheetColours.kioskBorder,
    textAlign: 'center',
    paddingVertical: 3,
  },
  kioskGroupText: {
    fontSize: 6,
    fontFamily: 'Helvetica-Bold',
    color: worksheetColours.kioskText,
  },
  // Grid layouts
  gridRow: {
    flexDirection: 'row',
    gap: 8,
  },
  gridCol: {
    flex: 1,
  },
  gridCol2: {
    flex: 2,
  },
  gridCol3: {
    flex: 3,
  },
  // Dough mix block
  mixBlock: {
    marginBottom: 4,
    borderWidth: 0.5,
    borderColor: worksheetColours.border,
    borderRadius: 2,
    overflow: 'hidden',
  },
  mixHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: worksheetColours.headerBg,
    paddingVertical: 3,
    paddingHorizontal: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: worksheetColours.border,
  },
  // Footer
  footer: {
    position: 'absolute',
    bottom: 10,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 6,
    color: worksheetColours.textMuted,
    borderTopWidth: 0.5,
    borderTopColor: worksheetColours.border,
    paddingTop: 4,
  },
});

// ─── Helper: Group by bake group ─────────────────────────────────────────

const BAKE_GROUP_ORDER = ['Croissants', 'Savory', 'Swirls', 'Cookies'];

function getBakeGroupPriority(name: string): number {
  const idx = BAKE_GROUP_ORDER.findIndex(bg => bg.toLowerCase() === name?.toLowerCase());
  return idx >= 0 ? idx : 99;
}

function sortByBakeGroup<T extends { bg: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const diff = getBakeGroupPriority(a.bg) - getBakeGroupPriority(b.bg);
    return diff !== 0 ? diff : a.bg.localeCompare(b.bg);
  });
}

// ─── Component ───────────────────────────────────────────────────────────

export function ProductionPlanPDF({
  siteName,
  date,
  dateLabels,
  packing,
  frozenPack,
  doughSheets,
  cookies,
  doughMix,
  trayGrids,
  xcheck,
}: ProductionPlanPDFProps) {
  // Compute dates for each section
  const baseDate = new Date(date);
  const tomorrow = new Date(baseDate);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dayAfter = new Date(baseDate);
  dayAfter.setDate(dayAfter.getDate() + 2);

  const todayLabel = dateLabels?.today || formatDateWithDay(date);
  const tomorrowLabel = dateLabels?.tomorrow || formatDateWithDay(tomorrow.toISOString().split('T')[0]);
  const dayAfterLabel = dateLabels?.dayAfter || formatDateWithDay(dayAfter.toISOString().split('T')[0]);

  // Column widths for packing table - optimized for A4 landscape
  // A4 landscape = 842pt width, minus 40pt padding = ~800pt usable
  const productColWidth = 100;
  const totalColWidth = 32;
  const numCustomers = packing?.customers?.length || 0;
  // Calculate customer column width: remaining space / num customers, min 40 for readability
  const custColWidth = numCustomers > 0
    ? Math.min(60, Math.max(40, (800 - productColWidth - totalColWidth) / numCustomers))
    : 45;
  const headerHeight = 36; // Height for 3-line wrapped text

  // Compute unified product list for tray layout and confirmation alignment
  const unifiedProducts = (() => {
    if (!trayGrids?.length && !xcheck?.products?.length) return [];
    const allProds = new Map<string, { bg: string; trays: Map<string, number>; destQtys: Map<string, number>; total: number }>();

    // Collect from tray grids
    trayGrids?.forEach(dg => {
      dg.products?.forEach(prod => {
        if (!allProds.has(prod.name)) {
          allProds.set(prod.name, { bg: prod.bg, trays: new Map(), destQtys: new Map(), total: 0 });
        }
        const p = allProds.get(prod.name)!;
        prod.trayQuantities?.forEach(tq => {
          p.trays.set(`${dg.name}-${tq.trayNum}`, tq.qty);
        });
      });
    });

    // Collect from xcheck
    xcheck?.products?.forEach(prod => {
      if (!allProds.has(prod.name)) {
        allProds.set(prod.name, { bg: prod.bg, trays: new Map(), destQtys: new Map(), total: 0 });
      }
      const p = allProds.get(prod.name)!;
      p.total = prod.total;
      prod.destQuantities?.forEach(dq => {
        p.destQtys.set(dq.dest, dq.qty);
      });
    });

    return sortByBakeGroup([...allProds.entries()].map(([name, data]) => ({ name, ...data })));
  })();

  return (
    <Document>
      {/* ═══════════════════════════════════════════════════════════════════
          PAGE 1: PACKING PLAN - Horizontal headers with multi-line wrapping
          ═══════════════════════════════════════════════════════════════════ */}
      <Page size="A4" orientation="landscape" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Packing Plan</Text>
            <Text style={styles.headerSub}>{formatUKDate(date)}</Text>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.siteName}>{siteName}</Text>
          </View>
        </View>

        {/* Packing Plan Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Packing Plan</Text>
            {packing && (
              <Text style={styles.sectionSub}>
                {packing.customers.length} orders | {packing.grand} items — for {formatDateWithDay(date)}
              </Text>
            )}
          </View>

          {packing && packing.products.length > 0 ? (
            <View style={styles.table}>
              {/* Header row with horizontal customer names (up to 3 lines) */}
              <View style={[styles.tableHeaderRow, { minHeight: headerHeight, alignItems: 'center' }]}>
                {/* Product column header */}
                <View style={[
                  styles.th,
                  {
                    width: productColWidth,
                    borderRightWidth: 1.5,
                    borderRightColor: worksheetColours.borderDark,
                    justifyContent: 'center',
                  }
                ]}>
                  <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 7 }}>Product</Text>
                </View>

                {/* Horizontal customer headers with wrapping */}
                {packing.customers.map((cust, i) => (
                  <View key={cust} style={[
                    styles.th,
                    {
                      width: custColWidth,
                      justifyContent: 'center',
                      alignItems: 'center',
                      paddingVertical: 2,
                      paddingHorizontal: 2,
                    }
                  ]}>
                    <Text style={{
                      fontSize: 6,
                      fontFamily: 'Helvetica-Bold',
                      textAlign: 'center',
                    }}>{cust}</Text>
                  </View>
                ))}

                {/* Total column header */}
                <View style={[
                  styles.th,
                  styles.totalCell,
                  {
                    width: totalColWidth,
                    borderLeftWidth: 1.5,
                    borderLeftColor: worksheetColours.borderDark,
                    justifyContent: 'center',
                    alignItems: 'center',
                  }
                ]}>
                  <Text style={[styles.totalText, { fontSize: 7 }]}>Tot</Text>
                </View>
              </View>

              {/* Product rows grouped by bake group */}
              {(() => {
                const sorted = sortByBakeGroup(packing.products);
                const rows: React.ReactNode[] = [];
                let lastBg = '';
                let rowIdx = 0;

                sorted.forEach((prod) => {
                  // Category/Bake group header
                  if (prod.bg !== lastBg) {
                    lastBg = prod.bg;
                    rowIdx = 0;
                    rows.push(
                      <View key={`bg-${prod.bg}`} style={styles.categoryRow}>
                        <Text style={styles.categoryText}>{prod.bg}</Text>
                      </View>
                    );
                  }

                  const isAlt = rowIdx % 2 === 1;
                  rows.push(
                    <View key={prod.name} style={[styles.tr, isAlt && styles.trAlt]}>
                      {/* Product name */}
                      <View style={[
                        styles.td,
                        styles.tdBold,
                        { width: productColWidth, borderRightWidth: 1.5, borderRightColor: worksheetColours.borderDark }
                      ]}>
                        <Text>{prod.name}</Text>
                      </View>

                      {/* Customer quantities */}
                      {packing.customers.map((cust) => {
                        const qtyItem = prod.quantities.find(q => q.customer === cust);
                        const qty = qtyItem?.qty || 0;
                        const isFrozen = qtyItem?.isFrozen;
                        return (
                          <View key={cust} style={[
                            styles.td,
                            styles.tdCenter,
                            { width: custColWidth },
                            isFrozen && { backgroundColor: worksheetColours.frozenBg }
                          ]}>
                            {/* Only show numbers > 0, leave empty cells blank */}
                            <Text style={qty > 0 ? styles.tdBold : { color: 'transparent' }}>
                              {qty > 0 ? qty : ''}
                            </Text>
                          </View>
                        );
                      })}

                      {/* Total */}
                      <View style={[
                        styles.td,
                        styles.tdLast,
                        styles.totalCell,
                        { width: totalColWidth, borderLeftWidth: 1.5, borderLeftColor: worksheetColours.borderDark }
                      ]}>
                        <Text style={styles.totalText}>{prod.total}</Text>
                      </View>
                    </View>
                  );
                  rowIdx++;
                });

                // Totals row
                rows.push(
                  <View key="_totals" style={styles.totalsRow}>
                    <View style={[
                      styles.td,
                      styles.tdBold,
                      { width: productColWidth, borderRightWidth: 1.5, borderRightColor: worksheetColours.borderDark }
                    ]}>
                      <Text>Totals</Text>
                    </View>
                    {packing.customers.map((cust) => {
                      const tot = packing.colTotals.find(t => t.customer === cust)?.total || 0;
                      return (
                        <View key={cust} style={[styles.td, styles.tdCenter, styles.tdBold, { width: custColWidth }]}>
                          <Text>{tot || ''}</Text>
                        </View>
                      );
                    })}
                    <View style={[
                      styles.td,
                      styles.tdLast,
                      styles.totalsRowTotal,
                      { width: totalColWidth, borderLeftWidth: 1.5, borderLeftColor: worksheetColours.borderDark, textAlign: 'center' }
                    ]}>
                      <Text style={[styles.totalText, styles.tdBold]}>{packing.grand}</Text>
                    </View>
                  </View>
                );

                return rows;
              })()}
            </View>
          ) : (
            <View style={{ padding: 20 }}>
              <Text style={{ textAlign: 'center', color: worksheetColours.textMuted }}>No orders to pack today</Text>
            </View>
          )}
        </View>

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text>Generated by Opsly</Text>
          <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>
      </Page>

      {/* ═══════════════════════════════════════════════════════════════════
          PAGE 2: PREP & TRAYS - With colour-coded group headers
          ═══════════════════════════════════════════════════════════════════ */}
      <Page size="A4" orientation="landscape" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Prep & Trays</Text>
            <Text style={styles.headerSub}>{formatUKDate(date)}</Text>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.siteName}>{siteName}</Text>
          </View>
        </View>

        {/* Prep Row: Frozen Pack (if any) | Dough Sheets | Cookie Prep | Dough Mix */}
        <View style={styles.gridRow}>
          {/* Frozen Pack */}
          {frozenPack && (
            <View style={styles.gridCol}>
              <View style={[styles.section, { borderColor: '#93c5fd', borderWidth: 1 }]}>
                <View style={[styles.sectionHeader, { backgroundColor: '#eff6ff', borderBottomColor: '#bfdbfe' }]}>
                  <Text style={{ fontSize: 7, color: '#2563eb' }}>❄️</Text>
                  <Text style={[styles.sectionTitle, { color: '#1d4ed8' }]}>Frozen Pack</Text>
                  <Text style={[styles.sectionSub, { color: '#3b82f6' }]}>{tomorrowLabel}</Text>
                </View>
                <View style={{ padding: 4 }}>
                  {frozenPack.stages ? (
                    frozenPack.stages.map((stageGroup, si) => (
                      <View key={si} style={{ marginBottom: si < frozenPack.stages!.length - 1 ? 4 : 0 }}>
                        {frozenPack.stages!.length > 1 && (
                          <View style={{ borderBottomWidth: 0.5, borderBottomColor: '#bfdbfe', marginBottom: 2, paddingBottom: 1 }}>
                            <Text style={{ fontSize: 5.5, fontFamily: 'Helvetica-Bold', color: '#1d4ed8', textTransform: 'uppercase' }}>
                              {stageGroup.stage}
                            </Text>
                          </View>
                        )}
                        {stageGroup.customers.map((cust, ci) => (
                          <View key={ci} style={[styles.mixBlock, { borderColor: '#bfdbfe' }]}>
                            <View style={[styles.mixHeader, { backgroundColor: '#dbeafe', borderBottomColor: '#bfdbfe' }]}>
                              <Text style={{ fontSize: 6.5, fontFamily: 'Helvetica-Bold', color: '#1e40af' }}>{cust.name}</Text>
                              <Text style={{ fontSize: 6.5, fontFamily: 'Helvetica-Bold', color: '#2563eb' }}>{cust.total}</Text>
                            </View>
                            {cust.products.map((p, pi) => (
                              <View key={pi} style={[styles.tr, pi % 2 === 1 && { backgroundColor: '#f0f7ff' }]}>
                                <View style={[styles.td, { flex: 2 }]}>
                                  <Text style={{ fontSize: 6 }}>{p.name}</Text>
                                </View>
                                <View style={[styles.td, styles.tdLast, styles.tdRight, { width: 30 }]}>
                                  <Text style={{ fontSize: 6, fontFamily: 'Helvetica-Bold', color: '#2563eb' }}>{p.qty}</Text>
                                </View>
                              </View>
                            ))}
                          </View>
                        ))}
                      </View>
                    ))
                  ) : frozenPack.fallbackCustomers ? (
                    frozenPack.fallbackCustomers.map((cust, ci) => (
                      <View key={ci} style={[styles.mixBlock, { borderColor: '#bfdbfe' }]}>
                        <View style={[styles.mixHeader, { backgroundColor: '#dbeafe', borderBottomColor: '#bfdbfe' }]}>
                          <Text style={{ fontSize: 6.5, fontFamily: 'Helvetica-Bold', color: '#1e40af' }}>{cust.customer}</Text>
                          <Text style={{ fontSize: 6.5, fontFamily: 'Helvetica-Bold', color: '#2563eb' }}>{cust.total}</Text>
                        </View>
                        {cust.products.map((p, pi) => (
                          <View key={pi} style={[styles.tr, pi % 2 === 1 && { backgroundColor: '#f0f7ff' }]}>
                            <View style={[styles.td, { flex: 2 }]}>
                              <Text style={{ fontSize: 6 }}>{p.name}</Text>
                            </View>
                            <View style={[styles.td, styles.tdLast, styles.tdRight, { width: 30 }]}>
                              <Text style={{ fontSize: 6, fontFamily: 'Helvetica-Bold', color: '#2563eb' }}>{p.qty}</Text>
                            </View>
                          </View>
                        ))}
                      </View>
                    ))
                  ) : null}
                  {/* Total row */}
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#dbeafe', borderRadius: 2, paddingVertical: 3, paddingHorizontal: 6, marginTop: 3 }}>
                    <Text style={{ fontSize: 7, fontFamily: 'Helvetica-Bold', color: '#1e40af' }}>Total</Text>
                    <Text style={{ fontSize: 7, fontFamily: 'Helvetica-Bold', color: '#1d4ed8' }}>{frozenPack.totalItems}</Text>
                  </View>
                </View>
              </View>
            </View>
          )}

          {/* Dough Sheets */}
          <View style={styles.gridCol}>
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Dough Sheets for {tomorrowLabel}</Text>
              </View>
              {doughSheets && doughSheets.by_style?.length > 0 ? (
                <View style={styles.table}>
                  <View style={styles.tableHeaderRow}>
                    <View style={[styles.th, { flex: 2 }]}><Text>Style</Text></View>
                    <View style={[styles.th, styles.tdRight, { width: 45 }]}><Text>Sheets</Text></View>
                    <View style={[styles.th, styles.thLast, styles.tdRight, { width: 40 }]}><Text>Prods</Text></View>
                  </View>
                  {doughSheets.by_style.map((s, i) => (
                    <View key={i} style={[styles.tr, i % 2 === 1 && styles.trAlt]}>
                      <View style={[styles.td, { flex: 2 }]}>
                        <Text>{s.style_name}</Text>
                        <Text style={{ fontSize: 5, color: worksheetColours.textMuted }}>{s.base_dough_name}</Text>
                      </View>
                      <View style={[styles.td, styles.tdRight, styles.totalCell, { width: 45 }]}>
                        <Text style={styles.totalText}>{s.sheets_needed}</Text>
                      </View>
                      <View style={[styles.td, styles.tdLast, styles.tdRight, { width: 40 }]}>
                        <Text>{s.total_products}</Text>
                      </View>
                    </View>
                  ))}
                  <View style={styles.totalsRow}>
                    <View style={[styles.td, styles.tdBold, { flex: 2 }]}><Text>Total</Text></View>
                    <View style={[styles.td, styles.tdRight, styles.totalsRowTotal, { width: 45 }]}>
                      <Text style={[styles.totalText, styles.tdBold]}>{doughSheets.total_sheets}</Text>
                    </View>
                    <View style={[styles.td, styles.tdLast, styles.tdRight, styles.tdBold, { width: 40 }]}>
                      <Text>{doughSheets.by_style.reduce((s, x) => s + x.total_products, 0)}</Text>
                    </View>
                  </View>
                </View>
              ) : (
                <View style={{ padding: 12 }}>
                  <Text style={{ textAlign: 'center', color: worksheetColours.textMuted, fontSize: 6 }}>No sheets needed</Text>
                </View>
              )}
            </View>
          </View>

          {/* Cookie Prep */}
          <View style={styles.gridCol}>
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Cookie Prep for {tomorrowLabel}</Text>
              </View>
              {cookies && cookies.length > 0 ? (
                <View style={styles.table}>
                  <View style={styles.tableHeaderRow}>
                    <View style={[styles.th, { flex: 2 }]}><Text>Cookie</Text></View>
                    <View style={[styles.th, styles.thLast, styles.tdRight, { width: 45 }]}><Text>Qty</Text></View>
                  </View>
                  {cookies.map((c, i) => (
                    <View key={c.name} style={[styles.tr, i % 2 === 1 && styles.trAlt]}>
                      <View style={[styles.td, { flex: 2 }]}><Text>{c.name}</Text></View>
                      <View style={[styles.td, styles.tdLast, styles.tdRight, styles.totalCell, { width: 45 }]}>
                        <Text style={styles.totalText}>{c.qty}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              ) : (
                <View style={{ padding: 12 }}>
                  <Text style={{ textAlign: 'center', color: worksheetColours.textMuted, fontSize: 6 }}>No cookies</Text>
                </View>
              )}
            </View>
          </View>

          {/* Dough Mix */}
          <View style={styles.gridCol}>
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Dough Mix for {dayAfterLabel}</Text>
              </View>
              {doughMix && doughMix.length > 0 ? (
                <View style={{ padding: 6 }}>
                  {doughMix.map((mix, i) => (
                    <View key={i} style={styles.mixBlock}>
                      <View style={styles.mixHeader}>
                        <Text style={[styles.tdBold, { fontSize: 7 }]}>{mix.dough_name}</Text>
                        <Text style={[styles.totalText, { fontSize: 7 }]}>{mix.total_kg}kg</Text>
                      </View>
                      {mix.ingredients.map((ing, j) => (
                        <View key={j} style={[styles.tr, j % 2 === 1 && styles.trAlt]}>
                          <View style={[styles.td, { flex: 2 }]}>
                            <Text style={{ fontSize: 6 }}>{ing.name}</Text>
                          </View>
                          <View style={[styles.td, styles.tdLast, styles.tdRight, { width: 55 }]}>
                            <Text style={{ fontSize: 6 }}>{ing.quantity.toLocaleString()}{ing.unit}</Text>
                          </View>
                        </View>
                      ))}
                    </View>
                  ))}
                </View>
              ) : (
                <View style={{ padding: 12 }}>
                  <Text style={{ textAlign: 'center', color: worksheetColours.textMuted, fontSize: 6 }}>No mix needed</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Tray Layout + Confirmation Row */}
        {trayGrids && trayGrids.length > 0 && (
          <View style={[styles.gridRow, { marginTop: 6 }]}>
            {/* Tray Layout - 3/4 width */}
            <View style={styles.gridCol3}>
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Tray Layout for {tomorrowLabel}</Text>
                  <Text style={styles.sectionSub}>
                    {trayGrids.reduce((s, g) => s + g.totalItems, 0)} items
                  </Text>
                </View>
                <View style={styles.table}>
                  {/* Colour-coded destination group header row */}
                  <View style={{ flexDirection: 'row' }}>
                    <View style={[styles.th, { width: 110, borderRightWidth: 1.5, borderRightColor: worksheetColours.borderDark, backgroundColor: worksheetColours.headerBg }]}>
                      <Text></Text>
                    </View>
                    {trayGrids.map((dg, di) => {
                      // Determine if wholesale or kiosk based on name
                      const isWholesale = dg.name.toLowerCase().includes('wholesale');
                      const isKiosk = dg.name.toLowerCase().includes('kiosk');
                      const groupStyle = isWholesale
                        ? styles.wholesaleGroupHeader
                        : isKiosk
                        ? styles.kioskGroupHeader
                        : { backgroundColor: worksheetColours.headerBg };
                      const textStyle = isWholesale
                        ? styles.wholesaleGroupText
                        : isKiosk
                        ? styles.kioskGroupText
                        : { fontSize: 6, fontFamily: 'Helvetica-Bold' };

                      return (
                        <View key={dg.name} style={[
                          groupStyle,
                          { width: dg.trayNums.length * 22 },
                          di < trayGrids.length - 1 && { borderRightWidth: 1.5, borderRightColor: worksheetColours.borderDark }
                        ]}>
                          <Text style={textStyle}>{dg.name}</Text>
                        </View>
                      );
                    })}
                  </View>

                  {/* Tray number header row */}
                  <View style={styles.tableHeaderRow}>
                    <View style={[styles.th, { width: 110, borderRightWidth: 1.5, borderRightColor: worksheetColours.borderDark }]}>
                      <Text>Product</Text>
                    </View>
                    {trayGrids.map((dg, di) =>
                      dg.trayNums.map((tn, ti) => {
                        const isWholesale = dg.name.toLowerCase().includes('wholesale');
                        const isKiosk = dg.name.toLowerCase().includes('kiosk');
                        const bgColor = isWholesale
                          ? worksheetColours.wholesaleBg
                          : isKiosk
                          ? worksheetColours.kioskBg
                          : worksheetColours.totalBg;
                        const textColor = isWholesale
                          ? worksheetColours.wholesaleText
                          : isKiosk
                          ? worksheetColours.kioskText
                          : worksheetColours.totalText;

                        return (
                          <View
                            key={`${dg.name}-${tn}`}
                            style={[
                              styles.th,
                              styles.tdCenter,
                              { width: 22, backgroundColor: bgColor },
                              ti === dg.trayNums.length - 1 && di < trayGrids.length - 1 && { borderRightWidth: 1.5, borderRightColor: worksheetColours.borderDark },
                            ]}
                          >
                            <Text style={{ color: textColor, fontFamily: 'Helvetica-Bold', fontSize: 6 }}>{tn}</Text>
                          </View>
                        );
                      })
                    )}
                  </View>

                  {/* Product rows - using unified list for alignment with confirmation */}
                  {(() => {
                    const rows: React.ReactNode[] = [];
                    let lastBg = '';
                    let rowIdx = 0;
                    const totalCols = trayGrids.reduce((s, dg) => s + dg.trayNums.length, 0);

                    unifiedProducts.forEach((prod) => {
                      if (prod.bg !== lastBg) {
                        lastBg = prod.bg;
                        rowIdx = 0;
                        rows.push(
                          <View key={`bg-${prod.bg}`} style={styles.categoryRow}>
                            <Text style={styles.categoryText}>{prod.bg}</Text>
                          </View>
                        );
                      }

                      const isAlt = rowIdx % 2 === 1;
                      rows.push(
                        <View key={prod.name} style={[styles.tr, isAlt && styles.trAlt]}>
                          <View style={[styles.td, { width: 110, borderRightWidth: 1.5, borderRightColor: worksheetColours.borderDark }]}>
                            <Text style={{ fontSize: 6 }}>{prod.name}</Text>
                          </View>
                          {trayGrids.map((dg, di) =>
                            dg.trayNums.map((tn, ti) => {
                              const qty = prod.trays.get(`${dg.name}-${tn}`);
                              return (
                                <View
                                  key={`${dg.name}-${tn}`}
                                  style={[
                                    styles.td,
                                    styles.tdCenter,
                                    { width: 22 },
                                    ti === dg.trayNums.length - 1 && di < trayGrids.length - 1 && { borderRightWidth: 1.5, borderRightColor: worksheetColours.borderDark },
                                  ]}
                                >
                                  <Text style={qty ? styles.tdBold : { color: 'transparent' }}>{qty || ''}</Text>
                                </View>
                              );
                            })
                          )}
                        </View>
                      );
                      rowIdx++;
                    });

                    return rows;
                  })()}
                </View>
              </View>
            </View>

            {/* Confirmation / Cross-Check - 1/4 width */}
            {xcheck && (
              <View style={styles.gridCol}>
                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Confirmation for {tomorrowLabel}</Text>
                  </View>
                  <View style={styles.table}>
                    {/* Spacer row to align with Tray Layout's group header */}
                    <View style={{ flexDirection: 'row', backgroundColor: worksheetColours.headerBg, borderBottomWidth: 0.5, borderBottomColor: worksheetColours.border }}>
                      <View style={[styles.th, { width: 80, borderRightWidth: 1.5, borderRightColor: worksheetColours.borderDark }]}>
                        <Text></Text>
                      </View>
                      <View style={{ flex: 1, textAlign: 'center', paddingVertical: 3 }}>
                        <Text style={{ fontSize: 6, fontFamily: 'Helvetica-Bold', color: worksheetColours.textMuted, textAlign: 'center' }}>Totals by Destination</Text>
                      </View>
                    </View>

                    {/* Header */}
                    <View style={styles.tableHeaderRow}>
                      <View style={[styles.th, { width: 80, borderRightWidth: 1.5, borderRightColor: worksheetColours.borderDark }]}>
                        <Text>Product</Text>
                      </View>
                      {xcheck.dests.map((dest) => (
                        <View key={dest} style={[styles.th, styles.tdCenter, { width: 45 }]}>
                          <Text style={{ fontSize: 5.5 }}>{dest.replace(' Bake', '')}</Text>
                        </View>
                      ))}
                      <View style={[styles.th, styles.thLast, styles.tdCenter, styles.totalCell, { width: 28, borderLeftWidth: 1.5, borderLeftColor: worksheetColours.borderDark }]}>
                        <Text style={styles.totalText}>Tot</Text>
                      </View>
                    </View>

                    {/* Product rows - using unified list for alignment with tray layout */}
                    {(() => {
                      const rows: React.ReactNode[] = [];
                      let lastBg = '';
                      let rowIdx = 0;

                      unifiedProducts.forEach((prod) => {
                        if (prod.bg !== lastBg) {
                          lastBg = prod.bg;
                          rowIdx = 0;
                          rows.push(
                            <View key={`bg-${prod.bg}`} style={styles.categoryRow}>
                              <Text style={styles.categoryText}>{prod.bg}</Text>
                            </View>
                          );
                        }

                        const isAlt = rowIdx % 2 === 1;
                        rows.push(
                          <View key={prod.name} style={[styles.tr, isAlt && styles.trAlt]}>
                            <View style={[styles.td, { width: 80, borderRightWidth: 1.5, borderRightColor: worksheetColours.borderDark }]}>
                              <Text style={{ fontSize: 6 }}>{prod.name}</Text>
                            </View>
                            {xcheck.dests.map((dest) => {
                              const qty = prod.destQtys.get(dest) || 0;
                              return (
                                <View key={dest} style={[styles.td, styles.tdCenter, { width: 45 }]}>
                                  <Text style={qty > 0 ? styles.tdBold : { color: 'transparent' }}>{qty > 0 ? qty : ''}</Text>
                                </View>
                              );
                            })}
                            <View style={[styles.td, styles.tdLast, styles.tdCenter, styles.totalCell, { width: 28, borderLeftWidth: 1.5, borderLeftColor: worksheetColours.borderDark }]}>
                              <Text style={styles.totalText}>{prod.total}</Text>
                            </View>
                          </View>
                        );
                        rowIdx++;
                      });

                      // Totals row
                      rows.push(
                        <View key="_totals" style={styles.totalsRow}>
                          <View style={[styles.td, styles.tdBold, { width: 80, borderRightWidth: 1.5, borderRightColor: worksheetColours.borderDark }]}>
                            <Text>Totals</Text>
                          </View>
                          {xcheck.dests.map((dest) => {
                            const tot = xcheck.products.reduce((s, p) => s + (p.destQuantities.find(d => d.dest === dest)?.qty || 0), 0);
                            return (
                              <View key={dest} style={[styles.td, styles.tdCenter, styles.tdBold, { width: 45 }]}>
                                <Text>{tot}</Text>
                              </View>
                            );
                          })}
                          <View style={[styles.td, styles.tdLast, styles.tdCenter, styles.totalsRowTotal, { width: 28, borderLeftWidth: 1.5, borderLeftColor: worksheetColours.borderDark }]}>
                            <Text style={[styles.totalText, styles.tdBold]}>{xcheck.grand}</Text>
                          </View>
                        </View>
                      );

                      return rows;
                    })()}
                  </View>
                </View>
              </View>
            )}
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text>Generated by Opsly</Text>
          <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}

export default ProductionPlanPDF;
