'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAppContext } from '@/context/AppContext';

export default function SOPPrintPage() {
  const params = useParams();
  const { companyId } = useAppContext();
  const sopId = params.id as string;
  const [sop, setSop] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!sopId || !companyId) return;
    loadSOP();
  }, [sopId, companyId]);

  const loadSOP = async () => {
    try {
      // Fetch the SOP entry
      const { data, error } = await supabase
        .from('sop_entries')
        .select(`
          *,
          linked_recipe:recipes!linked_recipe_id(
            id,
            name,
            code,
            version_number,
            allergens,
            total_cost,
            yield_qty,
            yield_unit_id,
            shelf_life_days,
            storage_requirements
          )
        `)
        .eq('id', sopId)
        .eq('company_id', companyId)
        .single();

      if (error) throw error;
      if (!data) throw new Error('SOP not found');

      // Fetch creator profile separately if created_by exists
      let creatorName = data.author || 'System';
      if (data.created_by) {
        try {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, email')
            .eq('id', data.created_by)
            .single();
          
          if (profile) {
            creatorName = profile.full_name || profile.email || creatorName;
          }
        } catch (profileError) {
          console.warn('Could not fetch creator profile:', profileError);
        }
      }

      // Parse sop_data
      let parsedData = data.sop_data || {};
      if (typeof parsedData === 'string') {
        try {
          parsedData = JSON.parse(parsedData);
        } catch (e) {
          console.error('Error parsing sop_data:', e);
          parsedData = {};
        }
      }

      // Extract structured data for print template
      const metadata = data.metadata || {};
      const isTipTapFormat = parsedData.content && Array.isArray(parsedData.content);
      
      let ingredients: any[] = [];
      let equipment: string[] = [];
      let methodSteps: string[] = [];
      let recipe: any = null;

      if (metadata.ingredients && metadata.ingredients.length > 0) {
        // Use metadata format (new structured format)
        ingredients = metadata.ingredients;
        equipment = metadata.equipment || [];
        methodSteps = metadata.method_steps || [];
        recipe = metadata.recipe || data.linked_recipe;
      } else if (isTipTapFormat) {
        // Extract from TipTap format
        const ingredientTableNode = parsedData.content.find((n: any) => n.type === 'ingredientTable');
        const equipmentListNode = parsedData.content.find((n: any) => n.type === 'equipmentList');
        const processStepsNode = parsedData.content.find((n: any) => n.type === 'processSteps');
        const headerNode = parsedData.content.find((n: any) => n.type === 'prepHeader');
        const storageInfoNode = parsedData.content.find((n: any) => n.type === 'storageInfo');

        if (ingredientTableNode?.attrs?.rows) {
          ingredients = ingredientTableNode.attrs.rows.map((row: any) => ({
            ingredient_name: row.ingredient || '',
            quantity: parseFloat(row.quantity) || 0,
            unit: row.unit || '',
            supplier: row.supplier || '',
            allergens: Array.isArray(row.allergen) ? row.allergen : (row.allergen ? [row.allergen] : [])
          }));
        }

        if (equipmentListNode?.attrs?.rows) {
          equipment = equipmentListNode.attrs.rows.map((eq: any) => eq.item || eq.name || 'Equipment');
        }

        if (processStepsNode?.attrs?.steps) {
          methodSteps = processStepsNode.attrs.steps.map((step: any) => step.description || step.text || '');
        }

        if (headerNode?.attrs) {
          recipe = {
            name: headerNode.attrs.title || data.title,
            code: headerNode.attrs.ref_code || data.ref_code,
            version_number: parseFloat(headerNode.attrs.version) || data.version_number || 1.0,
            allergens: headerNode.attrs.allergens || [],
            yield_qty: headerNode.attrs.yieldValue || 0,
            yield_unit: headerNode.attrs.unit || 'g',
            storage_requirements: storageInfoNode?.attrs?.type || '',
            shelf_life_days: storageInfoNode?.attrs?.durationDays || null
          };
        }
      } else {
        // Simple format
        if (parsedData.ingredients) {
          ingredients = parsedData.ingredients.map((ing: any) => ({
            ingredient_name: ing.ingredient_name || ing.ingredient || '',
            quantity: ing.quantity || 0,
            unit: ing.unit || '',
            supplier: ing.supplier || '',
            allergens: ing.allergens || []
          }));
        }
        equipment = parsedData.equipment?.map((eq: any) => eq.item || eq.name || '') || [];
        methodSteps = parsedData.processSteps?.map((step: any) => step.description || step.text || '') || [];
        recipe = data.linked_recipe || parsedData.header;
      }

      // Use linked recipe if available
      if (data.linked_recipe && !recipe) {
        recipe = {
          name: data.linked_recipe.name,
          code: data.linked_recipe.code,
          version_number: data.linked_recipe.version_number || 1.0,
          allergens: data.linked_recipe.allergens || [],
          total_cost: data.linked_recipe.total_cost || 0,
          yield_qty: data.linked_recipe.yield_qty || 0,
          yield_unit: 'g',
          shelf_life_days: data.linked_recipe.shelf_life_days,
          storage_requirements: data.linked_recipe.storage_requirements
        };
      }

      // Get allergens from recipe or extract from ingredients
      const recipeAllergens = recipe?.allergens || [];
      const ingredientAllergens = ingredients.flatMap(ing => 
        (ing.allergens || ing.allergen || [])
      ) || [];
      const allAllergens = [...new Set([...recipeAllergens, ...ingredientAllergens])];

      // Build print data
      const printSopData = {
        sop_code: data.ref_code || data.sop_code,
        ref_code: data.ref_code,
        title: data.title,
        version: data.version_number || parseFloat(data.version) || 1.0,
        version_number: data.version_number || parseFloat(data.version) || 1.0,
        status: data.status,
        created_at: data.created_at,
        updated_at: data.updated_at,
        created_by_name: creatorName,
        recipe: recipe ? {
          ...recipe,
          allergens: allAllergens
        } : null,
        ingredients: ingredients,
        equipment: equipment.length > 0 ? equipment : undefined,
        method_steps: methodSteps.length > 0 ? methodSteps : undefined
      };

      setSop(printSopData);
      setLoading(false);
      
      // Auto-trigger print dialog after content loads
      // Use requestAnimationFrame to ensure DOM is fully rendered
      requestAnimationFrame(() => {
        setTimeout(() => {
          window.print();
        }, 300);
      });
      
    } catch (err: any) {
      console.error('Error loading SOP:', err);
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        fontFamily: 'Arial, sans-serif'
      }}>
        <p>Loading SOP for printing...</p>
      </div>
    );
  }

  if (!sop) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        fontFamily: 'Arial, sans-serif'
      }}>
        <p>SOP not found</p>
      </div>
    );
  }

  const version = sop.version || sop.version_number || 1.0;
  const sopCode = sop.sop_code || sop.ref_code || 'SOP-001';
  const nextReviewDate = new Date(sop.updated_at);
  nextReviewDate.setDate(nextReviewDate.getDate() + 90);

  return (
    <>
      <style jsx global>{`
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        body {
          font-family: 'Arial', sans-serif;
          font-size: 10pt;
          line-height: 1.4;
          color: #000;
          background: white;
        }

        @page {
          size: A4;
          margin: 15mm;
        }

        @media print {
          body {
            margin: 0;
            padding: 0;
          }

          .page-break {
            page-break-after: always;
          }

          .avoid-break {
            page-break-inside: avoid;
            page-break-after: avoid;
          }
        }

        /* Header */
        .sop-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          border-bottom: 2px solid #000;
          padding-bottom: 8px;
          margin-bottom: 12px;
        }

        .company-info {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .company-logo {
          max-height: 40px;
          max-width: 120px;
          object-fit: contain;
        }

        .company-details h1 {
          font-size: 14pt;
          font-weight: bold;
          margin: 0;
          line-height: 1.2;
        }

        .company-details p {
          font-size: 9pt;
          margin: 2px 0 0 0;
          color: #333;
        }

        .document-info {
          text-align: right;
          font-size: 9pt;
        }

        .document-info strong {
          display: block;
          margin-bottom: 2px;
          font-size: 10pt;
        }

        /* Document Control */
        .doc-control {
          border: 2px solid #000;
          padding: 8px;
          margin-bottom: 12px;
          background: #f8f9fa;
        }

        .doc-control h2 {
          font-size: 11pt;
          font-weight: bold;
          margin: 0 0 6px 0;
          text-transform: uppercase;
        }

        .doc-control-grid {
          display: grid;
          grid-template-columns: 120px 1fr 120px 1fr;
          gap: 4px 12px;
          font-size: 9pt;
        }

        .doc-control-label {
          font-weight: bold;
        }

        /* Recipe Title */
        .recipe-title {
          text-align: center;
          margin: 12px 0;
          padding: 8px;
          border-top: 1px solid #333;
          border-bottom: 1px solid #333;
        }

        .recipe-title h3 {
          font-size: 14pt;
          font-weight: bold;
          margin: 0;
        }

        .recipe-subtitle {
          font-size: 9pt;
          color: #333;
          margin-top: 2px;
        }

        /* Allergen Warning */
        .allergen-warning {
          border: 3px double #000;
          padding: 8px;
          margin: 12px 0;
          text-align: center;
          background: repeating-linear-gradient(
            45deg,
            #f0f0f0,
            #f0f0f0 3px,
            #fff 3px,
            #fff 6px
          );
        }

        .allergen-warning-header {
          font-size: 11pt;
          font-weight: bold;
          margin-bottom: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
        }

        .allergen-content {
          font-size: 10pt;
          font-weight: bold;
        }

        .allergen-note {
          font-size: 8pt;
          margin-top: 4px;
          font-style: italic;
        }

        /* Section Headers */
        .section-header {
          font-size: 11pt;
          font-weight: bold;
          text-transform: uppercase;
          margin: 12px 0 6px 0;
          padding-bottom: 2px;
          border-bottom: 1px solid #000;
        }

        /* Ingredients Table */
        .ingredients-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 12px;
          font-size: 9pt;
        }

        .ingredients-table th {
          border: 1px solid #000;
          padding: 4px 6px;
          text-align: left;
          font-weight: bold;
          background: #f0f0f0;
        }

        .ingredients-table td {
          border: 1px solid #333;
          padding: 4px 6px;
        }

        .ingredients-table .qty-cell {
          text-align: right;
          font-weight: bold;
        }

        .ingredients-footer {
          border: 1px solid #000;
          padding: 6px;
          background: #f8f9fa;
          font-weight: bold;
          display: flex;
          justify-content: space-between;
          font-size: 9pt;
        }

        /* Equipment List */
        .equipment-list {
          margin: 8px 0 12px 20px;
          font-size: 9pt;
        }

        .equipment-list li {
          margin-bottom: 3px;
        }

        /* Method Steps */
        .method-steps {
          margin: 8px 0;
        }

        .method-step {
          display: flex;
          margin-bottom: 10px;
          page-break-inside: avoid;
        }

        .step-number {
          flex-shrink: 0;
          width: 28px;
          height: 28px;
          border: 2px solid #000;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          font-size: 11pt;
          margin-right: 10px;
        }

        .step-content {
          flex: 1;
          font-size: 9pt;
          line-height: 1.5;
        }

        /* Quality Checks */
        .quality-checks {
          border: 1px solid #000;
          padding: 8px;
          margin: 12px 0;
          background: #f8f9fa;
        }

        .quality-checks h3 {
          font-size: 10pt;
          font-weight: bold;
          margin: 0 0 6px 0;
        }

        .quality-check-item {
          display: flex;
          align-items: baseline;
          margin-bottom: 4px;
          font-size: 9pt;
        }

        .checkbox {
          width: 12px;
          height: 12px;
          border: 1px solid #000;
          margin-right: 8px;
          flex-shrink: 0;
        }

        /* Storage Information */
        .storage-info {
          border: 2px solid #000;
          padding: 8px;
          margin: 12px 0;
        }

        .storage-info h3 {
          font-size: 10pt;
          font-weight: bold;
          margin: 0 0 6px 0;
          text-transform: uppercase;
        }

        .storage-grid {
          display: grid;
          grid-template-columns: 100px 1fr;
          gap: 4px 8px;
          font-size: 9pt;
        }

        .storage-label {
          font-weight: bold;
        }

        .critical-control {
          border: 2px solid #000;
          padding: 6px;
          margin-top: 6px;
          font-weight: bold;
          font-size: 9pt;
          text-align: center;
        }

        /* Footer */
        .sop-footer {
          border-top: 2px solid #000;
          padding-top: 8px;
          margin-top: 16px;
          font-size: 8pt;
        }

        .signature-section {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          margin-bottom: 12px;
        }

        .signature-block {
          border-top: 1px solid #000;
          padding-top: 4px;
        }

        .signature-label {
          font-weight: bold;
          margin-bottom: 2px;
        }

        .footer-meta {
          display: flex;
          justify-content: space-between;
          padding-top: 8px;
          border-top: 1px solid #000;
        }
      `}</style>

      <div style={{ maxWidth: '210mm', margin: '0 auto', padding: '20px' }}>
        {/* Header */}
        <div className="sop-header avoid-break">
          <div className="company-info">
            <div className="company-details">
              <h1>Checkly</h1>
              <p>Food Safety Management System</p>
            </div>
          </div>
          <div className="document-info">
            <strong>Standard Operating Procedure</strong>
            <div>Document: {sopCode}</div>
            <div>Date: {formatDate(sop.updated_at)}</div>
            <div>Version: {version.toFixed(1)}</div>
          </div>
        </div>

        {/* Document Control */}
        <div className="doc-control avoid-break">
          <h2>Document Control</h2>
          <div className="doc-control-grid">
            <span className="doc-control-label">Recipe Code:</span>
            <span>{sop.recipe?.code || sopCode}</span>
            <span className="doc-control-label">Status:</span>
            <span style={{ textTransform: 'uppercase' }}>{sop.status}</span>
            
            <span className="doc-control-label">Version:</span>
            <span>{version.toFixed(1)}</span>
            <span className="doc-control-label">Created:</span>
            <span>{formatDate(sop.created_at)}</span>
            
            <span className="doc-control-label">Last Review:</span>
            <span>{formatDate(sop.updated_at)}</span>
            <span className="doc-control-label">Next Review:</span>
            <span>{formatDate(nextReviewDate.toISOString())}</span>
          </div>
        </div>

        {/* Recipe Title */}
        <div className="recipe-title avoid-break">
          <h3>{sop.recipe?.name || sop.title}</h3>
          <div className="recipe-subtitle">
            {sop.recipe?.code || sopCode} • Version {sop.recipe?.version_number || sop.recipe?.version || version.toFixed(1)}
          </div>
        </div>

        {/* Allergen Warning */}
        {sop.recipe?.allergens && sop.recipe.allergens.length > 0 && (
          <div className="allergen-warning avoid-break">
            <div className="allergen-warning-header">
              <span>⚠</span>
              <span>ALLERGEN WARNING - CATEGORY 1</span>
              <span>⚠</span>
            </div>
            <div className="allergen-content">
              This product contains: {sop.recipe.allergens.join(', ').toUpperCase()}
            </div>
            <div className="allergen-note">
              Must be prepared in allergen-controlled area with dedicated equipment
            </div>
          </div>
        )}

        {/* Ingredients */}
        {sop.ingredients && sop.ingredients.length > 0 && (
          <div className="avoid-break">
            <h2 className="section-header">Ingredients</h2>
            <table className="ingredients-table">
              <thead>
                <tr>
                  <th style={{ width: '40%' }}>Ingredient</th>
                  <th style={{ width: '12%' }}>Qty</th>
                  <th style={{ width: '10%' }}>Unit</th>
                  <th style={{ width: '25%' }}>Supplier</th>
                  <th style={{ width: '13%' }}>Allergens</th>
                </tr>
              </thead>
              <tbody>
                {sop.ingredients.map((ing: any, idx: number) => {
                  const ingredientName = ing.ingredient_name || ing.ingredient || 'Unknown';
                  const allergens = ing.allergens || ing.allergen || [];
                  return (
                    <tr key={idx}>
                      <td>{ingredientName}</td>
                      <td className="qty-cell">{ing.quantity || 0}</td>
                      <td>{ing.unit || '-'}</td>
                      <td>{ing.supplier || 'None'}</td>
                      <td>{allergens.length > 0 ? allergens.join(', ') : '-'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="ingredients-footer">
              <span>TOTAL RECIPE COST: £{(sop.recipe?.total_cost || 0).toFixed(2)}</span>
              <span>YIELD: {sop.recipe?.yield_qty || 0}{sop.recipe?.yield_unit || 'g'}</span>
            </div>
          </div>
        )}

        {/* Equipment */}
        {sop.equipment && sop.equipment.length > 0 && (
          <div className="avoid-break">
            <h2 className="section-header">Equipment Required</h2>
            <ul className="equipment-list">
              {sop.equipment.map((item: string, idx: number) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Method */}
        {sop.method_steps && sop.method_steps.length > 0 && (
          <div>
            <h2 className="section-header">Method</h2>
            <div className="method-steps">
              {sop.method_steps.map((step: string, idx: number) => (
                <div key={idx} className="method-step">
                  <div className="step-number">{idx + 1}</div>
                  <div className="step-content">{step}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quality Checks */}
        <div className="quality-checks avoid-break">
          <h3>Quality Control Checks</h3>
          <div className="quality-check-item">
            <div className="checkbox"></div>
            <span>Visual: Check appearance and consistency</span>
          </div>
          <div className="quality-check-item">
            <div className="checkbox"></div>
            <span>Texture: Ensure correct texture and no defects</span>
          </div>
          <div className="quality-check-item">
            <div className="checkbox"></div>
            <span>Temperature: Verify storage temperature &lt;5°C</span>
          </div>
        </div>

        {/* Storage Information */}
        <div className="storage-info avoid-break">
          <h3>Storage & Food Safety</h3>
          <div className="storage-grid">
            <span className="storage-label">Storage:</span>
            <span>{sop.recipe?.storage_requirements || 'Refrigerated (0-5°C)'}</span>
            
            <span className="storage-label">Container:</span>
            <span>Sealed, food-grade container</span>
            
            <span className="storage-label">Shelf Life:</span>
            <span>{sop.recipe?.shelf_life_days || 0} days from production</span>
            
            <span className="storage-label">Label Required:</span>
            <span>Date, Allergens, Use-by date</span>
          </div>
          <div className="critical-control">
            ⚠ CRITICAL CONTROL POINT: Must be cooled to &lt;5°C within 90 minutes
          </div>
        </div>

        {/* Footer */}
        <div className="sop-footer">
          <div className="signature-section">
            <div className="signature-block">
              <div className="signature-label">Prepared by:</div>
              <div>{sop.created_by_name || 'System'}</div>
              <div>Date: {formatDate(sop.created_at)}</div>
            </div>
            <div className="signature-block">
              <div className="signature-label">Approved by:</div>
              <div>_________________________</div>
              <div>Date: __________________</div>
            </div>
          </div>
          <div className="footer-meta">
            <span>Document: {sopCode}-v{version.toFixed(1)}</span>
            <span>Page 1 of 1</span>
            <span>Checkly Food Safety System</span>
          </div>
        </div>
      </div>
    </>
  );
}

