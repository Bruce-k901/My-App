import React from 'react';

interface SOPPrintTemplateProps {
  sop: {
    sop_code?: string;
    ref_code?: string;
    title: string;
    version?: number;
    version_number?: number;
    status: string;
    created_at: string;
    updated_at: string;
    created_by_name?: string;
    recipe?: {
      name: string;
      code: string;
      version_number?: number;
      version?: number;
      allergens?: string[];
      total_cost?: number;
      yield_qty?: number;
      yield_unit?: string;
      shelf_life_days?: number;
      storage_requirements?: string;
    };
    ingredients?: Array<{
      ingredient_name?: string;
      ingredient?: string;
      quantity: number;
      unit: string;
      supplier?: string;
      allergens?: string[];
      allergen?: string[];
    }>;
    equipment?: string[];
    method_steps?: string[];
  };
  companyName?: string;
  companyLogo?: string;
}

export const SOPPrintTemplate: React.FC<SOPPrintTemplateProps> = ({ 
  sop, 
  companyName = 'Checkly',
  companyLogo 
}) => {
  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const version = sop.version || sop.version_number || 1.0;
  const sopCode = sop.sop_code || sop.ref_code || 'SOP-001';
  const nextReviewDate = new Date(sop.updated_at);
  nextReviewDate.setDate(nextReviewDate.getDate() + 90);

  // Get allergens from recipe or extract from ingredients
  const recipeAllergens = sop.recipe?.allergens || [];
  const ingredientAllergens = sop.ingredients?.flatMap(ing => 
    (ing.allergens || ing.allergen || [])
  ) || [];
  const allAllergens = [...new Set([...recipeAllergens, ...ingredientAllergens])];

  return (
    <div className="sop-print-container">
      {/* Print Styles */}
      <style jsx>{`
        @media print {
          @page {
            size: A4;
            margin: 15mm;
          }

          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }

          body {
            background: white !important;
            color: black !important;
          }

          .sop-print-container {
            width: 100%;
            font-family: 'Arial', sans-serif;
            font-size: 10pt;
            line-height: 1.4;
            color: #000;
          }

          /* Hide screen-only elements */
          .no-print {
            display: none !important;
          }

          /* Page breaks */
          .page-break {
            page-break-after: always;
          }

          .avoid-break {
            page-break-inside: avoid;
            page-break-after: avoid;
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

          /* Document Control Table */
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

          /* Allergen Warning - B&W optimized */
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
            counter-reset: step-counter;
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
        }

        @media screen {
          .sop-print-container {
            max-width: 210mm;
            margin: 0 auto;
            padding: 20px;
            background: white;
            box-shadow: 0 0 10px rgba(0,0,0,0.1);
            font-family: 'Arial', sans-serif;
            font-size: 10pt;
            line-height: 1.4;
            color: #000;
          }

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

          .section-header {
            font-size: 11pt;
            font-weight: bold;
            text-transform: uppercase;
            margin: 12px 0 6px 0;
            padding-bottom: 2px;
            border-bottom: 1px solid #000;
          }

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

          .equipment-list {
            margin: 8px 0 12px 20px;
            font-size: 9pt;
          }

          .equipment-list li {
            margin-bottom: 3px;
          }

          .method-steps {
            counter-reset: step-counter;
            margin: 8px 0;
          }

          .method-step {
            display: flex;
            margin-bottom: 10px;
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
        }
      `}</style>

      {/* Header */}
      <div className="sop-header avoid-break">
        <div className="company-info">
          <div className="company-details">
            <h1>{companyName}</h1>
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
      {allAllergens.length > 0 && (
        <div className="allergen-warning avoid-break">
          <div className="allergen-warning-header">
            <span>⚠</span>
            <span>ALLERGEN WARNING - CATEGORY 1</span>
            <span>⚠</span>
          </div>
          <div className="allergen-content">
            This product contains: {allAllergens.join(', ').toUpperCase()}
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
                // Use scaled quantity (already calculated in view page)
                const displayQuantity = ing.quantity || 0;
                return (
                  <tr key={idx}>
                    <td>{ingredientName}</td>
                    <td className="qty-cell">
                      {displayQuantity % 1 === 0 
                        ? displayQuantity.toFixed(0) 
                        : displayQuantity.toFixed(2)}
                    </td>
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
            <span>YIELD: {(() => {
              const yieldQty = sop.recipe?.yield_qty || 0;
              const yieldUnit = sop.recipe?.yield_unit || 'g';
              return yieldQty % 1 === 0 
                ? `${yieldQty.toFixed(0)}${yieldUnit}` 
                : `${yieldQty.toFixed(2)}${yieldUnit}`;
            })()}</span>
            {sop.multiplier && sop.multiplier !== 1 && (
              <span className="text-xs opacity-75">
                (Scaled ×{sop.multiplier.toFixed(1)})
              </span>
            )}
          </div>
        </div>
      )}

      {/* Equipment */}
      {sop.equipment && sop.equipment.length > 0 && (
        <div className="avoid-break">
          <h2 className="section-header">Equipment Required</h2>
          <ul className="equipment-list">
            {sop.equipment.map((item, idx) => (
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
            {sop.method_steps.map((step, idx) => (
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
          <span>{companyName} Food Safety System</span>
        </div>
      </div>
    </div>
  );
};

