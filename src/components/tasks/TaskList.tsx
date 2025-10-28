"use client";

import React from 'react';

interface TaskListProps {
  children: React.ReactNode;
  className?: string;
}

export function TaskList({ children, className = "" }: TaskListProps) {
  return (
    <div className={`task-list ${className}`}>
      {children}
      
      <style jsx>{`
        .task-list {
          padding: 24px;
          max-width: 1200px;
        }
      `}</style>
    </div>
  );
}
