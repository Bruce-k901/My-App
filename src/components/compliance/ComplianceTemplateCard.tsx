"use client";

import React, { useState } from 'react';

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

interface ComplianceTemplateCardProps {
  template: ComplianceTemplate;
  onEdit: () => void;
}

export function ComplianceTemplateCard({ 
  template, 
  onEdit
}: ComplianceTemplateCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleCardClick = () => {
    setIsExpanded(!isExpanded);
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit(); // Opens edit modal/page
  };

  return (
    <div 
      className={`compliance-card ${isExpanded ? 'expanded' : 'collapsed'}`}
      onClick={handleCardClick}
      role="button"
      tabIndex={0}
    >
      {/* Header - Always Visible */}
      <div className="card-header">
        <div className="card-header-left">
          <h3 className="card-title">{template.name}</h3>
          {isExpanded && (
            <p className="card-description">{template.description}</p>
          )}
          {!isExpanded && (
            <p className="card-description-collapsed">{template.description}</p>
          )}
        </div>
        <button
          className="btn-edit-icon"
          onClick={handleEditClick}
          title="Edit template"
        >
          ✎ Edit
        </button>
      </div>

      {/* Info Section - Only in Expanded View */}
      {isExpanded && (
        <>
          <div className="card-divider" />
          <div className="card-info">
            <div className="info-row">
              <span className="info-label">Regulation:</span>
              <span className="info-value">{template.regulation_type}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Frequency:</span>
              <span className="info-value">{template.frequency}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Requirement:</span>
              <span className="info-value">
                {template.min_instances_per_day}x {template.frequency.toLowerCase()}
              </span>
            </div>
            <div className="info-row">
              <span className="info-label">Category:</span>
              <span className="info-value">{template.category.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
            </div>
          </div>
        </>
      )}

      {/* Collapse Indicator */}
      <div className="card-footer">
        <span className="collapse-indicator">
          {isExpanded ? '↑ Hide Details' : '↓ Show Details'}
        </span>
      </div>

      <style jsx>{`
        .compliance-card {
          background: #141419;
          border: 1px solid #2A2A2F;
          border-radius: 6px;
          cursor: pointer;
          transition: all 200ms ease;
          margin-bottom: 8px;
        }

        .compliance-card:hover {
          border-color: #FF006E;
          box-shadow: 0 0 8px rgba(255, 0, 110, 0.1);
        }

        .compliance-card.collapsed {
          padding: 12px 16px;
        }

        .compliance-card.expanded {
          padding: 12px 16px;
          border-color: #FF006E;
        }

        /* Header */
        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 12px;
        }

        .card-header-left {
          flex: 1;
          min-width: 0;
        }

        .card-title {
          font-size: 14px;
          font-weight: 600;
          color: #FFFFFF;
          margin: 0;
          line-height: 1.2;
        }

        .card-description {
          font-size: 12px;
          font-weight: 400;
          color: #A3A3A3;
          margin: 4px 0 0 0;
          line-height: 1.4;
        }

        .card-description-collapsed {
          font-size: 12px;
          font-weight: 400;
          color: #A3A3A3;
          margin: 4px 0 0 0;
          line-height: 1.2;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        /* Edit Button */
        .btn-edit-icon {
          flex-shrink: 0;
          padding: 4px 8px;
          background: transparent;
          border: none;
          color: #FF006E;
          cursor: pointer;
          font-size: 12px;
          font-weight: 500;
          border-radius: 4px;
          transition: all 150ms ease;
        }

        .btn-edit-icon:hover {
          background: rgba(255, 0, 110, 0.1);
        }

        /* Divider */
        .card-divider {
          border: none;
          border-top: 1px solid #2A2A2F;
          margin: 12px 0;
        }

        /* Info Section */
        .card-info {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .info-row {
          display: flex;
          gap: 12px;
          font-size: 11px;
        }

        .info-label {
          color: #717171;
          font-weight: 500;
          min-width: 80px;
          flex-shrink: 0;
        }

        .info-value {
          color: #A3A3A3;
          font-weight: 400;
          flex: 1;
        }

        /* Footer */
        .card-footer {
          margin-top: 8px;
          text-align: center;
        }

        .collapse-indicator {
          font-size: 11px;
          color: #717171;
          font-weight: 500;
        }

        /* Animation */
        @keyframes expandCard {
          from {
            opacity: 0;
            max-height: 60px;
          }
          to {
            opacity: 1;
            max-height: 400px;
          }
        }

        .compliance-card.expanded {
          animation: expandCard 200ms ease;
        }
      `}</style>
    </div>
  );
}