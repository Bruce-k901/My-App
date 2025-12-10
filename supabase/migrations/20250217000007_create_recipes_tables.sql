-- ============================================================================
-- Migration: Create Recipes Tables
-- Description: Recipes, ingredients, and circular reference guard
-- ============================================================================

BEGIN;

-- ============================================================================
-- RECIPES
-- ============================================================================
CREATE TABLE IF NOT EXISTS recipes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id),
    
    name TEXT NOT NULL,
    code TEXT,
    description TEXT,
    
    recipe_type TEXT NOT NULL CHECK (recipe_type IN (
        'menu_item', 'sub_recipe', 'prep_item', 'batch'
    )),
    
    category_id UUID REFERENCES stock_categories(id),
    
    output_qty DECIMAL(10,3) NOT NULL,
    output_unit_id UUID NOT NULL REFERENCES uom(id),
    portion_size DECIMAL(10,3),
    portions_per_batch DECIMAL(10,2),
    
    yield_percent DECIMAL(5,2) DEFAULT 100.00,
    yield_notes TEXT,
    
    creates_stock_item_id UUID REFERENCES stock_items(id),
    
    ingredient_cost DECIMAL(10,2),
    cost_per_portion DECIMAL(10,4),
    cost_updated_at TIMESTAMPTZ,
    
    menu_price DECIMAL(10,2),
    target_gp_percent DECIMAL(5,2) DEFAULT 70.00,
    actual_gp_percent DECIMAL(5,2),
    
    method_steps JSONB,
    prep_time_mins INTEGER,
    cook_time_mins INTEGER,
    
    pos_product_id TEXT,
    pos_category TEXT,
    
    is_active BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(company_id, name)
);

CREATE INDEX IF NOT EXISTS idx_recipes_company ON recipes(company_id);
CREATE INDEX IF NOT EXISTS idx_recipes_type ON recipes(recipe_type);
CREATE INDEX IF NOT EXISTS idx_recipes_creates_stock ON recipes(creates_stock_item_id);
CREATE INDEX IF NOT EXISTS idx_recipes_pos ON recipes(pos_product_id);

CREATE TABLE IF NOT EXISTS recipe_ingredients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    
    stock_item_id UUID REFERENCES stock_items(id),
    sub_recipe_id UUID REFERENCES recipes(id),
    
    quantity DECIMAL(10,4) NOT NULL,
    unit_id UUID NOT NULL REFERENCES uom(id),
    
    prep_notes TEXT,
    
    unit_cost DECIMAL(10,4),
    line_cost DECIMAL(10,2),
    
    sort_order INTEGER DEFAULT 0,
    
    CONSTRAINT ingredient_type CHECK (
        (stock_item_id IS NOT NULL AND sub_recipe_id IS NULL) OR
        (stock_item_id IS NULL AND sub_recipe_id IS NOT NULL)
    ),
    CONSTRAINT no_self_reference CHECK (sub_recipe_id != recipe_id)
);

CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_recipe ON recipe_ingredients(recipe_id);
CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_stock ON recipe_ingredients(stock_item_id);
CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_sub ON recipe_ingredients(sub_recipe_id);

-- Circular reference guard
CREATE OR REPLACE FUNCTION check_recipe_circular_ref()
RETURNS TRIGGER AS $$
DECLARE
    v_chain UUID[];
    v_current UUID;
BEGIN
    IF NEW.sub_recipe_id IS NULL THEN
        RETURN NEW;
    END IF;
    
    v_chain := ARRAY[NEW.recipe_id];
    v_current := NEW.sub_recipe_id;
    
    WHILE v_current IS NOT NULL LOOP
        IF v_current = ANY(v_chain) THEN
            RAISE EXCEPTION 'Circular recipe reference detected: % would create a loop', 
                array_to_string(v_chain || v_current, ' -> ');
        END IF;
        
        v_chain := v_chain || v_current;
        
        SELECT DISTINCT ri.sub_recipe_id INTO v_current
        FROM recipe_ingredients ri
        WHERE ri.recipe_id = v_current
          AND ri.sub_recipe_id IS NOT NULL
        LIMIT 1;
        
        IF array_length(v_chain, 1) > 20 THEN
            RAISE EXCEPTION 'Recipe chain too deep (>20 levels)';
        END IF;
    END LOOP;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_recipe_circular_check
BEFORE INSERT OR UPDATE ON recipe_ingredients
FOR EACH ROW EXECUTE FUNCTION check_recipe_circular_ref();

COMMIT;

