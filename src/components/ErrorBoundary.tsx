  "use client";

  import React, { Component, ReactNode } from "react";
  import { AlertTriangle } from "lucide-react";
  import Button from "@/components/ui/Button";

  interface Props {
    children: ReactNode;
    fallback?: ReactNode;
  }

  interface State {
    hasError: boolean;
    error: Error | null;
  }

  /**
   * Global Error Boundary
   * 
   * Catches JavaScript errors anywhere in the component tree,
   * logs those errors, and displays a fallback UI instead of crashing.
   * 
   * This prevents the "white screen of death" and provides a better UX.
   */
  class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
      super(props);
      this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): State {
      // Update state so the next render will show the fallback UI
      return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
      // Log error to console for debugging
      console.error("ErrorBoundary caught an error:", error, errorInfo);
      
      // TODO: Log to error tracking service (e.g., Sentry) in production
      // if (process.env.NODE_ENV === "production") {
      //   logErrorToService(error, errorInfo);
      // }
    }

    handleReset = () => {
      this.setState({ hasError: false, error: null });
      // Reload page to reset state completely
      window.location.href = "/dashboard";
    };

    render() {
      if (this.state.hasError) {
        // Render custom fallback UI
        if (this.props.fallback) {
          return this.props.fallback;
        }

        return (
          <div className="min-h-screen flex items-center justify-center bg-[#0B0D13] px-4">
            <div className="max-w-md w-full bg-white/[0.06] border border-white/[0.1] rounded-xl p-6 space-y-4">
              <div className="flex items-center gap-3 text-red-400">
                <AlertTriangle className="w-6 h-6" />
                <h2 className="text-xl font-semibold">Something went wrong</h2>
              </div>
              
              <p className="text-slate-300 text-sm">
                We encountered an unexpected error. Don't worry, your data is safe.
              </p>

              {process.env.NODE_ENV === "development" && this.state.error && (
                <div className="bg-black/40 rounded-md p-3 text-xs text-slate-400 font-mono overflow-auto max-h-32">
                  <div className="font-semibold text-red-400 mb-1">Error:</div>
                  <div>{this.state.error.message}</div>
                  {this.state.error.stack && (
                    <>
                      <div className="font-semibold text-red-400 mt-2 mb-1">Stack:</div>
                      <div className="text-xs">{this.state.error.stack}</div>
                    </>
                  )}
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <Button
                  onClick={this.handleReset}
                  className="flex-1 bg-pink-500 hover:bg-pink-600 text-white"
                >
                  Go to Dashboard
                </Button>
                <Button
                  onClick={() => window.location.reload()}
                  variant="outline"
                  className="flex-1 border-white/[0.2] text-white hover:bg-white/[0.1]"
                >
                  Reload Page
                </Button>
              </div>
            </div>
          </div>
        );
      }

      return this.props.children;
    }
  }

  // Default export for layout.tsx and other Server Components
  export default ErrorBoundary;

  // Named export for Client Components that need it
  export { ErrorBoundary };

  /**
   * Hook-based error boundary wrapper
   * Use this for client components that need error boundaries
   */
  export function withErrorBoundary<P extends object>(
    Component: React.ComponentType<P>,
    fallback?: ReactNode
  ) {
    return function WrappedComponent(props: P) {
      return (
        <ErrorBoundary fallback={fallback}>
          <Component {...props} />
        </ErrorBoundary>
      );
    };
  }
