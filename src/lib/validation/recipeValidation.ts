/**
 * Recipe Data Validation
 * Server-side and client-side validation for recipe data integrity
 */

// ============================================================================
// Types
// ============================================================================

export interface RecipeIngredient {
  id?: string;
  ingredient_id?: string;
  sub_recipe_id?: string;
  quantity: number;
  unit: string;
  yield_factor?: number;
  preparation_notes?: string;
}

export interface RecipeMethodStep {
  id?: string;
  step_number: number;
  instruction: string;
  duration_minutes?: number;
  temperature?: number;
  notes?: string;
}

export interface RecipeData {
  id?: string;
  name: string;
  description?: string;
  recipe_type: 'prep' | 'dish' | 'composite' | 'modifier';
  is_active?: boolean;
  sell_price?: number;
  ingredients?: RecipeIngredient[];
  method_steps?: RecipeMethodStep[];
  data_version?: number;
}

export interface ValidationError {
  field: string;
  severity: 'error' | 'warning';
  message: string;
  code: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Validate recipe data before save
 * @param data Recipe data to validate
 * @param isPublishing Whether this is a publish operation (stricter validation)
 */
export function validateRecipeData(
  data: Partial<RecipeData>,
  isPublishing: boolean = false
): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  // -------------------------------------------------------------------------
  // Required Fields
  // -------------------------------------------------------------------------

  // Name is always required
  if (!data.name || data.name.trim() === '') {
    errors.push({
      field: 'name',
      severity: 'error',
      message: 'Recipe name is required',
      code: 'RECIPE_NAME_REQUIRED'
    });
  } else if (data.name.length > 255) {
    errors.push({
      field: 'name',
      severity: 'error',
      message: 'Recipe name must be less than 255 characters',
      code: 'RECIPE_NAME_TOO_LONG'
    });
  }

  // Recipe type validation
  const validTypes = ['prep', 'dish', 'composite', 'modifier'];
  if (!data.recipe_type || !validTypes.includes(data.recipe_type)) {
    errors.push({
      field: 'recipe_type',
      severity: 'error',
      message: `Recipe type must be one of: ${validTypes.join(', ')}`,
      code: 'INVALID_RECIPE_TYPE'
    });
  }

  // -------------------------------------------------------------------------
  // Ingredients Validation
  // -------------------------------------------------------------------------

  if (data.ingredients) {
    if (!Array.isArray(data.ingredients)) {
      errors.push({
        field: 'ingredients',
        severity: 'error',
        message: 'Ingredients must be an array',
        code: 'INGREDIENTS_NOT_ARRAY'
      });
    } else {
      // Validate each ingredient
      data.ingredients.forEach((ing, index) => {
        // Must have either ingredient_id or sub_recipe_id
        if (!ing.ingredient_id && !ing.sub_recipe_id) {
          errors.push({
            field: `ingredients[${index}]`,
            severity: 'error',
            message: 'Ingredient must reference a stock item or sub-recipe',
            code: 'INGREDIENT_NO_SOURCE'
          });
        }

        // Cannot have both
        if (ing.ingredient_id && ing.sub_recipe_id) {
          errors.push({
            field: `ingredients[${index}]`,
            severity: 'error',
            message: 'Ingredient cannot reference both stock item and sub-recipe',
            code: 'INGREDIENT_DUAL_SOURCE'
          });
        }

        // Quantity validation
        if (ing.quantity === undefined || ing.quantity === null) {
          errors.push({
            field: `ingredients[${index}].quantity`,
            severity: 'error',
            message: 'Ingredient quantity is required',
            code: 'INGREDIENT_QUANTITY_REQUIRED'
          });
        } else if (typeof ing.quantity !== 'number' || ing.quantity <= 0) {
          errors.push({
            field: `ingredients[${index}].quantity`,
            severity: 'error',
            message: 'Ingredient quantity must be a positive number',
            code: 'INGREDIENT_QUANTITY_INVALID'
          });
        }

        // Unit validation
        if (!ing.unit || ing.unit.trim() === '') {
          errors.push({
            field: `ingredients[${index}].unit`,
            severity: 'error',
            message: 'Ingredient unit is required',
            code: 'INGREDIENT_UNIT_REQUIRED'
          });
        }

        // Yield factor validation (if provided)
        if (ing.yield_factor !== undefined) {
          if (typeof ing.yield_factor !== 'number' || ing.yield_factor <= 0 || ing.yield_factor > 1) {
            errors.push({
              field: `ingredients[${index}].yield_factor`,
              severity: 'error',
              message: 'Yield factor must be between 0 and 1',
              code: 'INGREDIENT_YIELD_INVALID'
            });
          }
        }
      });

      // Warning if no ingredients
      if (data.ingredients.length === 0) {
        if (isPublishing) {
          errors.push({
            field: 'ingredients',
            severity: 'error',
            message: 'Recipe must have at least one ingredient to be published',
            code: 'INGREDIENTS_REQUIRED_FOR_PUBLISH'
          });
        } else {
          warnings.push({
            field: 'ingredients',
            severity: 'warning',
            message: 'Recipe has no ingredients',
            code: 'NO_INGREDIENTS'
          });
        }
      }
    }
  } else if (isPublishing) {
    errors.push({
      field: 'ingredients',
      severity: 'error',
      message: 'Recipe must have ingredients to be published',
      code: 'INGREDIENTS_REQUIRED_FOR_PUBLISH'
    });
  }

  // -------------------------------------------------------------------------
  // Method Steps Validation (if provided)
  // -------------------------------------------------------------------------

  if (data.method_steps) {
    if (!Array.isArray(data.method_steps)) {
      errors.push({
        field: 'method_steps',
        severity: 'error',
        message: 'Method steps must be an array',
        code: 'METHOD_STEPS_NOT_ARRAY'
      });
    } else {
      // Validate each step
      data.method_steps.forEach((step, index) => {
        if (!step.instruction || step.instruction.trim() === '') {
          errors.push({
            field: `method_steps[${index}].instruction`,
            severity: 'error',
            message: 'Step instruction is required',
            code: 'STEP_INSTRUCTION_REQUIRED'
          });
        }

        // Check step number sequence
        if (step.step_number !== index + 1) {
          warnings.push({
            field: `method_steps[${index}].step_number`,
            severity: 'warning',
            message: `Step number should be ${index + 1}, got ${step.step_number}`,
            code: 'STEP_NUMBER_SEQUENCE'
          });
        }

        // Duration validation
        if (step.duration_minutes !== undefined) {
          if (typeof step.duration_minutes !== 'number' || step.duration_minutes < 0) {
            errors.push({
              field: `method_steps[${index}].duration_minutes`,
              severity: 'error',
              message: 'Duration must be a non-negative number',
              code: 'STEP_DURATION_INVALID'
            });
          }
        }

        // Temperature validation
        if (step.temperature !== undefined) {
          if (typeof step.temperature !== 'number') {
            errors.push({
              field: `method_steps[${index}].temperature`,
              severity: 'error',
              message: 'Temperature must be a number',
              code: 'STEP_TEMPERATURE_INVALID'
            });
          } else if (step.temperature < -50 || step.temperature > 500) {
            warnings.push({
              field: `method_steps[${index}].temperature`,
              severity: 'warning',
              message: 'Temperature seems unusual (outside -50°C to 500°C)',
              code: 'STEP_TEMPERATURE_UNUSUAL'
            });
          }
        }
      });

      // Warning if no method steps
      if (data.method_steps.length === 0) {
        warnings.push({
          field: 'method_steps',
          severity: 'warning',
          message: 'Recipe has no method steps',
          code: 'NO_METHOD_STEPS'
        });
      }
    }
  }

  // -------------------------------------------------------------------------
  // Pricing Validation (for dish type)
  // -------------------------------------------------------------------------

  if (data.recipe_type === 'dish') {
    if (data.sell_price !== undefined && data.sell_price !== null) {
      if (typeof data.sell_price !== 'number' || data.sell_price < 0) {
        errors.push({
          field: 'sell_price',
          severity: 'error',
          message: 'Sell price must be a non-negative number',
          code: 'SELL_PRICE_INVALID'
        });
      }
    } else if (isPublishing) {
      warnings.push({
        field: 'sell_price',
        severity: 'warning',
        message: 'Recipe has no sell price set',
        code: 'NO_SELL_PRICE'
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Validate version for optimistic locking
 */
export function validateVersionMatch(
  expectedVersion: number | undefined,
  currentVersion: number
): boolean {
  if (expectedVersion === undefined) {
    return true; // No version check requested
  }
  return expectedVersion === currentVersion;
}

/**
 * Format validation result for API response
 */
export function formatValidationResponse(result: ValidationResult): {
  success: boolean;
  errors?: Array<{ field: string; message: string; code: string }>;
  warnings?: Array<{ field: string; message: string; code: string }>;
} {
  return {
    success: result.valid,
    errors: result.errors.length > 0
      ? result.errors.map(e => ({ field: e.field, message: e.message, code: e.code }))
      : undefined,
    warnings: result.warnings.length > 0
      ? result.warnings.map(w => ({ field: w.field, message: w.message, code: w.code }))
      : undefined
  };
}

// ============================================================================
// Data Integrity Check
// ============================================================================

export interface IntegrityCheck {
  field: string;
  status: 'ok' | 'missing' | 'empty' | 'invalid';
  message?: string;
}

/**
 * Check loaded recipe data for integrity issues
 * Use this when loading a recipe to warn users about potential issues
 */
export function checkLoadedRecipeIntegrity(data: any): IntegrityCheck[] {
  const checks: IntegrityCheck[] = [];

  // Check basic fields
  checks.push({
    field: 'id',
    status: data?.id ? 'ok' : 'missing',
    message: !data?.id ? 'Recipe ID is missing' : undefined
  });

  checks.push({
    field: 'name',
    status: data?.name ? 'ok' : 'missing',
    message: !data?.name ? 'Recipe name is missing' : undefined
  });

  // Check ingredients
  if (!data?.ingredients && !data?.recipe_ingredients) {
    checks.push({
      field: 'ingredients',
      status: 'missing',
      message: 'Ingredients data not loaded'
    });
  } else {
    const ingredients = data.ingredients || data.recipe_ingredients || [];
    if (!Array.isArray(ingredients)) {
      checks.push({
        field: 'ingredients',
        status: 'invalid',
        message: 'Ingredients is not an array'
      });
    } else if (ingredients.length === 0) {
      checks.push({
        field: 'ingredients',
        status: 'empty',
        message: 'Recipe has no ingredients'
      });
    } else {
      checks.push({
        field: 'ingredients',
        status: 'ok'
      });
    }
  }

  // Check method_steps (if applicable)
  if (data?.method_steps !== undefined) {
    if (data.method_steps === null) {
      checks.push({
        field: 'method_steps',
        status: 'missing',
        message: 'Method steps is null'
      });
    } else if (!Array.isArray(data.method_steps)) {
      checks.push({
        field: 'method_steps',
        status: 'invalid',
        message: 'Method steps is not an array'
      });
    } else if (data.method_steps.length === 0) {
      checks.push({
        field: 'method_steps',
        status: 'empty',
        message: 'Recipe has no method steps'
      });
    } else {
      checks.push({
        field: 'method_steps',
        status: 'ok'
      });
    }
  }

  // Check costing
  if (data?.total_cost === null || data?.total_cost === undefined) {
    checks.push({
      field: 'total_cost',
      status: 'missing',
      message: 'Recipe has not been costed'
    });
  } else if (data.total_cost === 0) {
    checks.push({
      field: 'total_cost',
      status: 'empty',
      message: 'Recipe cost is zero'
    });
  } else {
    checks.push({
      field: 'total_cost',
      status: 'ok'
    });
  }

  return checks;
}

/**
 * Check if integrity issues are critical (should block operations)
 */
export function hasCriticalIntegrityIssues(checks: IntegrityCheck[]): boolean {
  return checks.some(c =>
    c.status === 'missing' &&
    ['id', 'name', 'ingredients'].includes(c.field)
  );
}
