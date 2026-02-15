-- ============================================================================
-- Migration: 05-stockly-recipes.sql
-- Description: Recipe Builder & Cost Management
-- Run FIFTH in Supabase SQL Editor (after 01-04)
-- ============================================================================

BEGIN;

-- ============================================================================
-- RECIPE TYPES OVERVIEW
-- ============================================================================
-- PREP: Sub-recipe (dough, sauce, stock) - becomes usable as ingredient
-- DISH: Sellable menu item with fixed recipe
-- COMPOSITE: Weighted average of variants (gelato scoops, cocktail flights)
-- MODIFIER: Add-on/extra that adjusts base dish cost

-- ============================================================================
-- RECIPES TABLE (Master recipe record)
-- ============================================================================

DROP TABLE IF EXISTS stockly.recipe_cost_history CASCADE;
DROP TABLE IF EXISTS stockly.recipe_portions CASCADE;
DROP TABLE IF EXISTS stockly.recipe_modifiers CASCADE;
DROP TABLE IF EXISTS stockly.recipe_variants CASCADE;
DROP TABLE IF EXISTS stockly.recipe_ingredients CASCADE;
DROP TABLE IF EXISTS stockly.recipes CASCADE;

CREATE TABLE stockly.recipes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    
    -- Basic info
    name TEXT NOT NULL,
    description TEXT,
    recipe_type TEXT NOT NULL DEFAULT 'dish' CHECK (recipe_type IN ('prep', 'dish', 'composite', 'modifier')),
    
    -- Categorisation
    category_id UUID REFERENCES stockly.stock_categories(id) ON DELETE SET NULL,
    menu_category TEXT, -- 'Starters', 'Mains', 'Desserts', 'Drinks'
    
    -- Yield & Portions
    yield_quantity NUMERIC(10,3) NOT NULL DEFAULT 1, -- How many portions/units this makes
    yield_unit TEXT NOT NULL DEFAULT 'portion', -- 'portion', 'litre', 'kg', 'batch'
    
    -- For PREP recipes that become ingredients
    is_ingredient BOOLEAN DEFAULT FALSE, -- Can this be used in other recipes?
    base_unit TEXT, -- Unit when used as ingredient (kg, litre, each)
    shelf_life_days INTEGER, -- How long prep keeps
    
    -- Costing
    total_cost NUMERIC(12,4) DEFAULT 0, -- Sum of all ingredients
    cost_per_portion NUMERIC(12,4) DEFAULT 0, -- total_cost / yield_quantity
    
    -- Selling
    sell_price NUMERIC(10,2), -- Menu price (ex VAT)
    vat_rate NUMERIC(5,2) DEFAULT 20,
    target_gp_percent NUMERIC(5,2) DEFAULT 70, -- Target GP%
    actual_gp_percent NUMERIC(5,2), -- Calculated GP%
    
    -- For COMPOSITE recipes (weighted average)
    -- The variants are stored in recipe_variants table
    use_weighted_average BOOLEAN DEFAULT FALSE,
    
    -- POS linking
    pos_item_code TEXT, -- PLU/SKU to match with POS
    pos_item_name TEXT, -- Name as appears on POS
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    is_archived BOOLEAN DEFAULT FALSE,
    
    -- Versioning
    version INTEGER DEFAULT 1,
    last_costed_at TIMESTAMPTZ,
    
    -- Media
    image_url TEXT,
    
    -- Metadata
    notes TEXT,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT recipes_name_unique UNIQUE(company_id, name)
);

-- ============================================================================
-- RECIPE INGREDIENTS (Items in a recipe)
-- ============================================================================

CREATE TABLE stockly.recipe_ingredients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipe_id UUID NOT NULL REFERENCES stockly.recipes(id) ON DELETE CASCADE,
    
    -- The ingredient (either stock item OR another prep recipe)
    stock_item_id UUID REFERENCES stockly.stock_items(id) ON DELETE SET NULL,
    sub_recipe_id UUID REFERENCES stockly.recipes(id) ON DELETE SET NULL,
    
    -- Must have one or the other
    CONSTRAINT ingredient_source CHECK (
        (stock_item_id IS NOT NULL AND sub_recipe_id IS NULL) OR
        (stock_item_id IS NULL AND sub_recipe_id IS NOT NULL)
    ),
    
    -- Quantity needed
    quantity NUMERIC(12,4) NOT NULL CHECK (quantity > 0),
    unit TEXT NOT NULL, -- 'kg', 'g', 'litre', 'ml', 'each'
    
    -- Yield/waste factor (e.g., 0.85 = 15% waste when prepping)
    yield_factor NUMERIC(5,3) DEFAULT 1.000 CHECK (yield_factor > 0 AND yield_factor <= 1),
    
    -- Cost (calculated from stock item or sub-recipe)
    unit_cost NUMERIC(12,4) DEFAULT 0, -- Cost per unit
    gross_quantity NUMERIC(12,4), -- quantity / yield_factor (what you actually need)
    line_cost NUMERIC(12,4) DEFAULT 0, -- gross_quantity * unit_cost
    
    -- For display/instructions
    preparation_notes TEXT, -- "Finely diced", "Room temperature"
    display_order INTEGER DEFAULT 0,
    is_optional BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- RECIPE VARIANTS (For COMPOSITE type)
-- e.g., Different gelato flavours that all sell as "1 scoop"
-- ============================================================================

CREATE TABLE stockly.recipe_variants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_recipe_id UUID NOT NULL REFERENCES stockly.recipes(id) ON DELETE CASCADE,
    variant_recipe_id UUID NOT NULL REFERENCES stockly.recipes(id) ON DELETE CASCADE,
    
    -- Weighting (percentage of sales mix)
    sales_weight NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (sales_weight >= 0 AND sales_weight <= 100), -- e.g., 25.00 = 25%
    
    -- Override cost if different from variant recipe
    override_cost NUMERIC(12,4),
    
    -- Tracking actual sales mix
    actual_sales_count INTEGER DEFAULT 0,
    last_sales_update TIMESTAMPTZ,
    
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT unique_variant UNIQUE(parent_recipe_id, variant_recipe_id),
    CONSTRAINT no_self_reference CHECK (parent_recipe_id != variant_recipe_id)
);

-- ============================================================================
-- RECIPE MODIFIERS (Add-ons / Extras)
-- e.g., "Extra cheese +£1.50", "Add bacon +£2.00"
-- ============================================================================

CREATE TABLE stockly.recipe_modifiers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipe_id UUID NOT NULL REFERENCES stockly.recipes(id) ON DELETE CASCADE,
    
    -- The modifier (can be stock item, prep recipe, or another modifier recipe)
    name TEXT NOT NULL,
    modifier_recipe_id UUID REFERENCES stockly.recipes(id) ON DELETE SET NULL,
    stock_item_id UUID REFERENCES stockly.stock_items(id) ON DELETE SET NULL,
    
    -- Quantity added
    quantity NUMERIC(10,3) DEFAULT 1 CHECK (quantity > 0),
    unit TEXT DEFAULT 'each',
    
    -- Cost impact
    additional_cost NUMERIC(10,4) DEFAULT 0,
    
    -- Price impact
    price_adjustment NUMERIC(10,2) DEFAULT 0, -- How much extra customer pays
    
    -- Grouping (e.g., "Toppings", "Sides", "Upgrades")
    modifier_group TEXT,
    
    -- Rules
    is_default BOOLEAN DEFAULT FALSE, -- Included by default?
    max_quantity INTEGER DEFAULT 1 CHECK (max_quantity > 0),
    
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure modifier has either recipe or stock item
    CONSTRAINT modifier_source CHECK (
        (modifier_recipe_id IS NOT NULL AND stock_item_id IS NULL) OR
        (modifier_recipe_id IS NULL AND stock_item_id IS NOT NULL)
    )
);

-- ============================================================================
-- RECIPE PORTION SIZES
-- e.g., Small/Medium/Large with different quantities
-- ============================================================================

CREATE TABLE stockly.recipe_portions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipe_id UUID NOT NULL REFERENCES stockly.recipes(id) ON DELETE CASCADE,
    
    name TEXT NOT NULL, -- 'Small', 'Medium', 'Large', 'Kids'
    size_code TEXT, -- 'S', 'M', 'L', 'K'
    
    -- Multiplier against base recipe
    quantity_multiplier NUMERIC(5,3) NOT NULL DEFAULT 1.000 CHECK (quantity_multiplier > 0), -- 0.5 = half portion
    
    -- Calculated costs
    portion_cost NUMERIC(12,4),
    
    -- Selling
    sell_price NUMERIC(10,2),
    gp_percent NUMERIC(5,2),
    
    -- POS linking
    pos_item_code TEXT,
    
    is_default BOOLEAN DEFAULT FALSE,
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT unique_portion_name UNIQUE(recipe_id, name)
);

-- ============================================================================
-- RECIPE COST HISTORY
-- Track cost changes over time
-- ============================================================================

CREATE TABLE stockly.recipe_cost_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipe_id UUID NOT NULL REFERENCES stockly.recipes(id) ON DELETE CASCADE,
    
    costed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    total_cost NUMERIC(12,4),
    cost_per_portion NUMERIC(12,4),
    gp_percent NUMERIC(5,2),
    
    -- What triggered the recost
    trigger_type TEXT, -- 'manual', 'price_change', 'ingredient_change', 'scheduled'
    trigger_details JSONB,
    
    costed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX idx_recipes_company ON stockly.recipes(company_id);
CREATE INDEX idx_recipes_type ON stockly.recipes(recipe_type);
CREATE INDEX idx_recipes_category ON stockly.recipes(category_id);
CREATE INDEX idx_recipes_active ON stockly.recipes(company_id, is_active) WHERE is_active = true;
CREATE INDEX idx_recipes_ingredient ON stockly.recipes(company_id, is_ingredient) WHERE is_ingredient = true;
CREATE INDEX idx_recipes_pos_code ON stockly.recipes(pos_item_code) WHERE pos_item_code IS NOT NULL;
CREATE INDEX idx_recipe_ingredients_recipe ON stockly.recipe_ingredients(recipe_id);
CREATE INDEX idx_recipe_ingredients_stock ON stockly.recipe_ingredients(stock_item_id) WHERE stock_item_id IS NOT NULL;
CREATE INDEX idx_recipe_ingredients_sub ON stockly.recipe_ingredients(sub_recipe_id) WHERE sub_recipe_id IS NOT NULL;

-- Unique index to prevent duplicate ingredients per recipe
-- Uses COALESCE to handle NULL values in unique constraint
CREATE UNIQUE INDEX idx_recipe_ingredients_unique ON stockly.recipe_ingredients(
    recipe_id, 
    COALESCE(stock_item_id, '00000000-0000-0000-0000-000000000000'::uuid), 
    COALESCE(sub_recipe_id, '00000000-0000-0000-0000-000000000000'::uuid)
);
CREATE INDEX idx_recipe_variants_parent ON stockly.recipe_variants(parent_recipe_id);
CREATE INDEX idx_recipe_variants_variant ON stockly.recipe_variants(variant_recipe_id);
CREATE INDEX idx_recipe_modifiers_recipe ON stockly.recipe_modifiers(recipe_id);
CREATE INDEX idx_recipe_portions_recipe ON stockly.recipe_portions(recipe_id);
CREATE INDEX idx_recipe_cost_history_recipe ON stockly.recipe_cost_history(recipe_id, costed_at DESC);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE stockly.recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE stockly.recipe_ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE stockly.recipe_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE stockly.recipe_modifiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE stockly.recipe_portions ENABLE ROW LEVEL SECURITY;
ALTER TABLE stockly.recipe_cost_history ENABLE ROW LEVEL SECURITY;

-- Recipes RLS - Fixed to properly check company_id
DROP POLICY IF EXISTS "stockly_recipes_all" ON stockly.recipes;
CREATE POLICY "stockly_recipes_all" ON stockly.recipes FOR ALL 
    USING (
        company_id IN (
            SELECT company_id FROM public.profiles WHERE id = auth.uid()
        )
    );

-- Recipe Ingredients RLS - Fixed to check company via parent recipe
DROP POLICY IF EXISTS "stockly_recipe_ingredients_all" ON stockly.recipe_ingredients;
CREATE POLICY "stockly_recipe_ingredients_all" ON stockly.recipe_ingredients FOR ALL 
    USING (
        EXISTS (
            SELECT 1 FROM stockly.recipes r
            JOIN public.profiles p ON p.company_id = r.company_id
            WHERE r.id = recipe_ingredients.recipe_id 
            AND p.id = auth.uid()
        )
    );

-- Recipe Variants RLS - Fixed to check company via parent recipe
DROP POLICY IF EXISTS "stockly_recipe_variants_all" ON stockly.recipe_variants;
CREATE POLICY "stockly_recipe_variants_all" ON stockly.recipe_variants FOR ALL 
    USING (
        EXISTS (
            SELECT 1 FROM stockly.recipes r
            JOIN public.profiles p ON p.company_id = r.company_id
            WHERE r.id = recipe_variants.parent_recipe_id 
            AND p.id = auth.uid()
        )
    );

-- Recipe Modifiers RLS - Fixed to check company via parent recipe
DROP POLICY IF EXISTS "stockly_recipe_modifiers_all" ON stockly.recipe_modifiers;
CREATE POLICY "stockly_recipe_modifiers_all" ON stockly.recipe_modifiers FOR ALL 
    USING (
        EXISTS (
            SELECT 1 FROM stockly.recipes r
            JOIN public.profiles p ON p.company_id = r.company_id
            WHERE r.id = recipe_modifiers.recipe_id 
            AND p.id = auth.uid()
        )
    );

-- Recipe Portions RLS - Fixed to check company via parent recipe
DROP POLICY IF EXISTS "stockly_recipe_portions_all" ON stockly.recipe_portions;
CREATE POLICY "stockly_recipe_portions_all" ON stockly.recipe_portions FOR ALL 
    USING (
        EXISTS (
            SELECT 1 FROM stockly.recipes r
            JOIN public.profiles p ON p.company_id = r.company_id
            WHERE r.id = recipe_portions.recipe_id 
            AND p.id = auth.uid()
        )
    );

-- Recipe Cost History RLS - Fixed to check company via parent recipe
DROP POLICY IF EXISTS "stockly_recipe_cost_history_all" ON stockly.recipe_cost_history;
CREATE POLICY "stockly_recipe_cost_history_all" ON stockly.recipe_cost_history FOR ALL 
    USING (
        EXISTS (
            SELECT 1 FROM stockly.recipes r
            JOIN public.profiles p ON p.company_id = r.company_id
            WHERE r.id = recipe_cost_history.recipe_id 
            AND p.id = auth.uid()
        )
    );

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Drop existing functions first
DROP FUNCTION IF EXISTS stockly.calculate_recipe_cost(UUID);
DROP FUNCTION IF EXISTS stockly.recalculate_all_recipes(UUID);
DROP FUNCTION IF EXISTS stockly.get_recipe_cost_breakdown(UUID);
DROP FUNCTION IF EXISTS stockly.trigger_recalculate_recipe();

-- Calculate Recipe Cost
CREATE OR REPLACE FUNCTION stockly.calculate_recipe_cost(p_recipe_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_recipe RECORD;
    v_total_cost NUMERIC(12,4) := 0;
    v_ingredient RECORD;
    v_sub_cost NUMERIC(12,4);
    v_weighted_cost NUMERIC(12,4);
    v_variant RECORD;
    v_result JSONB;
    v_cost_per_portion NUMERIC(12,4);
    v_gp_percent NUMERIC(5,2);
BEGIN
    -- Get recipe
    SELECT * INTO v_recipe FROM stockly.recipes WHERE id = p_recipe_id;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('error', 'Recipe not found');
    END IF;
    
    -- For COMPOSITE recipes, calculate weighted average
    IF v_recipe.recipe_type = 'composite' AND v_recipe.use_weighted_average THEN
        v_weighted_cost := 0;
        
        FOR v_variant IN 
            SELECT rv.*, r.cost_per_portion as variant_cost
            FROM stockly.recipe_variants rv
            JOIN stockly.recipes r ON r.id = rv.variant_recipe_id
            WHERE rv.parent_recipe_id = p_recipe_id 
            AND rv.is_active = true
            AND r.is_active = true
        LOOP
            v_weighted_cost := v_weighted_cost + 
                (COALESCE(v_variant.override_cost, v_variant.variant_cost, 0) * v_variant.sales_weight / 100);
        END LOOP;
        
        v_total_cost := v_weighted_cost;
    ELSE
        -- Standard recipe - sum ingredients
        FOR v_ingredient IN 
            SELECT ri.*, 
                   si.name as item_name,
                   COALESCE(
                       (SELECT unit_price FROM stockly.product_variants 
                        WHERE stock_item_id = si.id AND is_preferred = true LIMIT 1),
                       si.current_cost,
                       0
                   ) as stock_price
            FROM stockly.recipe_ingredients ri
            LEFT JOIN stockly.stock_items si ON si.id = ri.stock_item_id
            WHERE ri.recipe_id = p_recipe_id
        LOOP
            IF v_ingredient.sub_recipe_id IS NOT NULL THEN
                -- Get sub-recipe cost per portion
                SELECT cost_per_portion INTO v_sub_cost
                FROM stockly.recipes 
                WHERE id = v_ingredient.sub_recipe_id;
                
                v_ingredient.unit_cost := COALESCE(v_sub_cost, 0);
            ELSE
                v_ingredient.unit_cost := COALESCE(v_ingredient.stock_price, 0);
            END IF;
            
            -- Calculate gross quantity (accounting for yield/waste)
            v_ingredient.gross_quantity := v_ingredient.quantity / NULLIF(v_ingredient.yield_factor, 0);
            v_ingredient.line_cost := v_ingredient.gross_quantity * v_ingredient.unit_cost;
            
            -- Update the ingredient record (without triggering recalc to avoid loops)
            UPDATE stockly.recipe_ingredients
            SET unit_cost = v_ingredient.unit_cost,
                gross_quantity = v_ingredient.gross_quantity,
                line_cost = v_ingredient.line_cost,
                updated_at = NOW()
            WHERE id = v_ingredient.id;
            
            v_total_cost := v_total_cost + COALESCE(v_ingredient.line_cost, 0);
        END LOOP;
    END IF;
    
    -- Calculate cost per portion
    v_cost_per_portion := v_total_cost / NULLIF(v_recipe.yield_quantity, 0);
    
    -- Calculate GP percent
    IF v_recipe.sell_price > 0 THEN
        v_gp_percent := ROUND(((v_recipe.sell_price - v_cost_per_portion) / v_recipe.sell_price * 100)::NUMERIC, 1);
    ELSE
        v_gp_percent := NULL;
    END IF;
    
    -- Update recipe (use a temp flag to prevent trigger loops)
    UPDATE stockly.recipes
    SET total_cost = v_total_cost,
        cost_per_portion = v_cost_per_portion,
        actual_gp_percent = v_gp_percent,
        last_costed_at = NOW(),
        updated_at = NOW()
    WHERE id = p_recipe_id;
    
    -- Update portion sizes
    UPDATE stockly.recipe_portions
    SET portion_cost = v_cost_per_portion * quantity_multiplier,
        gp_percent = CASE 
            WHEN sell_price > 0 THEN 
                ROUND(((sell_price - (v_cost_per_portion * quantity_multiplier)) / sell_price * 100)::NUMERIC, 1)
            ELSE NULL 
        END
    WHERE recipe_id = p_recipe_id;
    
    -- Build result
    v_result := jsonb_build_object(
        'recipe_id', p_recipe_id,
        'total_cost', v_total_cost,
        'cost_per_portion', v_cost_per_portion,
        'yield_quantity', v_recipe.yield_quantity,
        'sell_price', v_recipe.sell_price,
        'gp_percent', v_gp_percent
    );
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recalculate All Recipes for a Company
CREATE OR REPLACE FUNCTION stockly.recalculate_all_recipes(p_company_id UUID)
RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER := 0;
    v_recipe_id UUID;
BEGIN
    -- First recalculate PREP recipes (they're used as ingredients)
    FOR v_recipe_id IN 
        SELECT id FROM stockly.recipes 
        WHERE company_id = p_company_id 
        AND recipe_type = 'prep' 
        AND is_active = true
        ORDER BY created_at
    LOOP
        PERFORM stockly.calculate_recipe_cost(v_recipe_id);
        v_count := v_count + 1;
    END LOOP;
    
    -- Then recalculate MODIFIER recipes
    FOR v_recipe_id IN 
        SELECT id FROM stockly.recipes 
        WHERE company_id = p_company_id 
        AND recipe_type = 'modifier' 
        AND is_active = true
        ORDER BY created_at
    LOOP
        PERFORM stockly.calculate_recipe_cost(v_recipe_id);
        v_count := v_count + 1;
    END LOOP;
    
    -- Then recalculate DISH recipes
    FOR v_recipe_id IN 
        SELECT id FROM stockly.recipes 
        WHERE company_id = p_company_id 
        AND recipe_type = 'dish' 
        AND is_active = true
        ORDER BY created_at
    LOOP
        PERFORM stockly.calculate_recipe_cost(v_recipe_id);
        v_count := v_count + 1;
    END LOOP;
    
    -- Finally COMPOSITE recipes (they reference other recipes)
    FOR v_recipe_id IN 
        SELECT id FROM stockly.recipes 
        WHERE company_id = p_company_id 
        AND recipe_type = 'composite' 
        AND is_active = true
        ORDER BY created_at
    LOOP
        PERFORM stockly.calculate_recipe_cost(v_recipe_id);
        v_count := v_count + 1;
    END LOOP;
    
    RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get Recipe Cost Breakdown
CREATE OR REPLACE FUNCTION stockly.get_recipe_cost_breakdown(p_recipe_id UUID)
RETURNS TABLE (
    ingredient_id UUID,
    ingredient_name TEXT,
    ingredient_type TEXT,
    quantity NUMERIC,
    unit TEXT,
    yield_factor NUMERIC,
    gross_quantity NUMERIC,
    unit_cost NUMERIC,
    line_cost NUMERIC,
    cost_percentage NUMERIC
) AS $$
DECLARE
    v_total_cost NUMERIC;
BEGIN
    -- Get total cost
    SELECT total_cost INTO v_total_cost FROM stockly.recipes WHERE id = p_recipe_id;
    
    RETURN QUERY
    SELECT 
        ri.id as ingredient_id,
        COALESCE(si.name, sr.name, 'Unknown') as ingredient_name,
        CASE 
            WHEN ri.stock_item_id IS NOT NULL THEN 'stock_item'
            WHEN ri.sub_recipe_id IS NOT NULL THEN 'sub_recipe'
            ELSE 'unknown'
        END as ingredient_type,
        ri.quantity,
        ri.unit,
        ri.yield_factor,
        ri.gross_quantity,
        ri.unit_cost,
        ri.line_cost,
        CASE WHEN v_total_cost > 0 
            THEN ROUND((ri.line_cost / v_total_cost * 100)::NUMERIC, 1)
            ELSE 0 
        END as cost_percentage
    FROM stockly.recipe_ingredients ri
    LEFT JOIN stockly.stock_items si ON si.id = ri.stock_item_id
    LEFT JOIN stockly.recipes sr ON sr.id = ri.sub_recipe_id
    WHERE ri.recipe_id = p_recipe_id
    ORDER BY ri.display_order, ri.created_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- TRIGGER: Auto-recalculate on ingredient change
-- ============================================================================

CREATE OR REPLACE FUNCTION stockly.trigger_recalculate_recipe()
RETURNS TRIGGER AS $$
BEGIN
    -- Prevent infinite loops by checking if we're already in a calculation
    -- Only recalculate if this isn't triggered by calculate_recipe_cost itself
    IF TG_OP = 'DELETE' THEN
        PERFORM stockly.calculate_recipe_cost(OLD.recipe_id);
    ELSE
        PERFORM stockly.calculate_recipe_cost(NEW.recipe_id);
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS recipe_ingredients_changed ON stockly.recipe_ingredients;
CREATE TRIGGER recipe_ingredients_changed
    AFTER INSERT OR UPDATE OR DELETE ON stockly.recipe_ingredients
    FOR EACH ROW 
    EXECUTE FUNCTION stockly.trigger_recalculate_recipe();

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION stockly.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS recipes_updated_at ON stockly.recipes;
CREATE TRIGGER recipes_updated_at
    BEFORE UPDATE ON stockly.recipes
    FOR EACH ROW
    EXECUTE FUNCTION stockly.update_updated_at();

DROP TRIGGER IF EXISTS recipe_ingredients_updated_at ON stockly.recipe_ingredients;
CREATE TRIGGER recipe_ingredients_updated_at
    BEFORE UPDATE ON stockly.recipe_ingredients
    FOR EACH ROW
    EXECUTE FUNCTION stockly.update_updated_at();

-- ============================================================================
-- GRANTS
-- ============================================================================

GRANT ALL ON ALL TABLES IN SCHEMA stockly TO authenticated;
GRANT EXECUTE ON FUNCTION stockly.calculate_recipe_cost(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION stockly.recalculate_all_recipes(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION stockly.get_recipe_cost_breakdown(UUID) TO authenticated;

COMMIT;

SELECT 'Recipe system created successfully!' as status;
