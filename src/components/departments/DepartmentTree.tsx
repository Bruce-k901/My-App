'use client';

import { useState, useMemo } from 'react';
import { Department } from '@/types/departments';
import DepartmentCard from './DepartmentCard';
import { ChevronDown, ChevronRight, Minus } from '@/components/ui/icons';

interface DepartmentTreeProps {
  departments: Department[];
  onEdit: (department: Department) => void;
  onDelete: (department: Department) => void;
  searchQuery?: string;
}

interface DepartmentNode {
  department: Department;
  children: DepartmentNode[];
}

export default function DepartmentTree({
  departments,
  onEdit,
  onDelete,
  searchQuery = '',
}: DepartmentTreeProps) {
  const [expandedDepartments, setExpandedDepartments] = useState<Set<string>>(new Set());

  // Build tree structure
  const tree = useMemo(() => {
    const departmentMap = new Map<string, DepartmentNode>();
    const rootNodes: DepartmentNode[] = [];

    // First pass: create all nodes
    departments.forEach((dept) => {
      departmentMap.set(dept.id, {
        department: dept,
        children: [],
      });
    });

    // Second pass: build tree
    departments.forEach((dept) => {
      const node = departmentMap.get(dept.id)!;
      if (dept.parent_department_id) {
        const parentNode = departmentMap.get(dept.parent_department_id);
        if (parentNode) {
          parentNode.children.push(node);
        } else {
          // Parent not found, treat as root
          rootNodes.push(node);
        }
      } else {
        rootNodes.push(node);
      }
    });

    // Sort nodes
    const sortNodes = (nodes: DepartmentNode[]): DepartmentNode[] => {
      return nodes
        .sort((a, b) => a.department.name.localeCompare(b.department.name))
        .map((node) => ({
          ...node,
          children: sortNodes(node.children),
        }));
    };

    return sortNodes(rootNodes);
  }, [departments]);

  // Filter tree based on search query
  const filterTree = (nodes: DepartmentNode[]): DepartmentNode[] => {
    if (!searchQuery.trim()) return nodes;

    const query = searchQuery.toLowerCase();
    const filtered: DepartmentNode[] = [];

    nodes.forEach((node) => {
      const matchesSearch =
        node.department.name.toLowerCase().includes(query) ||
        node.department.description?.toLowerCase().includes(query) ||
        node.department.contact_name?.toLowerCase().includes(query) ||
        node.department.contact_email?.toLowerCase().includes(query);

      const filteredChildren = filterTree(node.children);
      const hasMatchingChildren = filteredChildren.length > 0;

      if (matchesSearch || hasMatchingChildren) {
        filtered.push({
          ...node,
          children: filteredChildren,
        });
      }
    });

    return filtered;
  };

  const filteredTree = useMemo(() => filterTree(tree), [tree, searchQuery]);

  const toggleExpand = (departmentId: string) => {
    setExpandedDepartments((prev) => {
      const next = new Set(prev);
      if (next.has(departmentId)) {
        next.delete(departmentId);
      } else {
        next.add(departmentId);
      }
      return next;
    });
  };

  const renderNode = (node: DepartmentNode, depth: number = 0, isLast: boolean = false, parentPath: boolean[] = []): JSX.Element => {
    const hasChildren = node.children.length > 0;
    const isExpanded = expandedDepartments.has(node.department.id);
    const indent = depth * 32; // 32px per level for better visual spacing

    return (
      <div key={node.department.id} className="relative mb-4">
        <div className="relative flex items-start">
          {/* Vertical connector line for children */}
          {depth > 0 && (
            <>
              {/* Vertical line from parent */}
              <div
                className="absolute left-0 top-0 bottom-0 w-0.5 bg-white/[0.15]"
                style={{
                  left: `${(depth - 1) * 32 + 16}px`,
                  top: '-1rem',
                }}
              />
              {/* Horizontal connector line */}
              <div
                className="absolute top-6 h-0.5 bg-white/[0.15]"
                style={{
                  left: `${(depth - 1) * 32 + 16}px`,
                  width: '20px',
                }}
              />
            </>
          )}

          {/* Expand/collapse button for parents */}
          {hasChildren && (
            <button
              onClick={() => toggleExpand(node.department.id)}
              className="absolute z-10 w-6 h-6 flex items-center justify-center rounded-md bg-[#0B0D13] border border-white/[0.1] hover:border-[#D37E91]/50 text-gray-400 hover:text-[#D37E91] transition-colors shadow-lg"
              style={{
                left: `${indent + 16}px`,
                top: '1.5rem',
                transform: 'translate(-50%, -50%)',
              }}
            >
              {isExpanded ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </button>
          )}

          {/* Department Card with indentation */}
          <div
            className="flex-1"
            style={{
              marginLeft: `${indent}px`,
            }}
          >
            <DepartmentCard
              department={node.department}
              departments={departments}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          </div>
        </div>

        {/* Children - nested with visual hierarchy */}
        {hasChildren && isExpanded && (
          <div className="relative mt-2">
            {/* Vertical line connecting children */}
            {node.children.length > 0 && (
              <div
                className="absolute left-0 top-0 bottom-0 w-0.5 bg-white/[0.15]"
                style={{
                  left: `${indent + 16}px`,
                  top: '-0.5rem',
                  height: `${node.children.length * 200}px`, // Approximate height
                }}
              />
            )}
            {node.children.map((child, index) => (
              <div key={child.department.id}>
                {renderNode(
                  child,
                  depth + 1,
                  index === node.children.length - 1,
                  [...parentPath, index === node.children.length - 1]
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  if (filteredTree.length === 0) {
    return (
      <div className="text-center py-12 bg-white/[0.03] border border-white/[0.06] rounded-lg">
        <p className="text-gray-400">
          {searchQuery ? 'No departments found matching your search' : 'No departments yet'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {filteredTree.map((node, index) => (
        <div key={node.department.id}>
          {renderNode(node, 0, index === filteredTree.length - 1)}
        </div>
      ))}
    </div>
  );
}

