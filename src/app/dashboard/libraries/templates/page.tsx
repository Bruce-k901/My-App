"use client";

import { useState } from 'react';
import { Search, Download, FileText, Package, Shield, Droplets, Coffee, Box, Wine, ShoppingBag, UtensilsCrossed, Zap, Heart } from '@/components/ui/icons';
import { useToast } from '@/components/ui/ToastProvider';
import { useRouter } from 'next/navigation';

interface LibraryTemplate {
  id: string;
  name: string;
  description: string;
  tableName: string;
  icon: any;
  color: string;
  borderColor: string;
  fields: string[];
  csvHeaders: string[];
}

const LIBRARY_TEMPLATES: LibraryTemplate[] = [
  {
    id: 'ingredients',
    name: 'Ingredients Library',
    description: 'Food ingredients with allergens, costs, and supplier information',
    tableName: 'ingredients_library',
    icon: Package,
    color: 'from-green-500/20 to-emerald-500/20',
    borderColor: 'border-green-500/30',
    fields: ['ingredient_name', 'category', 'allergens', 'unit', 'unit_cost', 'supplier', 'pack_size', 'notes'],
    csvHeaders: ['ingredient_name', 'category', 'allergens', 'unit', 'unit_cost', 'supplier', 'pack_size', 'notes']
  },
  {
    id: 'ppe',
    name: 'PPE Library',
    description: 'Personal Protective Equipment with compliance standards and sizing',
    tableName: 'ppe_library',
    icon: Shield,
    color: 'from-blue-500/20 to-cyan-500/20',
    borderColor: 'border-blue-500/30',
    fields: ['item_name', 'category', 'standard_compliance', 'size_options', 'supplier', 'unit_cost', 'reorder_level', 'linked_risks', 'cleaning_replacement_interval', 'notes'],
    csvHeaders: ['item_name', 'category', 'standard_compliance', 'size_options', 'supplier', 'unit_cost', 'reorder_level', 'linked_risks', 'cleaning_replacement_interval', 'notes']
  },
  {
    id: 'chemicals',
    name: 'Chemicals Library',
    description: 'Cleaning chemicals and hazardous substances with safety data',
    tableName: 'chemicals_library',
    icon: Droplets,
    color: 'from-purple-500/20 to-module-fg/[0.25]',
    borderColor: 'border-purple-500/30',
    fields: ['product_name', 'manufacturer', 'use_case', 'hazard_symbols', 'dilution_ratio', 'contact_time', 'required_ppe', 'coshh_sheet_url', 'supplier', 'unit_cost', 'pack_size', 'storage_requirements', 'linked_risks', 'first_aid_instructions', 'environmental_info', 'notes'],
    csvHeaders: ['product_name', 'manufacturer', 'use_case', 'hazard_symbols', 'dilution_ratio', 'contact_time', 'required_ppe', 'coshh_sheet_url', 'supplier', 'unit_cost', 'pack_size', 'storage_requirements', 'linked_risks', 'first_aid_instructions', 'environmental_info', 'notes']
  },
  {
    id: 'drinks',
    name: 'Drinks Library',
    description: 'Beverages with ABV, allergens, and storage information',
    tableName: 'drinks_library',
    icon: Coffee,
    color: 'from-amber-500/20 to-orange-500/20',
    borderColor: 'border-amber-500/30',
    fields: ['item_name', 'category', 'sub_category', 'abv', 'allergens', 'unit', 'unit_cost', 'supplier', 'pack_size', 'storage_type', 'shelf_life', 'notes'],
    csvHeaders: ['item_name', 'category', 'sub_category', 'abv', 'allergens', 'unit', 'unit_cost', 'supplier', 'pack_size', 'storage_type', 'shelf_life', 'notes']
  },
  {
    id: 'disposables',
    name: 'Disposables Library',
    description: 'Single-use items like napkins, straws, and containers',
    tableName: 'disposables_library',
    icon: Box,
    color: 'from-gray-500/20 to-slate-500/20',
    borderColor: 'border-gray-500/30',
    fields: ['item_name', 'category', 'material', 'eco_friendly', 'color_finish', 'dimensions', 'supplier', 'pack_cost', 'pack_size', 'reorder_level', 'storage_location', 'usage_context', 'notes'],
    csvHeaders: ['item_name', 'category', 'material', 'eco_friendly', 'color_finish', 'dimensions', 'supplier', 'pack_cost', 'pack_size', 'reorder_level', 'storage_location', 'usage_context', 'notes']
  },
  {
    id: 'glassware',
    name: 'Glassware Library',
    description: 'Glass items with capacity, shape, and care instructions',
    tableName: 'glassware_library',
    icon: Wine,
    color: 'from-indigo-500/20 to-violet-500/20',
    borderColor: 'border-module-fg/30',
    fields: ['item_name', 'category', 'capacity_ml', 'material', 'shape_style', 'recommended_for', 'supplier', 'unit_cost', 'pack_size', 'dishwasher_safe', 'breakage_rate', 'storage_location', 'reorder_level', 'notes'],
    csvHeaders: ['item_name', 'category', 'capacity_ml', 'material', 'shape_style', 'recommended_for', 'supplier', 'unit_cost', 'pack_size', 'dishwasher_safe', 'breakage_rate', 'storage_location', 'reorder_level', 'notes']
  },
  {
    id: 'packaging',
    name: 'Packaging Library',
    description: 'Takeaway containers, bags, and packaging materials',
    tableName: 'packaging_library',
    icon: ShoppingBag,
    color: 'from-teal-500/20 to-cyan-500/20',
    borderColor: 'border-module-fg/30',
    fields: ['item_name', 'category', 'material', 'capacity_size', 'eco_friendly', 'compostable', 'recyclable', 'hot_food_suitable', 'microwave_safe', 'leak_proof', 'color_finish', 'supplier', 'pack_cost', 'pack_size', 'dimensions', 'usage_context', 'reorder_level', 'notes'],
    csvHeaders: ['item_name', 'category', 'material', 'capacity_size', 'eco_friendly', 'compostable', 'recyclable', 'hot_food_suitable', 'microwave_safe', 'leak_proof', 'color_finish', 'supplier', 'pack_cost', 'pack_size', 'dimensions', 'usage_context', 'reorder_level', 'notes']
  },
  {
    id: 'serving-equipment',
    name: 'Serving Equipment Library',
    description: 'Plates, bowls, utensils, and serving tools',
    tableName: 'equipment_library',
    icon: UtensilsCrossed,
    color: 'from-rose-500/20 to-module-fg/[0.25]',
    borderColor: 'border-rose-500/30',
    fields: ['item_name', 'category', 'material', 'size_dimensions', 'shape', 'use_case', 'color_finish', 'dishwasher_safe', 'oven_safe', 'supplier', 'brand', 'color_coding', 'unit_cost', 'storage_location', 'notes'],
    csvHeaders: ['item_name', 'category', 'material', 'size_dimensions', 'shape', 'use_case', 'color_finish', 'dishwasher_safe', 'oven_safe', 'supplier', 'brand', 'color_coding', 'unit_cost', 'storage_location', 'notes']
  },
  {
    id: 'appliances',
    name: 'Appliances Library',
    description: 'PAT tested appliances and electrical equipment',
    tableName: 'pat_appliances',
    icon: Zap,
    color: 'from-yellow-500/20 to-amber-500/20',
    borderColor: 'border-yellow-500/30',
    fields: ['name', 'brand', 'site_id', 'purchase_date', 'has_current_pat_label', 'notes'],
    csvHeaders: ['name', 'brand', 'site_name', 'purchase_date', 'has_current_pat_label', 'notes']
  },
  {
    id: 'first-aid',
    name: 'First Aid Supplies Library',
    description: 'First aid items with expiry dates and compliance standards',
    tableName: 'first_aid_supplies_library',
    icon: Heart,
    color: 'from-red-500/20 to-rose-500/20',
    borderColor: 'border-red-500/30',
    fields: ['item_name', 'category', 'sub_category', 'standard_compliance', 'expiry_period_months', 'supplier', 'unit_cost', 'pack_size', 'storage_requirements', 'typical_usage', 'notes'],
    csvHeaders: ['item_name', 'category', 'sub_category', 'standard_compliance', 'expiry_period_months', 'supplier', 'unit_cost', 'pack_size', 'storage_requirements', 'typical_usage', 'notes']
  }
];

export default function LibraryTemplatesPage() {
  const { showToast } = useToast();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const csvInputRefs: Record<string, React.RefObject<HTMLInputElement>> = {};

  // Initialize refs for each template
  LIBRARY_TEMPLATES.forEach(template => {
    csvInputRefs[template.id] = { current: null };
  });

  const filteredTemplates = LIBRARY_TEMPLATES.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         template.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const escapeCSV = (value: any): string => {
    if (value === null || value === undefined) return '';
    const str = String(value);
    if (/[",\n]/.test(str)) {
      return '"' + str.replace(/"/g, '""') + '"';
    }
    return str;
  };

  const handleDownloadCSV = async (template: LibraryTemplate) => {
    try {
      // Download a virgin template with just headers (no data)
      // Users will populate this with their own goods
      const header = template.csvHeaders.map(h => escapeCSV(h)).join(',');
      const csv = header; // Just headers, no data rows

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${template.tableName}_template.csv`;
      a.click();
      URL.revokeObjectURL(url);

      showToast({
        title: 'Template downloaded',
        description: 'Blank template ready for your data',
        type: 'success'
      });
    } catch (error: any) {
      console.error('Error downloading template:', error);
      showToast({
        title: 'Error downloading template',
        description: error.message || 'Failed to download template',
        type: 'error'
      });
    }
  };



  return (
    <div className="bg-[rgb(var(--surface-elevated))] text-theme-primary border border-neutral-800 rounded-xl p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-theme-primary mb-2">Library Templates</h1>
        <p className="text-theme-tertiary text-sm sm:text-base">Open a template to add items one by one or upload a CSV file. Build out your library and save when ready.</p>
      </div>

      {/* Search */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-theme-tertiary w-4 h-4" />
          <input
            type="text"
            placeholder="Search library templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white/[0.06] border border-white/[0.1] rounded-lg text-theme-primary placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-module-fg/[0.40]"
          />
        </div>
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
        {filteredTemplates.map((template) => {
          const Icon = template.icon;
          return (
            <div
              key={template.id}
              className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-5 hover:bg-white/[0.06] transition-colors relative group"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3 flex-1">
                  <div className={`p-2 rounded-lg bg-gradient-to-br ${template.color}`}>
                    <Icon className="w-5 h-5 text-theme-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-theme-primary mb-1">{template.name}</h3>
                    <p className="text-theme-tertiary text-sm line-clamp-2">{template.description}</p>
                  </div>
                </div>
              </div>

              {/* Template Info */}
              <div className="mb-4">
                <span className="px-2 py-1 bg-green-500/20 text-green-400 border border-green-500/30 rounded-full text-xs">
                  Blank Template
                </span>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => router.push(`/dashboard/libraries/templates/${template.id}`)}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-magenta-500/20 border border-magenta-500/40 rounded-lg text-magenta-400 hover:bg-magenta-500/30 transition-colors"
                  title="Open template to add items"
                >
                  <FileText className="h-4 w-4" />
                  <span className="text-sm font-medium">Open Template</span>
                </button>
                <button
                  onClick={() => handleDownloadCSV(template)}
                  className="px-3 py-2 bg-blue-500/20 border border-blue-500/40 rounded-lg text-blue-400 hover:bg-module-fg/10 transition-colors"
                  title="Download blank template"
                >
                  <Download className="h-4 w-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {filteredTemplates.length === 0 && (
        <div className="mt-8 text-center py-12">
          <FileText className="h-12 w-12 text-white/20 mx-auto mb-4" />
          <p className="text-theme-tertiary mb-2">No templates match your search</p>
          <button
            onClick={() => setSearchQuery('')}
            className="text-module-fg hover:text-module-fg text-sm mt-2"
          >
            Clear search
          </button>
        </div>
      )}

    </div>
  );
}

