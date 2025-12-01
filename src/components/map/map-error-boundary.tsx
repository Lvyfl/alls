'use client';

import React from 'react';

interface MapErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  retryCount: number;
}

interface MapErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  maxRetries?: number;
}

export class MapErrorBoundary extends React.Component<MapErrorBoundaryProps, MapErrorBoundaryState> {
  private retryTimeout: NodeJS.Timeout | null = null;

  constructor(props: MapErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, retryCount: 0 };
  }

  static getDerivedStateFromError(error: Error): MapErrorBoundaryState {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error, retryCount: 0 };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log the error for debugging, but don't throw it
    console.warn('Map component error caught by boundary:', error, errorInfo);

    // Handle specific map errors
    if (error.message) {
      if (error.message.includes('Map container is being reused')) {
        console.warn('Map container reuse error detected - attempting recovery');
        // For this specific error, try immediate recovery
        this.handleContainerReuseError();
      } else if (error.message.includes('Cannot access') && error.message.includes('before initialization')) {
        console.warn('Variable initialization error detected - likely a React hook dependency issue');
      } else if (error.message.includes('ReferenceError')) {
        console.warn('Reference error in map component - checking variable declarations');
      }
    }
  }

  componentWillUnmount() {
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
    }
  }

  handleContainerReuseError = () => {
    const maxRetries = this.props.maxRetries || 2; // Reduce max retries for faster recovery

    if (this.state.retryCount < maxRetries) {
      // For container reuse errors, try immediate recovery first, then with delay
      const delay = this.state.retryCount === 0 ? 100 : 1000 + (this.state.retryCount * 500);

      this.retryTimeout = setTimeout(() => {
        this.setState(prevState => ({
          hasError: false,
          error: undefined,
          retryCount: prevState.retryCount + 1
        }));
      }, delay);
    }
  }

  handleManualRetry = () => {
    this.setState({
      hasError: false,
      error: undefined,
      retryCount: 0
    });
  }

  componentDidUpdate(prevProps: MapErrorBoundaryProps) {
    // Reset error state when key changes (indicating a fresh mount)
    if (this.state.hasError && prevProps.children !== this.props.children) {
      this.setState({ hasError: false, error: undefined });
    }
  }

  render() {
    if (this.state.hasError) {
      const maxRetries = this.props.maxRetries || 3;
      const isContainerError = this.state.error?.message?.includes('Map container is being reused');
      const canRetry = this.state.retryCount < maxRetries;

      // Return fallback UI or the provided fallback
      return this.props.fallback || (
        <div className="h-[600px] bg-gray-100 rounded-lg border-4 border-blue-600 flex items-center justify-center">
          <div className="text-center p-6">
            <div className="text-blue-600 text-lg font-bold mb-2">Map Temporarily Unavailable</div>
            <p className="text-gray-600 text-sm mb-2">
              The map component encountered an error. This may be due to navigation or container conflicts.
            </p>
            {this.state.error?.message && (
              <p className="text-amber-600 text-xs mb-4 font-medium">
                {isContainerError
                  ? `Container reuse detected (Attempt ${this.state.retryCount + 1}/${maxRetries + 1})`
                  : this.state.error.message.includes('Cannot access') && this.state.error.message.includes('before initialization')
                  ? 'Component initialization error - please try again.'
                  : 'Map error detected - please try again.'
                }
              </p>
            )}

            <div className="space-x-2">
              {canRetry && isContainerError && (
                <button
                  onClick={this.handleManualRetry}
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors cursor-pointer"
                >
                  Try Again
                </button>
              )}
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors cursor-pointer"
              >
                Refresh Page
              </button>
            </div>

            {this.state.retryCount > 0 && (
              <p className="text-xs text-gray-500 mt-2">
                Automatic retry in progress...
              </p>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
