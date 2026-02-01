-- Function to get complete unified audit trail from all sources
BEGIN;

DROP FUNCTION IF EXISTS public.get_recipe_complete_audit_trail(UUID, INTEGER);

CREATE OR REPLACE FUNCTION public.get_recipe_complete_audit_trail(
  p_recipe_id UUID,
  p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
  id TEXT,
  event_type TEXT,
  change_summary TEXT,
  field_name TEXT,
  old_value TEXT,
  new_value TEXT,
  changed_by_name TEXT,
  changed_at TIMESTAMPTZ,
  source TEXT,
  metadata JSONB
) AS $$
BEGIN
  RETURN QUERY
  
  WITH all_events AS (
    -- 1. Recipe audit log (ingredients, shelf life, storage, allergens, status)
    SELECT 
      ral.id::TEXT as id,
      ral.event_type,
      ral.change_summary,
      ral.field_name,
      ral.old_value,
      ral.new_value,
      COALESCE(p.full_name, p.email, 'System') as changed_by_name,
      ral.changed_at,
      'recipe_audit' as source,
      ral.metadata
    FROM stockly.recipe_audit_log ral
    LEFT JOIN public.profiles p ON p.id = ral.changed_by
    WHERE ral.recipe_id = p_recipe_id
    
    UNION ALL
    
    -- 2. Recipe cost history (cost recalculations with triggers)
    SELECT 
      rch.id::TEXT as id,
      'recipe_cost_changed' as event_type,
      'Recipe cost recalculated: £' || COALESCE(rch.total_cost, 0)::NUMERIC(10,2)::TEXT ||
      CASE 
        WHEN rch.trigger_type IS NOT NULL 
        THEN ' (triggered by: ' || rch.trigger_type || ')'
        ELSE ''
      END as change_summary,
      'total_cost' as field_name,
      COALESCE(
        (SELECT '£' || rch2.total_cost::NUMERIC(10,2)::TEXT 
         FROM stockly.recipe_cost_history rch2
         WHERE rch2.recipe_id = p_recipe_id 
           AND rch2.costed_at < rch.costed_at 
         ORDER BY rch2.costed_at DESC 
         LIMIT 1),
        '£0.00'
      ) as old_value,
      '£' || COALESCE(rch.total_cost, 0)::NUMERIC(10,2)::TEXT as new_value,
      COALESCE(p.full_name, p.email, 'System') as changed_by_name,
      rch.costed_at as changed_at,
      'cost_history' as source,
      jsonb_build_object(
        'trigger_type', rch.trigger_type,
        'trigger_details', rch.trigger_details,
        'cost_per_portion', rch.cost_per_portion,
        'gp_percent', rch.gp_percent
      ) as metadata
    FROM stockly.recipe_cost_history rch
    LEFT JOIN public.profiles p ON p.id = rch.costed_by
    WHERE rch.recipe_id = p_recipe_id
    
    UNION ALL
    
    -- 3. Ingredient price changes (for ingredients used in this recipe)
    SELECT 
      iph.id::TEXT as id,
      'ingredient_price_changed' as event_type,
      il.ingredient_name || ' price changed from £' || 
      COALESCE(iph.old_unit_cost, 0)::NUMERIC(10,4)::TEXT ||
      ' to £' || COALESCE(iph.new_unit_cost, 0)::NUMERIC(10,4)::TEXT ||
      CASE 
        WHEN iph.change_percent IS NOT NULL 
        THEN ' (' || 
          CASE WHEN iph.change_percent > 0 THEN '+' ELSE '' END ||
          iph.change_percent::NUMERIC(5,1)::TEXT || '%)'
        ELSE ''
      END as change_summary,
      'ingredient_cost' as field_name,
      '£' || COALESCE(iph.old_unit_cost, 0)::NUMERIC(10,4)::TEXT as old_value,
      '£' || COALESCE(iph.new_unit_cost, 0)::NUMERIC(10,4)::TEXT as new_value,
      COALESCE(p.full_name, p.email, 'System') as changed_by_name,
      iph.recorded_at as changed_at,
      'price_history' as source,
      jsonb_build_object(
        'ingredient_id', iph.ingredient_id,
        'ingredient_name', il.ingredient_name,
        'source', iph.source,
        'source_ref', iph.source_ref
      ) as metadata
    FROM stockly.ingredient_price_history iph
    JOIN public.ingredients_library il ON il.id = iph.ingredient_id
    JOIN stockly.recipe_ingredients ri ON ri.ingredient_id = iph.ingredient_id
    LEFT JOIN public.profiles p ON p.id = iph.recorded_by
    WHERE ri.recipe_id = p_recipe_id
  )
  
  SELECT 
    all_events.id,
    all_events.event_type,
    all_events.change_summary,
    all_events.field_name,
    all_events.old_value,
    all_events.new_value,
    all_events.changed_by_name,
    all_events.changed_at,
    all_events.source,
    all_events.metadata
  FROM all_events
  ORDER BY all_events.changed_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.get_recipe_complete_audit_trail(UUID, INTEGER) TO authenticated;

COMMIT;

