-- =====================================================
-- SHIFT SWAP REQUESTS TABLE
-- Staff requesting to swap or give away shifts
-- =====================================================
-- Note: This migration will be skipped if required tables don't exist yet

DO $$
BEGIN
  -- Only proceed if required tables exist
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'companies')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'scheduled_shifts') THEN

    CREATE TABLE IF NOT EXISTS shift_swap_requests (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      company_id UUID NOT NULL,
      
      -- The shift being offered
      original_shift_id UUID NOT NULL,
      
      -- Who's offering the shift
      requesting_profile_id UUID NOT NULL,
      
      -- Type of swap
      swap_type TEXT NOT NULL DEFAULT 'swap',
      -- Values: 'swap' (exchange shifts), 'giveaway' (just give away), 'cover' (need someone to cover)
      
      -- Target (if swapping with specific person)
      target_profile_id UUID,
      target_shift_id UUID,
      
      -- Or open to anyone
      is_open BOOLEAN DEFAULT false,
      
      -- Status
      status TEXT NOT NULL DEFAULT 'pending',
      -- Values: 'pending', 'accepted', 'declined', 'cancelled', 'expired', 'manager_pending', 'approved'
      
      -- Response tracking
      responded_by UUID,
      responded_at TIMESTAMPTZ,
      
      -- Manager approval
      requires_manager_approval BOOLEAN DEFAULT true,
      manager_approved BOOLEAN,
      approved_by UUID,
      approved_at TIMESTAMPTZ,
      
      -- Notes
      reason TEXT,
      response_notes TEXT,
      manager_notes TEXT,
      
      -- Expiry
      expires_at TIMESTAMPTZ,
      
      -- Audit
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now(),
      
      CONSTRAINT valid_swap_type CHECK (
        swap_type IN ('swap', 'giveaway', 'cover')
      ),
      CONSTRAINT valid_status CHECK (
        status IN ('pending', 'accepted', 'declined', 'cancelled', 'expired', 'manager_pending', 'approved')
      )
    );

    -- Add foreign key constraints
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE table_schema = 'public' 
      AND table_name = 'shift_swap_requests' 
      AND constraint_name LIKE '%company_id%'
    ) THEN
      ALTER TABLE shift_swap_requests 
      ADD CONSTRAINT shift_swap_requests_company_id_fkey 
      FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE table_schema = 'public' 
      AND table_name = 'shift_swap_requests' 
      AND constraint_name LIKE '%original_shift_id%'
    ) THEN
      ALTER TABLE shift_swap_requests 
      ADD CONSTRAINT shift_swap_requests_original_shift_id_fkey 
      FOREIGN KEY (original_shift_id) REFERENCES scheduled_shifts(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE table_schema = 'public' 
      AND table_name = 'shift_swap_requests' 
      AND constraint_name LIKE '%requesting_profile_id%'
    ) THEN
      ALTER TABLE shift_swap_requests 
      ADD CONSTRAINT shift_swap_requests_requesting_profile_id_fkey 
      FOREIGN KEY (requesting_profile_id) REFERENCES profiles(id);
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE table_schema = 'public' 
      AND table_name = 'shift_swap_requests' 
      AND constraint_name LIKE '%target_profile_id%'
    ) THEN
      ALTER TABLE shift_swap_requests 
      ADD CONSTRAINT shift_swap_requests_target_profile_id_fkey 
      FOREIGN KEY (target_profile_id) REFERENCES profiles(id);
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE table_schema = 'public' 
      AND table_name = 'shift_swap_requests' 
      AND constraint_name LIKE '%target_shift_id%'
    ) THEN
      ALTER TABLE shift_swap_requests 
      ADD CONSTRAINT shift_swap_requests_target_shift_id_fkey 
      FOREIGN KEY (target_shift_id) REFERENCES scheduled_shifts(id);
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE table_schema = 'public' 
      AND table_name = 'shift_swap_requests' 
      AND constraint_name LIKE '%responded_by%'
    ) THEN
      ALTER TABLE shift_swap_requests 
      ADD CONSTRAINT shift_swap_requests_responded_by_fkey 
      FOREIGN KEY (responded_by) REFERENCES profiles(id);
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE table_schema = 'public' 
      AND table_name = 'shift_swap_requests' 
      AND constraint_name LIKE '%approved_by%'
    ) THEN
      ALTER TABLE shift_swap_requests 
      ADD CONSTRAINT shift_swap_requests_approved_by_fkey 
      FOREIGN KEY (approved_by) REFERENCES profiles(id);
    END IF;

    -- Indexes
    CREATE INDEX IF NOT EXISTS idx_swap_requests_company ON shift_swap_requests(company_id);
    CREATE INDEX IF NOT EXISTS idx_swap_requests_original_shift ON shift_swap_requests(original_shift_id);
    CREATE INDEX IF NOT EXISTS idx_swap_requests_requesting ON shift_swap_requests(requesting_profile_id);
    CREATE INDEX IF NOT EXISTS idx_swap_requests_target ON shift_swap_requests(target_profile_id);
    CREATE INDEX IF NOT EXISTS idx_swap_requests_pending ON shift_swap_requests(status) WHERE status IN ('pending', 'manager_pending');
    CREATE INDEX IF NOT EXISTS idx_swap_requests_open ON shift_swap_requests(company_id, is_open, status) WHERE is_open = true;

    -- RLS
    ALTER TABLE shift_swap_requests ENABLE ROW LEVEL SECURITY;

    -- Drop existing policies if they exist
    DROP POLICY IF EXISTS "view_own_swap_requests" ON shift_swap_requests;
    DROP POLICY IF EXISTS "view_open_swaps" ON shift_swap_requests;
    DROP POLICY IF EXISTS "managers_view_swaps" ON shift_swap_requests;
    DROP POLICY IF EXISTS "create_own_swap_requests" ON shift_swap_requests;
    DROP POLICY IF EXISTS "update_own_swap_requests" ON shift_swap_requests;
    DROP POLICY IF EXISTS "managers_manage_swaps" ON shift_swap_requests;

    -- Staff can view their own swap requests
    CREATE POLICY "view_own_swap_requests"
    ON shift_swap_requests FOR SELECT
    USING (
      requesting_profile_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid())
      OR target_profile_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid())
    );

    -- Staff can view open swaps at their company
    CREATE POLICY "view_open_swaps"
    ON shift_swap_requests FOR SELECT
    USING (
      is_open = true
      AND status = 'pending'
      AND company_id IN (SELECT company_id FROM profiles WHERE auth_user_id = auth.uid())
    );

    -- Managers can view all swaps
    CREATE POLICY "managers_view_swaps"
    ON shift_swap_requests FOR SELECT
    USING (
      company_id IN (
        SELECT company_id FROM profiles 
        WHERE auth_user_id = auth.uid() 
        AND LOWER(app_role::text) IN ('admin', 'owner', 'manager')
      )
    );

    -- Staff can create swap requests for their own shifts
    CREATE POLICY "create_own_swap_requests"
    ON shift_swap_requests FOR INSERT
    WITH CHECK (
      requesting_profile_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid())
    );

    -- Staff can update their own pending requests
    CREATE POLICY "update_own_swap_requests"
    ON shift_swap_requests FOR UPDATE
    USING (
      (requesting_profile_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid()) AND status = 'pending')
      OR (target_profile_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid()) AND status = 'pending')
    );

    -- Managers can approve/decline swaps
    CREATE POLICY "managers_manage_swaps"
    ON shift_swap_requests FOR UPDATE
    USING (
      company_id IN (
        SELECT company_id FROM profiles 
        WHERE auth_user_id = auth.uid() 
        AND LOWER(app_role::text) IN ('admin', 'owner', 'manager')
      )
    );

    -- =====================================================
    -- PROCESS APPROVED SWAP
    -- =====================================================

    CREATE OR REPLACE FUNCTION process_approved_swap(p_swap_id UUID)
    RETURNS BOOLEAN AS $function$
    DECLARE
      v_swap RECORD;
      v_original_profile UUID;
      v_new_profile UUID;
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'shift_swap_requests')
         OR NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'scheduled_shifts')
         OR NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
        RETURN false;
      END IF;

      SELECT * INTO v_swap FROM shift_swap_requests WHERE id = p_swap_id;
      
      IF NOT FOUND OR v_swap.status != 'approved' THEN
        RETURN false;
      END IF;
      
      SELECT profile_id INTO v_original_profile
      FROM scheduled_shifts WHERE id = v_swap.original_shift_id;
      
      IF v_swap.swap_type = 'swap' AND v_swap.target_profile_id IS NOT NULL THEN
        v_new_profile := v_swap.target_profile_id;
        
        IF v_swap.target_shift_id IS NOT NULL THEN
          UPDATE scheduled_shifts
          SET profile_id = v_original_profile, updated_at = now()
          WHERE id = v_swap.target_shift_id;
        END IF;
      ELSIF v_swap.responded_by IS NOT NULL THEN
        v_new_profile := v_swap.responded_by;
      ELSE
        RETURN false;
      END IF;
      
      UPDATE scheduled_shifts
      SET profile_id = v_new_profile,
          notes = COALESCE(notes, '') || ' [Swapped from ' || 
                  (SELECT full_name FROM profiles WHERE id = v_original_profile) || ']',
          updated_at = now()
      WHERE id = v_swap.original_shift_id;
      
      RETURN true;
    END;
    $function$ LANGUAGE plpgsql;

    RAISE NOTICE 'Created shift_swap_requests table with functions';

  ELSE
    RAISE NOTICE '⚠️ Required tables (companies, profiles, scheduled_shifts) do not exist yet - skipping shift_swap_requests table creation';
  END IF;
END $$;

