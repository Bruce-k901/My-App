'use client';

import { ReactNode } from 'react';
import { useHasPermission } from '@/hooks/use-permissions';
import { PermissionScope } from '@/types/permissions';

interface PermissionGateProps {
  permission: string;
  scope?: PermissionScope;
  children: ReactNode;
  fallback?: ReactNode;
  showMessage?: boolean;
}

/**
 * PermissionGate Component
 * 
 * Wraps UI elements to hide them from unauthorized users.
 * 
 * @example
 * <PermissionGate permission="payroll.view" scope="all">
 *   <PayrollButton />
 * </PermissionGate>
 */
export function PermissionGate({
  permission,
  scope,
  children,
  fallback = null,
  showMessage = false,
}: PermissionGateProps) {
  const check = useHasPermission(permission, scope);
  
  if (check.allowed) {
    return <>{children}</>;
  }
  
  if (showMessage) {
    return (
      <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
        <p className="text-red-400 text-sm">
          You don't have permission to access this content.
          {check.reason && (
            <span className="block mt-1 text-xs text-red-500/70">
              {check.reason}
            </span>
          )}
        </p>
      </div>
    );
  }
  
  return <>{fallback}</>;
}

