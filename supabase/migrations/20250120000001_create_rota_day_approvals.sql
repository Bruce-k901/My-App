-- =============================================
-- ROTA DAY-BY-DAY APPROVAL SYSTEM
-- Allows senior managers to approve/reject individual days
-- based on hours allocated and forecasted sales
-- =============================================

-- Create rota_day_approvals table
CREATE TABLE IF NOT EXISTS public.rota_day_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rota_id UUID NOT NULL REFERENCES public.rotas(id) ON DELETE CASCADE,
  approval_date DATE NOT NULL,
  
  -- Approval details
  status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected', 'needs_review')),
  approved_by UUID REFERENCES public.profiles(id),
  approved_at TIMESTAMPTZ,
  
  -- Review metrics
  hours_allocated DECIMAL(10, 2) NOT NULL DEFAULT 0,
  forecasted_sales DECIMAL(12, 2), -- in pence
  recommended_hours DECIMAL(10, 2),
  
  -- Feedback
  rejection_reason TEXT,
  notes TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Ensure one approval record per day per rota
  UNIQUE(rota_id, approval_date)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_rota_day_approvals_rota_id ON public.rota_day_approvals(rota_id);
CREATE INDEX IF NOT EXISTS idx_rota_day_approvals_date ON public.rota_day_approvals(approval_date);
CREATE INDEX IF NOT EXISTS idx_rota_day_approvals_status ON public.rota_day_approvals(status);

-- Enable RLS
ALTER TABLE public.rota_day_approvals ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Managers can view approvals for their company's rotas
CREATE POLICY "Managers can view day approvals" ON public.rota_day_approvals
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.rotas r
      WHERE r.id = rota_day_approvals.rota_id
      AND r.company_id = public.get_user_company_id()
    )
  );

-- Senior managers (admin, owner, area_manager, ops_manager) can manage approvals
CREATE POLICY "Senior managers can manage day approvals" ON public.rota_day_approvals
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.rotas r
      WHERE r.id = rota_day_approvals.rota_id
      AND r.company_id = public.get_user_company_id()
      AND public.normalize_role(public.get_user_role()) IN ('admin', 'owner', 'area_manager', 'ops_manager')
    )
  );

-- Function to approve a day
CREATE OR REPLACE FUNCTION public.approve_rota_day(
  p_rota_id UUID,
  p_approval_date DATE,
  p_notes TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $func$
DECLARE
  v_company_id UUID;
  v_role_key TEXT;
  v_hours DECIMAL(10, 2);
  v_forecast DECIMAL(12, 2);
BEGIN
  v_company_id := public.get_user_company_id();
  v_role_key := public.normalize_role(public.get_user_role());

  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF v_role_key NOT IN ('admin', 'owner', 'area_manager', 'ops_manager') THEN
    RAISE EXCEPTION 'Not allowed - only senior managers can approve days';
  END IF;

  -- Verify rota belongs to user's company
  IF NOT EXISTS (
    SELECT 1 FROM public.rotas 
    WHERE id = p_rota_id AND company_id = v_company_id
  ) THEN
    RAISE EXCEPTION 'Rota not found';
  END IF;

  -- Recalculate hours allocated for this day (always use current shifts)
  SELECT COALESCE(SUM(net_hours), 0) INTO v_hours
  FROM public.rota_shifts
  WHERE rota_id = p_rota_id
    AND shift_date = p_approval_date;

  -- Get forecast for this day
  SELECT predicted_revenue INTO v_forecast
  FROM public.rota_forecasts
  WHERE rota_id = p_rota_id
    AND forecast_date = p_approval_date;

  -- Upsert approval record (always recalculate hours)
  INSERT INTO public.rota_day_approvals (
    rota_id,
    approval_date,
    status,
    approved_by,
    approved_at,
    hours_allocated,
    forecasted_sales,
    notes
  ) VALUES (
    p_rota_id,
    p_approval_date,
    'approved',
    auth.uid(),
    NOW(),
    v_hours,
    v_forecast,
    p_notes
  )
  ON CONFLICT (rota_id, approval_date)
  DO UPDATE SET
    status = 'approved',
    approved_by = auth.uid(),
    approved_at = NOW(),
    hours_allocated = v_hours,  -- Always recalculate from current shifts
    forecasted_sales = v_forecast,
    notes = COALESCE(p_notes, rota_day_approvals.notes),
    rejection_reason = NULL,
    updated_at = NOW();
END;
$func$;

-- Function to reject a day
CREATE OR REPLACE FUNCTION public.reject_rota_day(
  p_rota_id UUID,
  p_approval_date DATE,
  p_rejection_reason TEXT,
  p_notes TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $func$
DECLARE
  v_company_id UUID;
  v_role_key TEXT;
  v_hours DECIMAL(10, 2);
  v_forecast DECIMAL(12, 2);
BEGIN
  v_company_id := public.get_user_company_id();
  v_role_key := public.normalize_role(public.get_user_role());

  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF v_role_key NOT IN ('admin', 'owner', 'area_manager', 'ops_manager') THEN
    RAISE EXCEPTION 'Not allowed - only senior managers can reject days';
  END IF;

  -- Verify rota belongs to user's company
  IF NOT EXISTS (
    SELECT 1 FROM public.rotas 
    WHERE id = p_rota_id AND company_id = v_company_id
  ) THEN
    RAISE EXCEPTION 'Rota not found';
  END IF;

  IF p_rejection_reason IS NULL OR p_rejection_reason = '' THEN
    RAISE EXCEPTION 'Rejection reason is required';
  END IF;

  -- Calculate hours allocated for this day
  SELECT COALESCE(SUM(net_hours), 0) INTO v_hours
  FROM public.rota_shifts
  WHERE rota_id = p_rota_id
    AND shift_date = p_approval_date;

  -- Get forecast for this day
  SELECT predicted_revenue INTO v_forecast
  FROM public.rota_forecasts
  WHERE rota_id = p_rota_id
    AND forecast_date = p_approval_date;

  -- Upsert rejection record
  INSERT INTO public.rota_day_approvals (
    rota_id,
    approval_date,
    status,
    approved_by,
    approved_at,
    hours_allocated,
    forecasted_sales,
    rejection_reason,
    notes
  ) VALUES (
    p_rota_id,
    p_approval_date,
    'rejected',
    auth.uid(),
    NOW(),
    v_hours,
    v_forecast,
    p_rejection_reason,
    p_notes
  )
  ON CONFLICT (rota_id, approval_date)
  DO UPDATE SET
    status = 'rejected',
    approved_by = auth.uid(),
    approved_at = NOW(),
    hours_allocated = v_hours,
    forecasted_sales = v_forecast,
    rejection_reason = p_rejection_reason,
    notes = COALESCE(p_notes, rota_day_approvals.notes),
    updated_at = NOW();
END;
$func$;

-- Function to mark day as needs review
CREATE OR REPLACE FUNCTION public.mark_rota_day_needs_review(
  p_rota_id UUID,
  p_approval_date DATE,
  p_notes TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $func$
DECLARE
  v_company_id UUID;
  v_role_key TEXT;
  v_hours DECIMAL(10, 2);
  v_forecast DECIMAL(12, 2);
BEGIN
  v_company_id := public.get_user_company_id();
  v_role_key := public.normalize_role(public.get_user_role());

  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF v_role_key NOT IN ('admin', 'owner', 'area_manager', 'ops_manager') THEN
    RAISE EXCEPTION 'Not allowed - only senior managers can mark days for review';
  END IF;

  -- Verify rota belongs to user's company
  IF NOT EXISTS (
    SELECT 1 FROM public.rotas 
    WHERE id = p_rota_id AND company_id = v_company_id
  ) THEN
    RAISE EXCEPTION 'Rota not found';
  END IF;

  -- Recalculate hours allocated for this day (always use current shifts)
  SELECT COALESCE(SUM(net_hours), 0) INTO v_hours
  FROM public.rota_shifts
  WHERE rota_id = p_rota_id
    AND shift_date = p_approval_date;

  -- Get forecast for this day
  SELECT predicted_revenue INTO v_forecast
  FROM public.rota_forecasts
  WHERE rota_id = p_rota_id
    AND forecast_date = p_approval_date;

  -- Upsert needs review record (always recalculate hours)
  INSERT INTO public.rota_day_approvals (
    rota_id,
    approval_date,
    status,
    hours_allocated,
    forecasted_sales,
    notes
  ) VALUES (
    p_rota_id,
    p_approval_date,
    'needs_review',
    v_hours,
    v_forecast,
    p_notes
  )
  ON CONFLICT (rota_id, approval_date)
  DO UPDATE SET
    status = 'needs_review',
    hours_allocated = v_hours,  -- Always recalculate from current shifts
    forecasted_sales = v_forecast,
    notes = COALESCE(p_notes, rota_day_approvals.notes),
    rejection_reason = NULL,
    approved_by = NULL,
    approved_at = NULL,
    updated_at = NOW();
END;
$func$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.approve_rota_day(UUID, DATE, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_rota_day(UUID, DATE, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_rota_day_needs_review(UUID, DATE, TEXT) TO authenticated;

-- Trigger to auto-create pending approvals when rota is submitted for approval
CREATE OR REPLACE FUNCTION public.auto_create_day_approvals()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $func$
DECLARE
  v_week_start DATE;
  v_week_end DATE;
  v_date DATE;
  v_hours DECIMAL(10, 2);
  v_forecast DECIMAL(12, 2);
BEGIN
  -- Only trigger when status changes to pending_approval
  IF NEW.status = 'pending_approval' AND (OLD.status IS NULL OR OLD.status != 'pending_approval') THEN
    -- Calculate week dates from week_starting
    v_week_start := NEW.week_starting::DATE;
    v_week_end := v_week_start + INTERVAL '6 days';
    
    -- Create pending approval records for each day of the week
    v_date := v_week_start;
    WHILE v_date <= v_week_end LOOP
      -- Calculate hours for this day
      SELECT COALESCE(SUM(net_hours), 0) INTO v_hours
      FROM public.rota_shifts
      WHERE rota_id = NEW.id
        AND shift_date = v_date;
      
      -- Get forecast for this day
      SELECT predicted_revenue INTO v_forecast
      FROM public.rota_forecasts
      WHERE rota_id = NEW.id
        AND forecast_date = v_date;
      
      -- Insert pending approval (only if not already exists)
      INSERT INTO public.rota_day_approvals (
        rota_id,
        approval_date,
        status,
        hours_allocated,
        forecasted_sales
      ) VALUES (
        NEW.id,
        v_date,
        'pending',
        v_hours,
        v_forecast
      )
      ON CONFLICT (rota_id, approval_date) DO NOTHING;
      
      v_date := v_date + INTERVAL '1 day';
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$func$;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_auto_create_day_approvals ON public.rotas;
CREATE TRIGGER trigger_auto_create_day_approvals
  AFTER UPDATE OF status ON public.rotas
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_create_day_approvals();

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION public.update_rota_day_approvals_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $func$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$func$;

DROP TRIGGER IF EXISTS trigger_update_rota_day_approvals_updated_at ON public.rota_day_approvals;
CREATE TRIGGER trigger_update_rota_day_approvals_updated_at
  BEFORE UPDATE ON public.rota_day_approvals
  FOR EACH ROW
  EXECUTE FUNCTION public.update_rota_day_approvals_updated_at();

NOTIFY pgrst, 'reload schema';

