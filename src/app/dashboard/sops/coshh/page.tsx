"use client";

import React from 'react';
import { FlaskConical } from 'lucide-react';

export default function COSHHPage() {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">COSHH Data Sheets</h1>
        <p className="text-white/60">Manage safety data sheets for chemicals</p>
      </div>

      <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-8">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-pink-500/10 mb-4">
            <FlaskConical className="w-8 h-8 text-pink-400" />
          </div>
          <h2 className="text-xl font-semibold text-white mb-2">COSHH Data Sheets</h2>
          <p className="text-white/60 max-w-md mx-auto">
            This feature is under development and will be available soon.
          </p>
        </div>
      </div>
    </div>
  );
}

