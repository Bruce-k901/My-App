"use client";

import React, { useState, useEffect } from 'react';
import { ComplianceTemplateCard } from '@/components/compliance/ComplianceTemplateCard';
import { DeployComplianceModal } from '@/components/compliance/DeployComplianceModal';
import { TemperatureCheckTemplate } from '@/components/compliance/TemperatureCheckTemplate';
import { TaskHeader } from '@/components/tasks/TaskHeader';

interface ComplianceTemplate {
  id: string;
  name: string;
  description: string;
  regulation_type: string;
  category: string;
  frequency: string;
  min_instances_per_day: number;
  icon: string;
}

export default function CompliancePage() {
  const [templates, setTemplates] = useState<ComplianceTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [deployModalOpen, setDeployModalOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<ComplianceTemplate | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("name");
  const [filterBy, setFilterBy] = useState("all");

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      const response = await fetch('/api/compliance/templates');
      const data = await response.json();
      
      if (data.data) {
        setTemplates(data.data);
      }
    } catch (error) {
      console.error('Failed to load templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeploy = (template: ComplianceTemplate) => {
    setSelectedTemplate(template);
    setDeployModalOpen(true);
  };

  const handleDeploySubmit = async (siteIds: string[], daypart: string) => {
    if (!selectedTemplate) return;

    try {
      const response = await fetch('/api/compliance/deploy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + localStorage.getItem('token'), // Replace with actual auth
        },
        body: JSON.stringify({
          template_id: selectedTemplate.id,
          site_ids: siteIds,
          daypart: daypart,
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        alert(`Successfully deployed ${selectedTemplate.name} to ${siteIds.length} site(s)`);
        setDeployModalOpen(false);
        setSelectedTemplate(null);
      } else {
        throw new Error(data.error || 'Deploy failed');
      }
    } catch (error) {
      console.error('Deploy failed:', error);
      alert('Deploy failed. Please try again.');
    }
  };

  const handleCreateTemplate = () => {
    // TODO: Implement create template flow
    console.log('Create new compliance template');
  };

  const handleEditTemplate = (template: ComplianceTemplate) => {
    // TODO: Implement edit template flow
    console.log('Edit template:', template.id);
  };

  const handleCloneTemplate = (template: ComplianceTemplate) => {
    // TODO: Implement clone template flow
    console.log('Clone template:', template.id);
  };

  // Filter and sort templates
  const filteredAndSortedTemplates = templates
    .filter(template => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return template.name.toLowerCase().includes(query) || 
               template.description.toLowerCase().includes(query);
      }
      return true;
    })
    .filter(template => {
      // Status filter
      if (filterBy === "all") return true;
      return template.category.toLowerCase() === filterBy.toLowerCase();
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "name":
          return a.name.localeCompare(b.name);
        case "date":
          return new Date(b.id).getTime() - new Date(a.id).getTime(); // Assuming ID contains date info
        case "status":
          return a.category.localeCompare(b.category);
        case "category":
          return a.category.localeCompare(b.category);
        default:
          return 0;
      }
    });

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-900 flex items-center justify-center">
        <div className="text-white">Loading compliance templates...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-900">
      <TaskHeader
        title="Compliance Tasks"
        createButtonText="Create Template"
        onCreateClick={handleCreateTemplate}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        sortBy={sortBy}
        onSortChange={setSortBy}
        filterBy={filterBy}
        onFilterChange={setFilterBy}
      />

      <div className="p-6 max-w-4xl mx-auto">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-white mb-2">Available Templates</h2>
          <p className="text-neutral-400">
            Deploy compliance tasks to your sites. Each template includes SFBB requirements and can be customized per site.
          </p>
        </div>

        <div className="templates-grid">
          {/* Temperature Check Template */}
          <TemperatureCheckTemplate />
          
          {/* Other templates */}
          {filteredAndSortedTemplates.map((template) => (
            <ComplianceTemplateCard
              key={template.id}
              template={template}
              onEdit={() => handleEditTemplate(template)}
            />
          ))}
        </div>
      </div>

      {deployModalOpen && selectedTemplate && (
        <DeployComplianceModal
          template={selectedTemplate}
          onDeploy={handleDeploySubmit}
          onClose={() => {
            setDeployModalOpen(false);
            setSelectedTemplate(null);
          }}
        />
      )}

      <style jsx>{`
        .templates-grid {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .empty-state {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 300px;
          text-align: center;
        }

        .empty-content {
          color: #A3A3A3;
        }

        .empty-icon {
          font-size: 48px;
          margin-bottom: 16px;
        }

        .empty-content h3 {
          font-size: 18px;
          font-weight: 600;
          color: #FFFFFF;
          margin: 0 0 8px 0;
        }

        .empty-content p {
          font-size: 14px;
          margin: 0;
        }
      `}</style>
    </div>
  );
}