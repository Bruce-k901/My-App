'use client';
import { useAppContext } from '@/context/AppContext';

export function ContextTest() {
  const context = useAppContext();
  
  return (
    <div style={{ border: '2px solid red', padding: '10px', margin: '10px' }}>
      <h3>Context Debug</h3>
      <pre>{JSON.stringify({
        companyId: context.companyId,
        isLoading: context.isLoading,
        userEmail: context.user?.email,
        role: context.role,
        sitesCount: context.sites?.length || 0,
        contractorsCount: context.contractors?.length || 0,
        assetsCount: context.assets?.length || 0,
        requiresSetup: context.requiresSetup
      }, null, 2)}</pre>
    </div>
  );
}