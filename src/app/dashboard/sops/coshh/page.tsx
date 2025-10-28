"use client";

import React from 'react';
import { FlaskConical, Plus, Search } from 'lucide-react';

export default function COSHHPage() {
  return (
    <div className="space-y-6">
      {/* Placeholder Content */}
      <div className="bg-neutral-800/50 rounded-xl p-12 text-center border border-neutral-700">
        <FlaskConical size={48} className="text-teal-500 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-white mb-2">Coming Soon</h2>
        <p className="text-neutral-400 mb-6">
          COSHH data sheet management will be available soon. This will allow you to upload
          and manage safety data sheets for chemicals used in cleaning SOPs.
        </p>
        <button className="px-6 py-3 bg-magenta-600 hover:bg-magenta-500 rounded-lg text-white font-medium flex items-center gap-2 mx-auto transition-colors">
          <Plus size={20} />
          Upload COSHH Sheet
        </button>
      </div>
    </div>
  );
}

