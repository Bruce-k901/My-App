"use client";

import { useAppContext } from "@/context/AppContext";

interface SimpleLoaderProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export default function SimpleLoader({ children, fallback }: SimpleLoaderProps) {
  const { loading, error, session } = useAppContext();

  // Show error if there's one
  if (error) {
    return (
      <div className="min-h-screen bg-neutral-950 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-400 text-xl mb-4">❌ Error</div>
          <div className="text-white/80 mb-4">{error}</div>
          <a href="/login" className="bg-pink-500 text-white px-6 py-2 rounded hover:bg-pink-600">
            Go to Login
          </a>
        </div>
      </div>
    );
  }

  // Show loading only if we don't have a session yet
  if (loading && session === undefined) {
    return (
      <div className="min-h-screen bg-neutral-950 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-400 mx-auto mb-4"></div>
          <div className="text-xl">Loading...</div>
        </div>
      </div>
    );
  }

  // Show fallback if no session
  if (!session) {
    return fallback || (
      <div className="min-h-screen bg-neutral-950 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-yellow-400 text-xl mb-4">No session found</div>
          <a href="/login" className="bg-pink-500 text-white px-6 py-2 rounded hover:bg-pink-600">
            Go to Login
          </a>
        </div>
      </div>
    );
  }

  // Show children if we have a session
  return <>{children}</>;
}
