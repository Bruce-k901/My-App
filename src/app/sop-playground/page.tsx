'use client';

import React from 'react';
import SOPPlayground from '@/components/SOPPlayground';

export default function SOPPlaygroundPage() {
  const handleSave = (json: any) => {
    console.log('SOP JSON saved:', json);
    // Later this will connect to Supabase
  };

  return (
    <div className="min-h-screen bg-neutral-900">
      <SOPPlayground onSave={handleSave} />
    </div>
  );
}
