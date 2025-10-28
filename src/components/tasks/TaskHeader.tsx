"use client";

import React from 'react';
import { COLORS } from '@/constants/colors';

interface TaskHeaderProps {
  title: string;
  description?: string;
  onCreateClick?: () => void;
  createButtonText?: string;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  showFilters?: boolean;
  children?: React.ReactNode;
  sortBy?: string;
  onSortChange?: (sortBy: string) => void;
  filterBy?: string;
  onFilterChange?: (filterBy: string) => void;
}

export function TaskHeader({
  title,
  description,
  onCreateClick,
  createButtonText = "Create New Task",
  searchQuery = "",
  onSearchChange,
  showFilters = true,
  children,
  sortBy = "name",
  onSortChange,
  filterBy = "all",
  onFilterChange
}: TaskHeaderProps) {
  return (
    <div className="task-header">
      {/* Compact Header Bar */}
      <div className="header-bar">
        <div className="header-left">
          <h1 className="page-title">{title}</h1>
        </div>
        
        <div className="header-right">
          <button 
            className="btn-create-compact" 
            onClick={onCreateClick}
            title="Create new task"
          >
            +
          </button>
          
          {onSearchChange && (
            <input
              type="text"
              placeholder="Search tasks..."
              className="search-input"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
            />
          )}
          
          {showFilters && (
            <div className="filters">
              <span className="filter-label">Filter:</span>
              <select 
                className="filter-select"
                value={filterBy}
                onChange={(e) => onFilterChange?.(e.target.value)}
              >
                <option value="all">All</option>
                <option value="active">Active</option>
                <option value="draft">Draft</option>
                <option value="archived">Archived</option>
              </select>
              <select 
                className="filter-select"
                value={sortBy}
                onChange={(e) => onSortChange?.(e.target.value)}
              >
                <option value="name">Name</option>
                <option value="date">Date Created</option>
                <option value="status">Status</option>
                <option value="category">Category</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Additional Content */}
      {children}

      <style jsx>{`
        .task-header {
          border-bottom: 1px solid #2A2A2F;
        }

        .header-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 24px;
          gap: 12px;
          border-bottom: 1px solid #2A2A2F;
          flex-wrap: wrap;
        }

        .header-left {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-shrink: 0;
        }

        .page-title {
          font-size: 18px;
          font-weight: 600;
          color: #FFFFFF;
          margin: 0;
          flex-shrink: 0;
        }

        .header-right {
          display: flex;
          align-items: center;
          gap: 8px;
          flex: 1;
          min-width: 0;
        }

        .btn-create-compact {
          background: transparent;
          border: 1px solid #FF006E;
          color: #FF006E;
          width: 40px;
          height: 40px;
          border-radius: 6px;
          font-size: 18px;
          font-weight: 400;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 200ms ease;
          flex-shrink: 0;
        }

        .btn-create-compact:hover {
          background: #FF006E;
          color: #FFFFFF;
          box-shadow: 0 0 12px rgba(255, 0, 110, 0.3);
          border-color: #FF006E;
        }

        .btn-create-compact:active {
          box-shadow: 0 0 20px rgba(255, 0, 110, 0.5);
        }

        .search-input {
          background: #1A1A20;
          border: 1px solid #2A2A2F;
          color: #FFFFFF;
          padding: 8px 12px;
          border-radius: 6px;
          font-size: 12px;
          min-width: 150px;
          flex: 1;
          max-width: 300px;
          transition: all 150ms ease;
        }

        .search-input:focus {
          outline: none;
          border-color: #FF006E;
        }

        .search-input::placeholder {
          color: #717171;
        }

        .filters {
          display: flex;
          align-items: center;
          gap: 6px;
          flex-shrink: 0;
        }

        .filter-label {
          font-size: 12px;
          font-weight: 500;
          color: #A3A3A3;
          white-space: nowrap;
          display: none;
        }

        .filter-select {
          background: #1A1A20;
          border: 1px solid #2A2A2F;
          color: #FFFFFF;
          padding: 6px 10px;
          border-radius: 6px;
          font-size: 11px;
          cursor: pointer;
          transition: border 150ms ease;
        }

        .filter-select:focus {
          outline: none;
          border-color: #FF006E;
        }

        /* Desktop */
        @media (min-width: 768px) {
          .search-input {
            max-width: 300px;
          }
          
          .filter-label {
            display: block;
          }
        }

        /* Tablet */
        @media (max-width: 767px) {
          .header-bar {
            padding: 12px 16px;
            gap: 8px;
          }
          
          .page-title {
            font-size: 16px;
          }
          
          .search-input {
            max-width: 200px;
            font-size: 11px;
            padding: 6px 10px;
          }
          
          .filter-select {
            padding: 4px 8px;
            font-size: 10px;
          }
          
          .filter-label {
            display: none;
          }
        }

        /* Mobile */
        @media (max-width: 480px) {
          .header-bar {
            flex-wrap: wrap;
            gap: 6px;
          }
          
          .header-left {
            width: 100%;
            order: 1;
          }
          
          .header-right {
            width: 100%;
            order: 2;
            gap: 6px;
          }
          
          .search-input {
            min-width: 120px;
            max-width: none;
          }
          
          .filters {
            overflow-x: auto;
          }
        }
      `}</style>
    </div>
  );
}
