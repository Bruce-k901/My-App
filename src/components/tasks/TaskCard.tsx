"use client";

import React, { useState } from 'react';
import { COLORS } from '@/constants/colors';

interface TaskCardProps {
  id: string;
  title: string;
  description: string;
  category: 'custom' | 'food-safety' | 'fire-security' | 'health-safety' | 'cleaning' | 'compliance';
  frequency: 'Daily' | 'Weekly' | 'Monthly' | 'Triggered';
  status: 'Active' | 'Draft' | 'Archived';
  metadata?: string;
  onEdit?: () => void;
  onView?: () => void;
  onUse?: () => void;
  onClick?: () => void;
}

export function TaskCard({ 
  id,
  title, 
  description, 
  category, 
  frequency, 
  status,
  metadata,
  onEdit,
  onView,
  onUse,
  onClick
}: TaskCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const borderColor = COLORS.category[category] || COLORS.category.custom;

  const handleHeaderClick = () => {
    setIsExpanded(prev => !prev);
    onClick?.();
  };

  const handleActionClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit?.();
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    // TODO: Implement delete functionality
    console.log('Delete task:', id);
  };

  return (
    <div 
      className={`task-card ${isExpanded ? 'expanded' : ''}`}
      style={{ borderLeftColor: borderColor }}
    >
      {/* Card Header - Clickable to Expand */}
      <div 
        className="card-header-clickable"
        onClick={handleHeaderClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleHeaderClick();
          }
        }}
      >
        <div className="header-left">
          <h3 className="task-title">{title}</h3>
        </div>
        
        <div className="header-right">
          <span className="frequency-badge">{frequency}</span>
          <span className={`status-badge ${status.toLowerCase()}`}>
            {status}
          </span>
        </div>
      </div>

      {/* Card Content */}
      <div className="card-content">
        <p className="task-description">{description}</p>
        {metadata && <p className="task-metadata">{metadata}</p>}
      </div>

      {/* Expanded Details (Only if Expanded) */}
      {isExpanded && (
        <div className="card-expanded">
          <div className="divider" />
          
          <div className="expanded-content">
            <div className="detail-row">
              <span className="detail-label">Category:</span>
              <span className="detail-value">{category.replace('-', ' ')}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Frequency:</span>
              <span className="detail-value">{frequency}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Status:</span>
              <span className="detail-value">{status}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">ID:</span>
              <span className="detail-value">{id}</span>
            </div>
          </div>

          <div className="expanded-actions">
            {onEdit && (
              <button 
                className="btn-edit"
                onClick={handleEdit}
              >
                Edit Task
              </button>
            )}
            <button 
              className="btn-delete"
              onClick={handleDelete}
            >
              Delete
            </button>
          </div>
        </div>
      )}

      <style jsx>{`
        .task-card {
          background: #141419;
          border: 1px solid #2A2A2F;
          border-left: 2px solid var(--category-color);
          border-radius: 6px;
          padding: 12px 16px;
          margin-bottom: 8px;
          cursor: pointer;
          transition: all 200ms ease;
        }

        .task-card:hover {
          background: #1A1A20;
          border-color: #3A3A3F;
        }

        .task-card.expanded {
          background: #1A1A20;
        }

        .card-header-clickable {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 8px;
          transition: color 150ms ease;
          cursor: pointer;
        }

        .card-header-clickable:hover .task-title {
          color: #FF006E;
        }

        .header-left {
          flex: 1;
        }

        .task-title {
          font-size: 15px;
          font-weight: 600;
          color: #FFFFFF;
          margin: 0;
          line-height: 1.2;
        }

        .header-right {
          display: flex;
          gap: 8px;
          flex-shrink: 0;
        }

        .frequency-badge,
        .status-badge {
          font-size: 11px;
          font-weight: 500;
          text-transform: uppercase;
          color: #717171;
          background: transparent;
        }

        .status-badge.active {
          color: #10B981;
        }

        .status-badge.draft {
          color: #F59E0B;
        }

        .status-badge.archived {
          color: #FF4040;
        }

        .card-content {
          margin-bottom: 8px;
        }

        .task-description {
          font-size: 12px;
          font-weight: 400;
          color: #A3A3A3;
          margin: 0;
          line-height: 1.3;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .task-metadata {
          font-size: 11px;
          font-weight: 400;
          color: #717171;
          margin: 0;
          margin-top: 2px;
        }

        /* Expanded State */
        .card-expanded {
          animation: slideDown 200ms ease;
        }

        @keyframes slideDown {
          from {
            opacity: 0;
            max-height: 0;
          }
          to {
            opacity: 1;
            max-height: 500px;
          }
        }

        .divider {
          border: none;
          border-top: 1px solid #2A2A2F;
          margin: 8px 0;
        }

        .expanded-content {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-bottom: 12px;
          padding: 8px 0;
        }

        .detail-row {
          display: flex;
          gap: 12px;
          font-size: 12px;
        }

        .detail-label {
          color: #717171;
          font-weight: 500;
          min-width: 80px;
        }

        .detail-value {
          color: #A3A3A3;
          flex: 1;
        }

        .expanded-actions {
          display: flex;
          gap: 8px;
        }

        .btn-edit,
        .btn-delete {
          font-size: 12px;
          font-weight: 500;
          padding: 6px 12px;
          border-radius: 4px;
          border: none;
          cursor: pointer;
          transition: all 150ms ease;
        }

        .btn-edit {
          background: #FF006E;
          color: #FFFFFF;
        }

        .btn-edit:hover {
          background: #E60060;
        }

        .btn-delete {
          background: transparent;
          border: 1px solid #FF4040;
          color: #FF4040;
        }

        .btn-delete:hover {
          background: #FF4040;
          color: #FFFFFF;
        }
      `}</style>
    </div>
  );
}
