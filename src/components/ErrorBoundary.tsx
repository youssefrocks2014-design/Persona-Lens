import React from 'react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    let displayMessage = error.message || 'An unexpected error occurred.';
    try {
      const parsed = JSON.parse(displayMessage) as {
        error?: string;
        operationType?: string;
        path?: string;
      };
      if (parsed && typeof parsed.error === 'string') {
        displayMessage = `Database access error (${parsed.operationType ?? 'operation'} on ${parsed.path ?? 'resource'}): ${parsed.error}`;
      }
    } catch {
      // Plain error message
    }
    return { hasError: true, message: displayMessage };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#FBF9F5] text-[#1C1917] flex items-center justify-center p-6">
          <div className="max-w-lg w-full bg-white border border-[#E5E0D8] rounded-xl p-8">
            <p className="text-xs font-mono uppercase tracking-widest text-[#9A3412] mb-2">
              Workspace Notice
            </p>
            <h1 className="text-2xl font-serif font-semibold mb-3">
              Unable to complete this request
            </h1>
            <p className="text-sm text-[#57534E] leading-relaxed mb-6">
              {this.state.message}
            </p>
            <button
              type="button"
              onClick={() => this.setState({ hasError: false, message: '' })}
              className="px-4 py-2 text-sm font-medium bg-[#1E3A8A] text-white rounded-lg hover:bg-[#1E3A8A]/90 transition-colors"
            >
              Return to Workspace
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
