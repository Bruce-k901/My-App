-- Repair: CREATE OR REPLACE VIEW resets security_invoker and may not trigger
-- PostgREST schema reload. Re-apply both.

-- Re-set security_invoker so RLS on stockly.sales is enforced through the view
ALTER VIEW public.sales SET (security_invoker = true);

-- Re-grant permissions (CREATE OR REPLACE VIEW preserves grants, but belt-and-braces)
GRANT SELECT, INSERT, UPDATE ON public.sales TO authenticated;

-- Force PostgREST to reload its schema cache so it sees payment_details + discount_details
NOTIFY pgrst, 'reload schema';
