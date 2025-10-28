"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { TaskHeader } from '@/components/tasks/TaskHeader';
import { TaskList } from '@/components/tasks/TaskList';
import { TaskCard } from '@/components/tasks/TaskCard';

const TASK_TEMPLATES = [];

export default function TaskTemplatesPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("name");
  const [filterBy, setFilterBy] = useState("all");

  // Filter and sort templates
  const filteredAndSortedTemplates = TASK_TEMPLATES
    .filter(template => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return template.title.toLowerCase().includes(query) || 
               template.description.toLowerCase().includes(query);
      }
      return true;
    })
    .filter(template => {
      // Status filter
      if (filterBy === "all") return true;
      return template.status.toLowerCase() === filterBy.toLowerCase();
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "name":
          return a.title.localeCompare(b.title);
        case "date":
          return a.id.localeCompare(b.id); // Using ID as proxy for date
        case "status":
          return a.status.localeCompare(b.status);
        case "category":
          return a.category.localeCompare(b.category);
        default:
          return 0;
      }
    });

  const handleCreateTemplate = () => {
    // TODO: Implement create template flow
    console.log('Create new template');
  };

  const handleUseTemplate = (templateId: string) => {
    // TODO: Implement use template flow
    console.log('Use template:', templateId);
  };

  const handleEditTemplate = (templateId: string) => {
    // TODO: Implement edit template flow
    console.log('Edit template:', templateId);
  };

  const handleViewTemplate = (templateId: string) => {
    // TODO: Implement view template flow
    console.log('View template:', templateId);
  };

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-magenta-600/20 to-blue-600/20 rounded-2xl p-6 border border-magenta-500/30">
        <h1 className="text-2xl font-semibold mb-2">Task Templates</h1>
        <p className="text-neutral-300 text-sm">Pre-built compliance templates ready to deploy</p>
      </div>

      <TaskHeader
        title="Task Templates"
        createButtonText="Create New Template"
        onCreateClick={handleCreateTemplate}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        sortBy={sortBy}
        onSortChange={setSortBy}
        filterBy={filterBy}
        onFilterChange={setFilterBy}
      />

      <TaskList>
        {filteredAndSortedTemplates.map((template) => (
          <TaskCard
            key={template.id}
            id={template.id}
            title={template.title}
            description={template.description}
            category={template.category}
            frequency={template.frequency}
            status={template.status}
            metadata={template.metadata}
            onUse={() => handleUseTemplate(template.id)}
            onClick={() => handleViewTemplate(template.id)}
          />
        ))}

        {/* Empty State */}
        {filteredAndSortedTemplates.length === 0 && (
          <div className="empty-state">
            <div className="empty-content">
              <div className="empty-icon">🔍</div>
              <h3>No templates found</h3>
              <p>No templates match "{searchQuery}"</p>
            </div>
            
            <style jsx>{`
              .empty-state {
                display: flex;
                justify-content: center;
                align-items: center;
                min-height: 300px;
                padding: 48px;
              }

              .empty-content {
                text-align: center;
                max-width: 400px;
              }

              .empty-icon {
                font-size: 48px;
                margin-bottom: 16px;
                opacity: 0.6;
              }

              .empty-content h3 {
                font-size: 18px;
                font-weight: 600;
                color: #FFFFFF;
                margin: 0 0 8px 0;
              }

              .empty-content p {
                font-size: 14px;
                color: #A3A3A3;
                margin: 0 0 24px 0;
              }
            `}</style>
          </div>
        )}
      </TaskList>
    </div>
  );
}

