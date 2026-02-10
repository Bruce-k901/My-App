# Database Security Remediation Plan

Generated: 2026-02-04

## Priority 1: IMMEDIATE (within 24 hours)

### 1.1 Rotate Exposed Credentials

**Files affected:** `.env.local`

All these credentials need immediate rotation:

- [ ] Supabase Service Role Key
- [ ] Supabase Anon Key
- [ ] Companies House API Key
- [ ] AWS S3 Access Key & Secret Key
- [ ] VAPID Private Key
- [ ] Stripe Live Keys (secret, webhook secret)
- [ ] Anthropic API Key
- [ ] Resend API Key

**Steps:**

1. Generate new credentials in each service's dashboard
2. Update `.env.local` with new values
3. Update production environment variables
4. Verify `.env.local` is in `.gitignore`

### 1.2 Revoke Anonymous Access to Sensitive Tables

**Migration file to create:** `20260204300000_revoke_dangerous_anon_grants.sql`

```sql
-- Revoke stockly table access from anon
REVOKE SELECT ON stockly.deliveries FROM anon;
REVOKE SELECT ON stockly.delivery_lines FROM anon;
REVOKE SELECT ON stockly.product_variants FROM anon;
REVOKE SELECT ON stockly.stock_items FROM anon;
REVOKE SELECT ON stockly.suppliers FROM anon;

-- Revoke attendance access from anon
REVOKE SELECT ON public.attendance_logs FROM anon;
REVOKE SELECT ON public.todays_attendance_logs FROM anon;
REVOKE SELECT ON public.active_attendance_logs FROM anon;

-- Revoke dangerous stock_levels permissions from anon
REVOKE SELECT, INSERT, UPDATE, DELETE ON public.stock_levels FROM anon;

-- Grant stock_levels only to authenticated with RLS
GRANT SELECT, INSERT, UPDATE ON public.stock_levels TO authenticated;
```

---

## Priority 2: URGENT (within 1 week)

### 2.1 Fix SECURITY DEFINER Functions

Add company_id authorization checks to all SECURITY DEFINER functions.

**Example fix for `calculate_recipe_cost`:**

```sql
CREATE OR REPLACE FUNCTION stockly.calculate_recipe_cost(p_recipe_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_company_id UUID;
BEGIN
    -- Get recipe's company_id
    SELECT company_id INTO v_company_id
    FROM stockly.recipes WHERE id = p_recipe_id;

    -- Verify user has access to this company
    IF NOT stockly.stockly_company_access(v_company_id) THEN
        RAISE EXCEPTION 'Access denied to recipe %', p_recipe_id;
    END IF;

    -- ... rest of function ...
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Functions requiring this fix:**

- [ ] `stockly.calculate_recipe_cost()`
- [ ] `stockly.recalculate_all_recipes()`
- [ ] `stockly.calculate_transfer_price()`
- [ ] `public.insert_daily_sales_summary()`
- [ ] `public.update_recipes()`
- [ ] `public.insert_stock_counts()`
- [ ] `stockly.generate_internal_order_number()`
- [ ] All functions in `09-stockly-warehouse-cpu.sql`

### 2.2 Fix Public View Trigger Functions

**Example fix for `insert_daily_sales_summary`:**

```sql
CREATE OR REPLACE FUNCTION public.insert_daily_sales_summary()
RETURNS TRIGGER AS $$
BEGIN
    -- Verify user has access to the company_id being inserted
    IF NOT stockly.stockly_company_access(NEW.company_id) THEN
        RAISE EXCEPTION 'Access denied to company %', NEW.company_id;
    END IF;

    INSERT INTO stockly.daily_sales_summary (...)
    VALUES (...);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 2.3 Re-enable RLS on user_roles with Non-Recursive Policy

```sql
-- Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create non-recursive policy using a materialized view or direct join
CREATE POLICY user_roles_access ON public.user_roles
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid()
        AND p.company_id = user_roles.company_id
    )
);
```

### 2.4 Implement Role-Based Access Control

Update `stockly_company_access` to support roles:

```sql
CREATE OR REPLACE FUNCTION stockly.stockly_company_access(
    p_company_id UUID,
    p_required_role TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
    IF p_required_role IS NULL THEN
        -- Basic company access check
        RETURN EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
            AND p.company_id = p_company_id
        );
    ELSE
        -- Role-based access check
        RETURN EXISTS (
            SELECT 1 FROM public.profiles p
            JOIN public.user_roles ur ON ur.user_id = p.id
            WHERE p.id = auth.uid()
            AND p.company_id = p_company_id
            AND ur.role IN (
                CASE p_required_role
                    WHEN 'staff' THEN ARRAY['owner', 'admin', 'manager', 'supervisor', 'staff']
                    WHEN 'supervisor' THEN ARRAY['owner', 'admin', 'manager', 'supervisor']
                    WHEN 'manager' THEN ARRAY['owner', 'admin', 'manager']
                    WHEN 'admin' THEN ARRAY['owner', 'admin']
                    WHEN 'owner' THEN ARRAY['owner']
                END
            )
        );
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;
```

---

## Priority 3: IMPORTANT (within 1 month)

### 3.1 Add Missing RLS Policies

Tables requiring RLS policies:

**Order Book Tables:**

- [ ] order_book_orders
- [ ] order_book_order_lines
- [ ] order_book_waste_logs
- [ ] order_book_message_threads
- [ ] order_book_messages
- [ ] order_book_issues
- [ ] order_book_issue_comments
- [ ] order_book_product_ratings
- [ ] order_book_credit_requests

**Subscription Tables:**

- [ ] company_subscriptions
- [ ] invoices
- [ ] subscription_addons
- [ ] company_addon_purchases

**Scope Hierarchy:**

- [ ] company_regions
- [ ] company_areas
- [ ] user_scope_assignments

**Messaging:**

- [ ] conversations
- [ ] conversation_participants
- [ ] messages
- [ ] message_reads
- [ ] message_reactions
- [ ] message_mentions
- [ ] typing_indicators

**Stockly Operations:**

- [ ] waste_logs
- [ ] waste_log_lines
- [ ] stock_counts
- [ ] stock_count_sections
- [ ] stock_count_lines
- [ ] transfers
- [ ] transfer_lines
- [ ] recipes
- [ ] recipe_ingredients
- [ ] credit_note_requests
- [ ] credit_note_lines

**HR/Employee:**

- [ ] employee_site_assignments
- [ ] incidents

**Integration:**

- [ ] pos_sales
- [ ] pos_sale_lines
- [ ] ai_processing_queue
- [ ] push_subscriptions

### 3.2 Implement Site-Level Authorization

Create a user_site_access table and update RLS policies:

```sql
CREATE TABLE public.user_site_access (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    site_id UUID NOT NULL REFERENCES public.sites(id),
    access_level TEXT NOT NULL DEFAULT 'read', -- 'read', 'write', 'admin'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, site_id)
);

-- Update site-scoped RLS policies
CREATE POLICY storage_areas_site ON stockly.storage_areas FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.user_site_access usa
        WHERE usa.user_id = auth.uid()
        AND usa.site_id = stockly.storage_areas.site_id
    )
);
```

### 3.3 Add Audit Logging

```sql
CREATE TABLE public.audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name TEXT NOT NULL,
    record_id UUID NOT NULL,
    action TEXT NOT NULL, -- 'INSERT', 'UPDATE', 'DELETE'
    old_data JSONB,
    new_data JSONB,
    changed_by UUID REFERENCES auth.users(id),
    changed_at TIMESTAMPTZ DEFAULT NOW(),
    company_id UUID,
    ip_address INET
);

-- Generic audit trigger function
CREATE OR REPLACE FUNCTION audit_trigger_func()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.audit_log (
        table_name, record_id, action, old_data, new_data, changed_by, company_id
    ) VALUES (
        TG_TABLE_NAME,
        COALESCE(NEW.id, OLD.id),
        TG_OP,
        CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) END,
        CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) END,
        auth.uid(),
        COALESCE(NEW.company_id, OLD.company_id)
    );
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply to sensitive tables
CREATE TRIGGER audit_recipes
    AFTER INSERT OR UPDATE OR DELETE ON stockly.recipes
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

CREATE TRIGGER audit_deliveries
    AFTER INSERT OR UPDATE OR DELETE ON stockly.deliveries
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();
```

### 3.4 Add Foreign Key Constraint to deliveries.purchase_order_id

```sql
ALTER TABLE stockly.deliveries
ADD CONSTRAINT fk_deliveries_purchase_order
FOREIGN KEY (purchase_order_id)
REFERENCES stockly.purchase_orders(id)
ON DELETE SET NULL;
```

---

## Priority 4: NICE-TO-HAVE

### 4.1 Strengthen Password Requirements

Update `supabase/config.toml`:

```toml
[auth.password]
minimum_password_length = 12
password_requirements = "lower_upper_letters_digits_symbols"
```

### 4.2 Reduce Rate Limits

```toml
[auth.rate_limit]
sign_in_sign_ups = 50
token_verifications = 200
```

### 4.3 Column-Level Encryption for PII

```sql
-- Enable pgcrypto
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Example: Encrypt phone numbers
ALTER TABLE public.profiles
ADD COLUMN phone_encrypted BYTEA;

-- Update function to encrypt
CREATE OR REPLACE FUNCTION encrypt_phone(plain_text TEXT)
RETURNS BYTEA AS $$
BEGIN
    RETURN pgp_sym_encrypt(plain_text, current_setting('app.encryption_key'));
END;
$$ LANGUAGE plpgsql;
```

---

## Migration Execution Order

1. `20260204300000_revoke_dangerous_anon_grants.sql` - IMMEDIATE
2. `20260204300001_fix_security_definer_functions.sql` - URGENT
3. `20260204300002_fix_user_roles_rls.sql` - URGENT
4. `20260204300003_implement_rbac.sql` - URGENT
5. `20260204300004_add_missing_rls_policies.sql` - IMPORTANT
6. `20260204300005_add_site_level_auth.sql` - IMPORTANT
7. `20260204300006_add_audit_logging.sql` - IMPORTANT
8. `20260204300007_add_fk_constraints.sql` - IMPORTANT

---

## Testing Checklist

After each migration:

- [ ] Verify authenticated users can access their company's data
- [ ] Verify authenticated users CANNOT access other companies' data
- [ ] Verify anonymous users cannot access protected tables
- [ ] Test SECURITY DEFINER functions with cross-company IDs (should fail)
- [ ] Test site-level access restrictions
- [ ] Verify audit logs are being created
- [ ] Run full application test suite

---

## Monitoring Recommendations

1. Set up alerts for:
   - Failed authentication attempts (brute force)
   - Cross-company access attempts
   - SECURITY DEFINER function authorization failures

2. Review audit logs weekly for:
   - Unusual data access patterns
   - Bulk data exports
   - Admin actions

3. Quarterly security review:
   - Re-run this security audit
   - Review new migrations for security issues
   - Update password requirements as needed
