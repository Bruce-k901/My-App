'use client';

import { useState, useTransition, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FileText, Plus, Clock, Calendar, Copy, Eye, Edit, ArrowLeft, AlertTriangle } from '@/components/ui/icons';
import { Button } from '@/components/ui';
import Input from '@/components/ui/Input';
import { toast } from 'sonner';
import { cloneTemplate } from '@/app/actions/reviews';
import type { ReviewTemplate } from '@/types/reviews';
import { getTemplateConfig, isDisciplinaryTemplate, TEMPLATE_CATEGORIES } from '@/lib/reviews-utils';
import { useAppContext } from '@/context/AppContext';

interface TemplateLibraryProps {
  systemTemplates: ReviewTemplate[];
  companyTemplates: ReviewTemplate[];
}

export function TemplateLibrary({ systemTemplates, companyTemplates }: TemplateLibraryProps) {
  const { profile } = useAppContext();
  
  // Check if user is staff (should not be able to edit/clone templates)
  const isStaff = profile?.app_role && 
    ['staff', 'employee'].includes((profile.app_role || '').toLowerCase());
  const [activeTab, setActiveTab] = useState('system');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [cloneDialogOpen, setCloneDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<ReviewTemplate | null>(null);
  const [newName, setNewName] = useState('');
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  // Filter templates by category
  const filteredSystemTemplates = useMemo(() => {
    if (activeCategory === 'all') return systemTemplates;
    return systemTemplates.filter(template => {
      const config = getTemplateConfig(template.template_type);
      return config.category === activeCategory;
    });
  }, [systemTemplates, activeCategory]);

  const filteredCompanyTemplates = useMemo(() => {
    if (activeCategory === 'all') return companyTemplates;
    return companyTemplates.filter(template => {
      const config = getTemplateConfig(template.template_type);
      return config.category === activeCategory;
    });
  }, [companyTemplates, activeCategory]);

  const handleCloneClick = (template: ReviewTemplate) => {
    setSelectedTemplate(template);
    setNewName(`${template.name} (Copy)`);
    setCloneDialogOpen(true);
  };

  const handleClone = () => {
    if (!selectedTemplate) return;
    startTransition(async () => {
      try {
        const result = await cloneTemplate(selectedTemplate.id, newName || `${selectedTemplate.name} (Copy)`);
        toast.success('Template cloned successfully');
        setCloneDialogOpen(false);
        router.push(`/dashboard/people/reviews/templates/${result.id}`);
      } catch (error) {
        toast.error('Failed to clone template');
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/people/reviews">
          <Button variant="ghost" className="text-theme-secondary hover:text-theme-primary">
            <ArrowLeft className="h-4 w-4 mr-2" />Back
          </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-semibold text-theme-primary">Review Templates</h1>
            <p className="text-sm text-theme-secondary mt-1">Browse system templates or create your own</p>
          </div>
        </div>
        {!isStaff && (
          <Link href="/dashboard/people/reviews/templates/new">
            <Button variant="primary" className="bg-module-fg hover:bg-module-fg/90 text-white border-0 shadow-sm dark:shadow-none">
              <Plus className="h-4 w-4 mr-2" />Create Template
            </Button>
          </Link>
        )}
      </div>

      <div className="space-y-4">
        {/* System/Company Tabs */}
        <div className="flex gap-2 border-b border-theme">
          <button
            onClick={() => setActiveTab('system')}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
              activeTab === 'system'
                ? 'border-module-fg text-module-fg'
                : 'border-transparent text-theme-secondary hover:text-theme-primary'
            }`}
          >
            System Templates <span className="ml-2 px-2 py-0.5 bg-theme-button rounded text-xs text-theme-secondary">{systemTemplates.length}</span>
          </button>
          <button
            onClick={() => setActiveTab('company')}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
              activeTab === 'company'
                ? 'border-module-fg text-module-fg'
                : 'border-transparent text-theme-secondary hover:text-theme-primary'
            }`}
          >
            Company Templates <span className="ml-2 px-2 py-0.5 bg-theme-button rounded text-xs text-theme-secondary">{companyTemplates.length}</span>
          </button>
        </div>

        {/* Category Filter Tabs */}
        <div className="flex gap-2 flex-wrap border-b border-theme pb-2">
          <button
            onClick={() => setActiveCategory('all')}
            className={`px-3 py-1.5 text-sm font-medium transition-colors rounded ${
              activeCategory === 'all'
                ? 'bg-module-fg/10 text-module-fg border border-module-fg/20'
                : 'text-theme-secondary hover:text-module-fg hover:bg-module-fg/10'
            }`}
          >
            All
          </button>
          {Object.entries(TEMPLATE_CATEGORIES).map(([key, category]) => {
            const Icon = category.icon;
            const count = activeTab === 'system' 
              ? filteredSystemTemplates.length 
              : filteredCompanyTemplates.length;
            return (
              <button
                key={key}
                onClick={() => setActiveCategory(key)}
                className={`px-3 py-1.5 text-sm font-medium transition-colors rounded flex items-center gap-1.5 ${
                  activeCategory === key
                    ? 'bg-module-fg/10 text-module-fg border border-module-fg/20'
                    : 'text-theme-secondary hover:text-module-fg hover:bg-module-fg/10'
                }`}
              >
                {key === 'disciplinary' && <AlertTriangle className="h-3.5 w-3.5" />}
                {category.label}
                {activeCategory === key && (
                  <span className="px-1.5 py-0.5 bg-module-fg/10 rounded text-xs text-module-fg">
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {activeTab === 'system' && (
        <div>
          {filteredSystemTemplates.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredSystemTemplates.map((template) => (
                <TemplateCard 
                  key={template.id} 
                  template={template} 
                  onClone={isStaff ? undefined : () => handleCloneClick(template)}
                  canEdit={!isStaff}
                />
              ))}
            </div>
          ) : (
            <div className="bg-theme-surface border border-theme rounded-lg p-12 text-center">
              <FileText className="h-12 w-12 mx-auto text-theme-tertiary mb-4" />
              <h3 className="text-base font-semibold text-theme-primary">No templates found</h3>
              <p className="text-theme-secondary mt-1">No system templates match the selected category.</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'company' && (
        <div>
          {filteredCompanyTemplates.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredCompanyTemplates.map((template) => (
                <TemplateCard 
                  key={template.id} 
                  template={template} 
                  isCompanyTemplate 
                  canEdit={!isStaff}
                />
              ))}
            </div>
          ) : (
            <div className="bg-theme-surface border border-theme rounded-lg p-12 text-center">
              <FileText className="h-12 w-12 mx-auto text-theme-tertiary mb-4" />
              <h3 className="text-base font-semibold text-theme-primary">No company templates</h3>
              <p className="text-theme-tertiary mt-1">Clone a system template or create your own to get started.</p>
              <Link href="/dashboard/people/reviews/templates/new">
                <Button variant="primary" className="mt-4 bg-transparent border border-module-fg text-module-fg hover:shadow-module-glow">
                  <Plus className="h-4 w-4 mr-2" />Create Template
                </Button>
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Clone Dialog */}
      {cloneDialogOpen && (
        <div className="fixed inset-0 bg-black/30 dark:bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-[#171b2d] border border-theme rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
            <h3 className="text-base font-semibold text-theme-primary mb-2">Clone Template</h3>
            <p className="text-sm text-theme-secondary mb-4">Create a copy of "{selectedTemplate?.name}" that you can customize.</p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-theme-primary mb-2">New Template Name</label>
                <Input
                  placeholder={`${selectedTemplate?.name} (Copy)`}
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <Button variant="outline" onClick={() => setCloneDialogOpen(false)}>Cancel</Button>
              <Button 
                variant="primary" 
                onClick={handleClone} 
                disabled={isPending}
                className="bg-module-fg hover:bg-module-fg/90 text-white border-0 shadow-sm dark:shadow-none"
              >
                {isPending ? 'Cloning...' : 'Clone Template'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TemplateCard({ template, isCompanyTemplate = false, onClone, canEdit = true }: {
  template: ReviewTemplate; isCompanyTemplate?: boolean; onClone?: () => void; canEdit?: boolean;
}) {
  const sectionCount = template.sections?.length || 0;
  const config = getTemplateConfig(template.template_type);
  const isDisciplinary = isDisciplinaryTemplate(template.template_type);
  const Icon = config.icon;

  return (
    <div className={`bg-theme-surface border border-theme rounded-lg p-4 hover:border-theme-hover transition-colors shadow-sm dark:shadow-none ${
      isDisciplinary ? 'border-l-4 border-l-red-500 dark:border-l-red-400' : ''
    }`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3 flex-1">
          <div className={`p-2 rounded-lg ${config.bgColor}`}>
            <Icon className={`h-5 w-5 ${config.color}`} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-semibold text-theme-primary">{template.name}</h3>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className={`px-2 py-0.5 rounded text-xs border ${
                config.category === 'performance' 
                  ? 'bg-blue-50 dark:bg-blue-600/20 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-600/30'
                  : config.category === 'onboarding'
                  ? 'bg-green-50 dark:bg-green-600/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-600/30'
                  : config.category === 'offboarding'
 ?'bg-gray-100 dark:bg-gray-600/20 text-theme-secondary border-gray-300 dark:border-gray-600/30'
                  : config.category === 'disciplinary'
                  ? 'bg-red-50 dark:bg-red-600/20 text-red-700 dark:text-red-400 border-red-200 dark:border-red-600/30'
 :'bg-gray-100 dark:bg-gray-600/20 text-theme-secondary border-gray-300 dark:border-gray-600/30'
              }`}>
                {config.shortLabel}
              </span>
              {isDisciplinary && (
                <span className="px-2 py-0.5 bg-red-50 dark:bg-red-600/20 text-red-700 dark:text-red-400 rounded text-xs border border-red-200 dark:border-red-600/30 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  HR Process
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {template.description && (
        <p className="text-theme-secondary text-sm mb-4 line-clamp-2">{template.description}</p>
      )}

      <div className="flex flex-wrap gap-4 text-sm text-theme-tertiary mb-4">
        <div className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {template.recommended_duration_minutes} mins
        </div>
        {template.recommended_frequency_days && (
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            Every {template.recommended_frequency_days} days
          </div>
        )}
        <div className="flex items-center gap-1">
          <FileText className="h-3 w-3" />
          {sectionCount} sections
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {template.requires_self_assessment && (
          <span className="px-2 py-0.5 bg-theme-button text-theme-secondary rounded text-xs border border-theme">
            Self Assessment
          </span>
        )}
        {template.requires_manager_assessment && (
          <span className="px-2 py-0.5 bg-theme-button text-theme-secondary rounded text-xs border border-theme">
            Manager Assessment
          </span>
        )}
      </div>

      <div className="flex gap-2">
        {isCompanyTemplate ? (
          // Company templates: Edit button is primary (only if canEdit)
          <>
            {canEdit && (
              <Link href={`/dashboard/people/reviews/templates/${template.id}`} className="flex-1">
                <Button variant="primary" className="w-full bg-module-fg hover:bg-module-fg/90 text-white border-0 shadow-sm dark:shadow-none">
                  <Edit className="h-4 w-4 mr-2" />Edit
                </Button>
              </Link>
            )}
            <Link href={`/dashboard/people/reviews/templates/${template.id}`} className="flex-1">
              <Button variant="outline" className="w-full">
                <Eye className="h-4 w-4 mr-2" />View
              </Button>
            </Link>
          </>
        ) : (
          // System templates: View only for staff, View/Edit/Clone for managers+
          <>
            <Link href={`/dashboard/people/reviews/templates/${template.id}`} className="flex-1">
              <Button variant="outline" className="w-full">
                <Eye className="h-4 w-4 mr-2" />View
              </Button>
            </Link>
            {canEdit && (
              <>
                <Link href={`/dashboard/people/reviews/templates/${template.id}`} className="flex-1">
                  <Button variant="primary" className="w-full bg-module-fg hover:bg-module-fg/90 text-white border-0 shadow-sm dark:shadow-none">
                    <Edit className="h-4 w-4 mr-2" />Edit
                  </Button>
                </Link>
                {onClone && (
                  <Button variant="outline" onClick={onClone} className="flex-1">
                    <Copy className="h-4 w-4 mr-2" />Clone
                  </Button>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

