-- Create planly_standing_orders table
CREATE TABLE IF NOT EXISTS public.planly_standing_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Links to planly schema
  customer_id UUID NOT NULL REFERENCES public.planly_customers(id) ON DELETE CASCADE,
  site_id UUID NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,

  -- Schedule
  delivery_days TEXT[] NOT NULL, -- e.g., ['monday', 'wednesday', 'friday']
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE, -- NULL = no end date

  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  is_paused BOOLEAN DEFAULT FALSE,

  -- Products and Quantities (stored as JSONB)
  -- Example: [{"product_id": "uuid", "quantity": 12}, {"product_id": "uuid", "quantity": 6}]
  items JSONB NOT NULL DEFAULT '[]'::jsonb,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_items CHECK (jsonb_typeof(items) = 'array'),
  CONSTRAINT has_delivery_days CHECK (array_length(delivery_days, 1) > 0)
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_planly_standing_orders_customer
  ON public.planly_standing_orders(customer_id);

CREATE INDEX IF NOT EXISTS idx_planly_standing_orders_site
  ON public.planly_standing_orders(site_id);

CREATE INDEX IF NOT EXISTS idx_planly_standing_orders_active
  ON public.planly_standing_orders(is_active)
  WHERE is_active = TRUE;

-- Enable RLS
ALTER TABLE public.planly_standing_orders ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Allow all authenticated users to manage standing orders
CREATE POLICY "Authenticated users can manage planly standing orders"
  ON public.planly_standing_orders
  FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- Add comment
COMMENT ON TABLE public.planly_standing_orders IS
  'Standing orders for planly customers - automatically generates orders for specified delivery days';
