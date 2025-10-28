"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { TaskHeader } from '@/components/tasks/TaskHeader';
import { TaskList } from '@/components/tasks/TaskList';
import { TaskCard } from '@/components/tasks/TaskCard';

const MY_TASKS = [];

export default function MyTasksPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState("name");
  const [filterBy, setFilterBy] = useState("all");

  // Filter and sort tasks
  const filteredAndSortedTasks = MY_TASKS
    .filter(task => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return task.title.toLowerCase().includes(query) || 
               task.description.toLowerCase().includes(query);
      }
      return true;
    })
    .filter(task => {
      // Status filter
      if (filterBy === "all") return true;
      return task.status.toLowerCase() === filterBy.toLowerCase();
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

  const handleCreateTask = () => {
    // TODO: Implement create task flow
    console.log('Create new task');
    router.push('/dashboard/tasks/create');
  };

  const handleEditTask = (taskId: string) => {
    // TODO: Implement edit task flow
    console.log('Edit task:', taskId);
    router.push(`/dashboard/tasks/edit/${taskId}`);
  };

  const handleViewTask = (taskId: string) => {
    // TODO: Implement view task flow
    console.log('View task:', taskId);
    router.push(`/dashboard/tasks/view/${taskId}`);
  };

  const handleUseTask = (taskId: string) => {
    // TODO: Implement use task flow
    console.log('Use task:', taskId);
    router.push(`/dashboard/tasks/use/${taskId}`);
  };

  return (
    <div className="min-h-screen bg-neutral-900">
      <TaskHeader
        title="My Tasks"
        createButtonText="Create New Task"
        onCreateClick={handleCreateTask}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        sortBy={sortBy}
        onSortChange={setSortBy}
        filterBy={filterBy}
        onFilterChange={setFilterBy}
      />

      <TaskList>
        {filteredAndSortedTasks.map((task) => (
          <TaskCard
            key={task.id}
            id={task.id}
            title={task.title}
            description={task.description}
            category={task.category}
            frequency={task.frequency}
            status={task.status}
            metadata={task.metadata}
            onEdit={() => handleEditTask(task.id)}
            onClick={() => handleViewTask(task.id)}
          />
        ))}

        {/* Empty State */}
        {filteredAndSortedTasks.length === 0 && (
          <div className="empty-state">
            <div className="empty-content">
              <div className="empty-icon">📝</div>
              <h3>No tasks yet</h3>
              <p>Create your first custom task to get started</p>
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
