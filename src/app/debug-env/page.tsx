'use client';

import { useState } from 'react';

export default function DebugEnvPage() {
  const [envCheck, setEnvCheck] = useState(null);

  const checkEnv = () => {
    const env = {
      url: process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      keyLength: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.length,
      keyStart: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.substring(0, 15),
      keyEnd: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.substring(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.length - 10),
      nodeEnv: process.env.NODE_ENV,
      allEnvKeys: Object.keys(process.env).filter(k => k.includes('SUPABASE'))
    };

    console.log('=== VERCEL ENV CHECK ===');
    console.log('URL:', env.url);
    console.log('Key exists:', env.hasKey);
    console.log('Key length:', env.keyLength);
    console.log('Key starts with:', env.keyStart);
    console.log('Key ends with:', env.keyEnd);
    console.log('Node Env:', env.nodeEnv);
    console.log('All Supabase env keys:', env.allEnvKeys);
    console.log('Full env check:', env);

    setEnvCheck(env);

    alert(`Environment check complete! Check browser console for details.\n\nURL exists: ${env.hasKey ? 'Yes' : 'No'}\nKey exists: ${env.hasKey ? 'Yes' : 'No'}`);
  };

  return (
    <div className="min-h-screen bg-neutral-900 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-neutral-800 rounded-xl p-6 border border-neutral-700">
          <h1 className="text-2xl font-semibold mb-2">🔍 Environment Variables Debug Page</h1>
          <p className="text-neutral-400 mb-6">
            This page helps debug environment variable issues on Vercel.
            Click the button below and check your browser console (F12) for details.
          </p>

          <button
            onClick={checkEnv}
            className="px-6 py-3 bg-gradient-to-r from-magenta-600 to-blue-600 hover:from-magenta-500 hover:to-blue-500 rounded-lg text-white font-medium transition-all shadow-lg mb-6"
          >
            Check Environment Variables
          </button>

          {envCheck && (
            <div className="mt-6 bg-neutral-900 rounded-lg p-4 border border-neutral-700">
              <h2 className="text-xl font-semibold text-white mb-4">Environment Check Results</h2>
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-neutral-400">Environment:</span>
                  <span className="text-white">{envCheck.nodeEnv}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-neutral-400">URL exists:</span>
                  <span className={envCheck.url ? 'text-green-400' : 'text-red-400'}>
                    {envCheck.url ? 'Yes ✓' : 'No ✗'}
                  </span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-neutral-400">Key exists:</span>
                  <span className={envCheck.hasKey ? 'text-green-400' : 'text-red-400'}>
                    {envCheck.hasKey ? 'Yes ✓' : 'No ✗'}
                  </span>
                </div>
                
                {envCheck.hasKey && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-neutral-400">Key length:</span>
                      <span className="text-white">{envCheck.keyLength} characters</span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-neutral-400">Key starts with:</span>
                      <span className="text-white font-mono text-xs">{envCheck.keyStart}...</span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-neutral-400">Key ends with:</span>
                      <span className="text-white font-mono text-xs">...{envCheck.keyEnd}</span>
                    </div>
                  </>
                )}
                
                <div className="mt-4 pt-4 border-t border-neutral-700">
                  <div className="text-neutral-400 mb-2">Supabase Environment Keys Found:</div>
                  <div className="flex flex-wrap gap-2">
                    {envCheck.allEnvKeys.length > 0 ? (
                      envCheck.allEnvKeys.map(key => (
                        <span key={key} className="px-2 py-1 bg-neutral-700 rounded text-xs text-green-400">
                          {key}
                        </span>
                      ))
                    ) : (
                      <span className="text-red-400">None found</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-6 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                <p className="text-yellow-400 text-sm">
                  ⚠️ If environment variables are missing, check:
                </p>
                <ul className="text-yellow-300 text-sm mt-2 ml-4 list-disc">
                  <li>Vercel Dashboard → Settings → Environment Variables</li>
                  <li>Ensure variables are named exactly: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY</li>
                  <li>All environments should be checked (Production, Preview, Development)</li>
                  <li>Redeploy after adding/updating variables</li>
                </ul>
              </div>
            </div>
          )}

          <div className="mt-6 text-xs text-neutral-500">
            Note: Remember to delete this debug page after troubleshooting!
          </div>
        </div>
      </div>
    </div>
  );
}

