-- =============================================
-- OPEN SHIFT CLAIMING (STAFF SELF-ASSIGN)
-- Allows staff to accept an open rota shift safely (atomic, no race conditions)
-- =============================================
-- Notes:
-- - "Open shift" = rota_shifts.profile_id IS NULL
-- - rota_shifts updates are manager-only via RLS, so we use a SECURITY DEFINER RPC
-- - This function assigns the shift to auth.uid() only (staff can't assign others)

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'rota_shifts')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN

    CREATE OR REPLACE FUNCTION public.claim_open_shift(p_shift_id UUID)
    RETURNS JSONB
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    AS $func$
    DECLARE
      v_shift rota_shifts%ROWTYPE;
      v_conflict_count INTEGER := 0;
      v_company_id UUID;
    BEGIN
      -- Ensure caller has a profile (and capture company)
      SELECT company_id INTO v_company_id
      FROM public.profiles
      WHERE id = auth.uid();

      IF v_company_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
      END IF;

      -- Lock the shift row to avoid race conditions (two people accepting at once)
      SELECT * INTO v_shift
      FROM public.rota_shifts
      WHERE id = p_shift_id
      FOR UPDATE;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'Shift not found';
      END IF;

      -- Company boundary check
      IF v_shift.company_id <> v_company_id THEN
        RAISE EXCEPTION 'Not allowed';
      END IF;

      -- Must still be open
      IF v_shift.profile_id IS NOT NULL THEN
        RAISE EXCEPTION 'Shift already assigned';
      END IF;

      IF v_shift.status = 'cancelled' THEN
        RAISE EXCEPTION 'Shift cancelled';
      END IF;

      -- Basic overlap check: don't allow accepting if user already has a shift overlapping that day
      SELECT COUNT(*) INTO v_conflict_count
      FROM public.rota_shifts rs
      WHERE rs.profile_id = auth.uid()
        AND rs.shift_date = v_shift.shift_date
        AND rs.status <> 'cancelled'
        AND (rs.start_time, rs.end_time) OVERLAPS (v_shift.start_time, v_shift.end_time);

      IF v_conflict_count > 0 THEN
        RAISE EXCEPTION 'You already have a shift that overlaps this time';
      END IF;

      -- Assign shift to the current user (atomic with profile_id IS NULL guard)
      UPDATE public.rota_shifts
      SET
        profile_id = auth.uid(),
        status = 'confirmed',
        updated_at = NOW()
      WHERE id = p_shift_id
        AND profile_id IS NULL
      RETURNING * INTO v_shift;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'Shift already taken';
      END IF;

      -- Best-effort: mark any offer notifications for this shift as read (if notifications table exists)
      IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'notifications') THEN
        UPDATE public.notifications
        SET read = true
        WHERE (metadata->>'shift_id') = p_shift_id::TEXT;
      END IF;

      RETURN jsonb_build_object(
        'success', true,
        'shift_id', v_shift.id,
        'rota_id', v_shift.rota_id,
        'profile_id', v_shift.profile_id,
        'shift_date', v_shift.shift_date::TEXT,
        'start_time', v_shift.start_time::TEXT,
        'end_time', v_shift.end_time::TEXT
      );
    END;
    $func$;

    GRANT EXECUTE ON FUNCTION public.claim_open_shift(UUID) TO authenticated;

    RAISE NOTICE 'Created claim_open_shift(UUID) RPC';
  ELSE
    RAISE NOTICE '⚠️ Required tables do not exist yet - skipping open shift claim migration';
  END IF;
END $$;





