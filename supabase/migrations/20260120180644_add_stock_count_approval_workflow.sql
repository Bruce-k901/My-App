-- ============================================================================
-- Migration: Add Stock Count Approval Workflow
-- Description: Adds approval workflow fields including ready_for_approval status,
--              approver tracking, auto-approve flags, and approval comments
-- Date: 2026-01-20
-- ============================================================================

BEGIN;

-- ============================================================================
-- Add approval workflow fields to stock_counts
-- ============================================================================
DO $$
BEGIN
  -- Determine which schema has stock_counts
  IF EXISTS (SELECT 1 FROM information_schema.tables 
             WHERE table_schema = 'stockly' AND table_name = 'stock_counts') THEN
    -- Working with stockly schema
    
    -- Add ready_for_approval_at if it doesn't exist
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'stockly' 
      AND table_name = 'stock_counts' 
      AND column_name = 'ready_for_approval_at'
    ) THEN
      ALTER TABLE stockly.stock_counts
      ADD COLUMN ready_for_approval_at timestamptz;
    END IF;

    -- Add ready_for_approval_by if it doesn't exist
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'stockly' 
      AND table_name = 'stock_counts' 
      AND column_name = 'ready_for_approval_by'
    ) THEN
      ALTER TABLE stockly.stock_counts
      ADD COLUMN ready_for_approval_by uuid REFERENCES public.profiles(id);
    END IF;

    -- Add approver_id if it doesn't exist
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'stockly' 
      AND table_name = 'stock_counts' 
      AND column_name = 'approver_id'
    ) THEN
      ALTER TABLE stockly.stock_counts
      ADD COLUMN approver_id uuid REFERENCES public.profiles(id);
    END IF;

    -- Add auto_approved flag if it doesn't exist
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'stockly' 
      AND table_name = 'stock_counts' 
      AND column_name = 'auto_approved'
    ) THEN
      ALTER TABLE stockly.stock_counts
      ADD COLUMN auto_approved boolean DEFAULT false;
    END IF;

    -- Add auto_approved_at if it doesn't exist
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'stockly' 
      AND table_name = 'stock_counts' 
      AND column_name = 'auto_approved_at'
    ) THEN
      ALTER TABLE stockly.stock_counts
      ADD COLUMN auto_approved_at timestamptz;
    END IF;

    -- Add approved_by if it doesn't exist (for manual approvals)
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'stockly' 
      AND table_name = 'stock_counts' 
      AND column_name = 'approved_by'
    ) THEN
      ALTER TABLE stockly.stock_counts
      ADD COLUMN approved_by uuid REFERENCES public.profiles(id);
    END IF;

    -- Add approved_at if it doesn't exist
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'stockly' 
      AND table_name = 'stock_counts' 
      AND column_name = 'approved_at'
    ) THEN
      ALTER TABLE stockly.stock_counts
      ADD COLUMN approved_at timestamptz;
    END IF;

    -- Update status constraint to include 'ready_for_approval'
    -- First, drop the existing constraint if it exists
    IF EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE table_schema = 'stockly' 
      AND table_name = 'stock_counts' 
      AND constraint_name = 'stock_counts_status_check'
    ) THEN
      ALTER TABLE stockly.stock_counts
      DROP CONSTRAINT stock_counts_status_check;
    END IF;

    -- Add new constraint with 'ready_for_approval' status
    ALTER TABLE stockly.stock_counts
    ADD CONSTRAINT stock_counts_status_check 
    CHECK (status IN ('draft', 'in_progress', 'completed', 'ready_for_approval', 'pending_review', 'approved', 'rejected', 'finalized', 'cancelled', 'locked'));

  ELSIF EXISTS (SELECT 1 FROM information_schema.tables 
                WHERE table_schema = 'public' AND table_name = 'stock_counts') THEN
    -- Working with public schema
    
    -- Add ready_for_approval_at if it doesn't exist
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'stock_counts' 
      AND column_name = 'ready_for_approval_at'
    ) THEN
      ALTER TABLE public.stock_counts
      ADD COLUMN ready_for_approval_at timestamptz;
    END IF;

    -- Add ready_for_approval_by if it doesn't exist
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'stock_counts' 
      AND column_name = 'ready_for_approval_by'
    ) THEN
      ALTER TABLE public.stock_counts
      ADD COLUMN ready_for_approval_by uuid REFERENCES public.profiles(id);
    END IF;

    -- Add approver_id if it doesn't exist
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'stock_counts' 
      AND column_name = 'approver_id'
    ) THEN
      ALTER TABLE public.stock_counts
      ADD COLUMN approver_id uuid REFERENCES public.profiles(id);
    END IF;

    -- Add auto_approved flag if it doesn't exist
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'stock_counts' 
      AND column_name = 'auto_approved'
    ) THEN
      ALTER TABLE public.stock_counts
      ADD COLUMN auto_approved boolean DEFAULT false;
    END IF;

    -- Add auto_approved_at if it doesn't exist
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'stock_counts' 
      AND column_name = 'auto_approved_at'
    ) THEN
      ALTER TABLE public.stock_counts
      ADD COLUMN auto_approved_at timestamptz;
    END IF;

    -- Add approved_by if it doesn't exist
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'stock_counts' 
      AND column_name = 'approved_by'
    ) THEN
      ALTER TABLE public.stock_counts
      ADD COLUMN approved_by uuid REFERENCES public.profiles(id);
    END IF;

    -- Add approved_at if it doesn't exist
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'stock_counts' 
      AND column_name = 'approved_at'
    ) THEN
      ALTER TABLE public.stock_counts
      ADD COLUMN approved_at timestamptz;
    END IF;

    -- Update status constraint to include 'ready_for_approval'
    -- First, drop the existing constraint if it exists
    IF EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE table_schema = 'public' 
      AND table_name = 'stock_counts' 
      AND constraint_name = 'stock_counts_status_check'
    ) THEN
      ALTER TABLE public.stock_counts
      DROP CONSTRAINT stock_counts_status_check;
    END IF;

    -- Add new constraint with 'ready_for_approval' status
    ALTER TABLE public.stock_counts
    ADD CONSTRAINT stock_counts_status_check 
    CHECK (status IN ('draft', 'in_progress', 'completed', 'ready_for_approval', 'pending_review', 'approved', 'rejected', 'finalized', 'cancelled', 'locked'));
  END IF;
END $$;

-- ============================================================================
-- Add approval_comments to stock_count_items
-- ============================================================================
DO $$
BEGIN
  -- Check stockly schema first
  IF EXISTS (SELECT 1 FROM information_schema.tables 
             WHERE table_schema = 'stockly' AND table_name = 'stock_count_items') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'stockly' 
      AND table_name = 'stock_count_items' 
      AND column_name = 'approval_comments'
    ) THEN
      ALTER TABLE stockly.stock_count_items
      ADD COLUMN approval_comments text;
    END IF;
  -- Check public schema
  ELSIF EXISTS (SELECT 1 FROM information_schema.tables 
                WHERE table_schema = 'public' AND table_name = 'stock_count_items') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'stock_count_items' 
      AND column_name = 'approval_comments'
    ) THEN
      ALTER TABLE public.stock_count_items
      ADD COLUMN approval_comments text;
    END IF;
  END IF;
END $$;

COMMIT;
