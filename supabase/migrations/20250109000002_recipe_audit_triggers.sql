-- Triggers to automatically populate recipe audit log
-- This migration only runs if stockly schema exists
DO $$
BEGIN
  -- Check if stockly schema exists - exit early if it doesn't
  IF NOT EXISTS (
    SELECT 1 FROM pg_namespace WHERE nspname = 'stockly'
  ) THEN
    RAISE NOTICE 'stockly schema does not exist - skipping recipe_audit_triggers migration';
    RETURN;
  END IF;
  
  RAISE NOTICE 'stockly schema found - proceeding with recipe_audit_triggers migration';
END $$;

-- Only proceed if schema exists (checked above)
DO $$
BEGIN
  -- Check if stockly schema exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_namespace WHERE nspname = 'stockly'
  ) THEN
    RETURN;
  END IF;

  -- 1. Trigger for recipe changes (shelf life, storage, allergens, status)
  EXECUTE $sql1$
    CREATE OR REPLACE FUNCTION log_recipe_changes()
    RETURNS TRIGGER AS $func$
    DECLARE
      v_user_id UUID;
    BEGIN
      v_user_id := COALESCE(NEW.updated_by, NEW.created_by, auth.uid());
      
      IF TG_OP = 'INSERT' THEN
        -- Recipe created
        INSERT INTO stockly.recipe_audit_log (
          company_id, recipe_id, event_type, change_summary, changed_by, changed_at
        ) VALUES (
          NEW.company_id, NEW.id, 'created',
          'Recipe "' || NEW.name || '" created',
          NEW.created_by, NEW.created_at
        );
        
      ELSIF TG_OP = 'UPDATE' THEN
        
        -- Name changed
        IF NEW.name IS DISTINCT FROM OLD.name THEN
          INSERT INTO stockly.recipe_audit_log (
            company_id, recipe_id, event_type, field_name, old_value, new_value,
            change_summary, changed_by
          ) VALUES (
            NEW.company_id, NEW.id, 'name_changed', 'name',
            OLD.name, NEW.name,
            'Recipe name changed from "' || OLD.name || '" to "' || NEW.name || '"',
            v_user_id
          );
        END IF;
        
        -- Shelf life changed
        IF NEW.shelf_life_days IS DISTINCT FROM OLD.shelf_life_days THEN
          INSERT INTO stockly.recipe_audit_log (
            company_id, recipe_id, event_type, field_name, old_value, new_value,
            change_summary, changed_by
          ) VALUES (
            NEW.company_id, NEW.id, 'shelf_life_changed', 'shelf_life_days',
            COALESCE(OLD.shelf_life_days::TEXT, 'not set'),
            COALESCE(NEW.shelf_life_days::TEXT, 'not set'),
            'Shelf life changed from ' || COALESCE(OLD.shelf_life_days::TEXT || ' days', 'not set') ||
            ' to ' || COALESCE(NEW.shelf_life_days::TEXT || ' days', 'not set'),
            v_user_id
          );
        END IF;
        
        -- Storage changed
        IF NEW.storage_requirements IS DISTINCT FROM OLD.storage_requirements THEN
          INSERT INTO stockly.recipe_audit_log (
            company_id, recipe_id, event_type, field_name, old_value, new_value,
            change_summary, changed_by
          ) VALUES (
            NEW.company_id, NEW.id, 'storage_changed', 'storage_requirements',
            COALESCE(OLD.storage_requirements, 'not specified'),
            COALESCE(NEW.storage_requirements, 'not specified'),
            'Storage requirements updated',
            v_user_id
          );
        END IF;
        
        -- Status changed (check both is_active and recipe_status)
        IF (NEW.is_active IS DISTINCT FROM OLD.is_active) OR 
           (NEW.recipe_status IS DISTINCT FROM OLD.recipe_status) THEN
          INSERT INTO stockly.recipe_audit_log (
            company_id, recipe_id, event_type, field_name, old_value, new_value,
            change_summary, changed_by
          ) VALUES (
            NEW.company_id, NEW.id, 'status_changed', 'status',
            CASE 
              WHEN OLD.recipe_status IS NOT NULL THEN OLD.recipe_status
              WHEN OLD.is_active THEN 'active' 
              ELSE 'draft' 
            END,
            CASE 
              WHEN NEW.recipe_status IS NOT NULL THEN NEW.recipe_status
              WHEN NEW.is_active THEN 'active' 
              ELSE 'draft' 
            END,
            'Recipe status changed to ' || 
            CASE 
              WHEN NEW.recipe_status IS NOT NULL THEN NEW.recipe_status
              WHEN NEW.is_active THEN 'active' 
              ELSE 'draft' 
            END,
            v_user_id
          );
        END IF;
        
        -- Allergens changed
        IF NEW.allergens IS DISTINCT FROM OLD.allergens THEN
          INSERT INTO stockly.recipe_audit_log (
            company_id, recipe_id, event_type, change_summary, changed_by, metadata
          ) VALUES (
            NEW.company_id, NEW.id, 'allergen_changed',
            'Allergens updated',
            v_user_id,
            jsonb_build_object(
              'old_allergens', COALESCE(OLD.allergens, ARRAY[]::TEXT[]),
              'new_allergens', COALESCE(NEW.allergens, ARRAY[]::TEXT[])
            )
          );
        END IF;
        
      END IF;
      
      RETURN NEW;
  END;
  $func$ LANGUAGE plpgsql SECURITY DEFINER;
  $sql1$;

  -- 2. Trigger for recipe ingredient changes
  EXECUTE $sql2$
    CREATE OR REPLACE FUNCTION log_recipe_ingredient_changes()
    RETURNS TRIGGER AS $func$
    DECLARE
      v_ingredient_name TEXT;
      v_recipe_id UUID;
      v_company_id UUID;
      v_unit_abbr TEXT;
    BEGIN
      -- Get context
      v_recipe_id := COALESCE(NEW.recipe_id, OLD.recipe_id);
      
      SELECT company_id INTO v_company_id
      FROM stockly.recipes WHERE id = v_recipe_id;
      
      IF TG_OP = 'INSERT' THEN
        -- Ingredient added
        SELECT il.ingredient_name, u.abbreviation
        INTO v_ingredient_name, v_unit_abbr
        FROM public.ingredients_library il
        LEFT JOIN public.uom u ON u.id = NEW.unit_id
        WHERE il.id = NEW.ingredient_id;
        
        INSERT INTO stockly.recipe_audit_log (
          company_id, recipe_id, event_type, change_summary, changed_by, metadata
        ) VALUES (
          v_company_id, v_recipe_id, 'ingredient_added',
          COALESCE(v_ingredient_name, 'Unknown ingredient') || ' added (' || NEW.quantity || 
          ' ' || COALESCE(v_unit_abbr, 'unit') || ')',
          auth.uid(),
          jsonb_build_object(
            'ingredient_id', NEW.ingredient_id,
            'quantity', NEW.quantity,
            'unit_id', NEW.unit_id
          )
        );
        
      ELSIF TG_OP = 'UPDATE' THEN
        -- Quantity changed
        IF NEW.quantity IS DISTINCT FROM OLD.quantity THEN
          SELECT il.ingredient_name, u.abbreviation
          INTO v_ingredient_name, v_unit_abbr
          FROM public.ingredients_library il
          LEFT JOIN public.uom u ON u.id = NEW.unit_id
          WHERE il.id = NEW.ingredient_id;
          
          INSERT INTO stockly.recipe_audit_log (
            company_id, recipe_id, event_type, field_name, old_value, new_value,
            change_summary, changed_by
          ) VALUES (
            v_company_id, v_recipe_id, 'ingredient_quantity_changed', 'quantity',
            OLD.quantity::TEXT || ' ' || COALESCE(v_unit_abbr, 'unit'),
            NEW.quantity::TEXT || ' ' || COALESCE(v_unit_abbr, 'unit'),
            COALESCE(v_ingredient_name, 'Ingredient') || ' quantity changed from ' || OLD.quantity || 
            ' to ' || NEW.quantity || ' ' || COALESCE(v_unit_abbr, 'unit'),
            auth.uid()
          );
        END IF;
        
      ELSIF TG_OP = 'DELETE' THEN
        -- Ingredient removed
        SELECT ingredient_name INTO v_ingredient_name
        FROM public.ingredients_library WHERE id = OLD.ingredient_id;
        
        INSERT INTO stockly.recipe_audit_log (
          company_id, recipe_id, event_type, change_summary, changed_by, metadata
        ) VALUES (
          v_company_id, v_recipe_id, 'ingredient_removed',
          COALESCE(v_ingredient_name, 'Unknown ingredient') || ' removed',
          auth.uid(),
          jsonb_build_object('ingredient_id', OLD.ingredient_id)
        );
      END IF;
      
      RETURN COALESCE(NEW, OLD);
  END;
  $func$ LANGUAGE plpgsql SECURITY DEFINER;
  $sql2$;

  -- 3. Trigger for ingredient supplier changes (affects all recipes using it)
  EXECUTE $sql3$
    CREATE OR REPLACE FUNCTION log_ingredient_supplier_changes()
    RETURNS TRIGGER AS $func$
    DECLARE
      v_recipe RECORD;
    BEGIN
      IF TG_OP = 'UPDATE' AND NEW.supplier IS DISTINCT FROM OLD.supplier THEN
        -- Log for each recipe using this ingredient
        FOR v_recipe IN
          SELECT DISTINCT r.id as recipe_id, r.company_id
          FROM stockly.recipe_ingredients ri
          JOIN stockly.recipes r ON r.id = ri.recipe_id
          WHERE ri.ingredient_id = NEW.id
        LOOP
          INSERT INTO stockly.recipe_audit_log (
            company_id, recipe_id, event_type, field_name, old_value, new_value,
            change_summary, changed_by, metadata
          ) VALUES (
            v_recipe.company_id, v_recipe.recipe_id, 'ingredient_supplier_changed', 'supplier',
            COALESCE(OLD.supplier, 'not set'),
            COALESCE(NEW.supplier, 'not set'),
            NEW.ingredient_name || ' supplier changed from ' || 
            COALESCE(OLD.supplier, 'not set') || ' to ' || COALESCE(NEW.supplier, 'not set'),
            auth.uid(),
            jsonb_build_object('ingredient_id', NEW.id)
          );
        END LOOP;
      END IF;
      
      RETURN NEW;
  END;
  $func$ LANGUAGE plpgsql SECURITY DEFINER;
  $sql3$;

  -- 4. Apply triggers
  DROP TRIGGER IF EXISTS log_recipe_changes_trigger ON stockly.recipes;
  CREATE TRIGGER log_recipe_changes_trigger
    AFTER INSERT OR UPDATE ON stockly.recipes
    FOR EACH ROW EXECUTE FUNCTION log_recipe_changes();

  DROP TRIGGER IF EXISTS log_recipe_ingredient_changes_trigger ON stockly.recipe_ingredients;
  CREATE TRIGGER log_recipe_ingredient_changes_trigger
    AFTER INSERT OR UPDATE OR DELETE ON stockly.recipe_ingredients
    FOR EACH ROW EXECUTE FUNCTION log_recipe_ingredient_changes();

  DROP TRIGGER IF EXISTS log_ingredient_supplier_changes_trigger ON public.ingredients_library;
  CREATE TRIGGER log_ingredient_supplier_changes_trigger
    AFTER UPDATE ON public.ingredients_library
    FOR EACH ROW EXECUTE FUNCTION log_ingredient_supplier_changes();

END $$;

