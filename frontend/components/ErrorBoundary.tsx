'use client';

import { Component, ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error Boundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-neutral-900 flex items-center justify-center p-6">
          <div className="max-w-lg w-full bg-neutral-800/50 backdrop-blur-xl border border-red-700 rounded-2xl p-8 shadow-2xl">
            <h2 className="text-2xl text-red-400 font-semibold mb-4">Something went wrong</h2>
            <p className="text-neutral-300 mb-4">
              The application encountered an unexpected error. Please refresh the page to try again.
            </p>
            {this.state.error && (
              <details className="mt-4">
                <summary className="text-sm text-neutral-400 cursor-pointer hover:text-neutral-200">
                  Error details
                </summary>
                <pre className="mt-2 text-xs text-red-300 bg-neutral-900 p-3 rounded overflow-auto">
                  {this.state.error.message}
                </pre>
              </details>
            )}
            <button
              onClick={() => window.location.reload()}
              className="mt-6 w-full py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-medium transition-all"
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
