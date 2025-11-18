"use client";

import ErrorBoundary from "./ErrorBoundary";
import { ReactNode } from "react";

/**
 * Wrapper component to ensure ErrorBoundary is properly resolved
 * This fixes the "promise resolves to undefined" issue in Server Components
 */
export default function ErrorBoundaryWrapper({ children }: { children: ReactNode }) {
  return <ErrorBoundary>{children}</ErrorBoundary>;
}

