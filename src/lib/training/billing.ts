/**
 * Billing Integration for Course Charges
 * 
 * Handles adding course charges to invoices and updating invoice totals.
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

interface LineItem {
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
}

/**
 * Add course charge to invoice line items
 * 
 * @param chargeId - The course_charge ID
 * @param invoiceId - The invoice ID to add the charge to
 */
export async function addChargeToInvoice(
  chargeId: string,
  invoiceId: string
): Promise<void> {
  // 1. Get the course charge
  const { data: charge, error: chargeError } = await supabaseAdmin
    .from("course_charges")
    .select("*")
    .eq("id", chargeId)
    .single();

  if (chargeError || !charge) {
    throw new Error(`Course charge not found: ${chargeError?.message || "Unknown error"}`);
  }

  // 2. Get the invoice
  const { data: invoice, error: invoiceError } = await supabaseAdmin
    .from("invoices")
    .select("*")
    .eq("id", invoiceId)
    .single();

  if (invoiceError || !invoice) {
    throw new Error(`Invoice not found: ${invoiceError?.message || "Unknown error"}`);
  }

  // 3. Parse existing line items
  const lineItems: LineItem[] = Array.isArray(invoice.line_items) 
    ? invoice.line_items 
    : [];

  // 4. Check if charge is already in line items
  const existingItem = lineItems.find(
    (item) => item.description?.includes(charge.course_name) && 
              item.description?.includes(charge.candidate_name)
  );

  if (existingItem) {
    // Charge already added to this invoice
    return;
  }

  // 5. Add new line item
  const amountPounds = charge.amount_pence / 100;
  const newLineItem: LineItem = {
    description: `${charge.course_name} - ${charge.candidate_name} (Completed: ${charge.completion_date})`,
    quantity: 1,
    unit_price: amountPounds,
    total: amountPounds,
  };

  lineItems.push(newLineItem);

  // 6. Calculate new totals
  const subtotal = lineItems.reduce((sum, item) => sum + (item.total || 0), 0);
  const taxAmount = invoice.tax_amount || 0;
  const totalAmount = subtotal + taxAmount;

  // 7. Update invoice
  const { error: updateError } = await supabaseAdmin
    .from("invoices")
    .update({
      line_items: lineItems,
      subtotal: subtotal,
      total_amount: totalAmount,
      updated_at: new Date().toISOString(),
    })
    .eq("id", invoiceId);

  if (updateError) {
    throw new Error(`Failed to update invoice: ${updateError.message}`);
  }

  // 8. Update course charge status
  const { error: chargeUpdateError } = await supabaseAdmin
    .from("course_charges")
    .update({
      invoice_id: invoiceId,
      status: "invoiced",
      invoiced_at: new Date().toISOString(),
    })
    .eq("id", chargeId);

  if (chargeUpdateError) {
    console.error("Failed to update course charge status:", chargeUpdateError);
    // Don't throw - invoice update succeeded
  }
}

/**
 * Find or create invoice for a company
 * 
 * @param companyId - The company ID
 * @param subscriptionId - The subscription ID (required for invoices)
 * @returns Invoice ID
 */
export async function findOrCreateInvoice(
  companyId: string,
  subscriptionId: string
): Promise<string> {
  // Try to find a draft invoice for this company
  const { data: existingInvoice, error: findError } = await supabaseAdmin
    .from("invoices")
    .select("id")
    .eq("company_id", companyId)
    .eq("subscription_id", subscriptionId)
    .eq("status", "draft")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (findError && findError.code !== "PGRST116") {
    // PGRST116 = no rows returned, which is fine
    throw new Error(`Failed to find invoice: ${findError.message}`);
  }

  if (existingInvoice) {
    return existingInvoice.id;
  }

  // Create new draft invoice
  const today = new Date();
  const dueDate = new Date(today);
  dueDate.setDate(dueDate.getDate() + 30); // 30 days from now

  // Generate invoice number
  const year = today.getFullYear();
  const { data: lastInvoice } = await supabaseAdmin
    .from("invoices")
    .select("invoice_number")
    .like("invoice_number", `INV-${year}-%`)
    .order("invoice_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  let invoiceNumber: string;
  if (lastInvoice?.invoice_number) {
    const lastNum = parseInt(lastInvoice.invoice_number.split("-")[2] || "0");
    invoiceNumber = `INV-${year}-${String(lastNum + 1).padStart(3, "0")}`;
  } else {
    invoiceNumber = `INV-${year}-001`;
  }

  // Get billing period (current month)
  const billingPeriodStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const billingPeriodEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);

  const { data: newInvoice, error: createError } = await supabaseAdmin
    .from("invoices")
    .insert({
      company_id: companyId,
      subscription_id: subscriptionId,
      invoice_number: invoiceNumber,
      invoice_date: today.toISOString().split("T")[0],
      due_date: dueDate.toISOString().split("T")[0],
      subtotal: 0,
      tax_amount: 0,
      total_amount: 0,
      currency: "GBP",
      status: "draft",
      line_items: [],
      billing_period_start: billingPeriodStart.toISOString().split("T")[0],
      billing_period_end: billingPeriodEnd.toISOString().split("T")[0],
    })
    .select("id")
    .single();

  if (createError || !newInvoice) {
    throw new Error(`Failed to create invoice: ${createError?.message || "Unknown error"}`);
  }

  return newInvoice.id;
}

/**
 * Add pending course charges to invoice
 * 
 * @param companyId - The company ID
 * @param subscriptionId - The subscription ID
 */
export async function addPendingChargesToInvoice(
  companyId: string,
  subscriptionId: string
): Promise<number> {
  // 1. Get all pending charges for the company
  const { data: charges, error: chargesError } = await supabaseAdmin
    .from("course_charges")
    .select("*")
    .eq("company_id", companyId)
    .eq("status", "pending");

  if (chargesError) {
    throw new Error(`Failed to fetch pending charges: ${chargesError.message}`);
  }

  if (!charges || charges.length === 0) {
    return 0;
  }

  // 2. Find or create invoice
  const invoiceId = await findOrCreateInvoice(companyId, subscriptionId);

  // 3. Add each charge to the invoice
  let addedCount = 0;
  for (const charge of charges) {
    try {
      await addChargeToInvoice(charge.id, invoiceId);
      addedCount++;
    } catch (error) {
      console.error(`Failed to add charge ${charge.id} to invoice:`, error);
      // Continue with other charges
    }
  }

  return addedCount;
}
