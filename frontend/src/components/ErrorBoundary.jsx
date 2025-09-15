import React from 'react';

/**
 * Simple Error Boundary Component
 * Inspired by vanilla JS error handling reliability
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('App Error:', error, errorInfo);
    // Log additional details for debugging
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="min-h-screen flex items-center justify-center bg-gray-50" role="main" aria-labelledby="error-title">
          <div className="text-center p-8 max-w-md" role="alert" aria-live="assertive">
            <div className="text-6xl mb-4" aria-hidden="true">🏒</div>
            <h1 id="error-title" className="text-2xl font-bold text-gray-800 mb-4">
              Hockey Scorekeeper
            </h1>
            <p className="text-gray-600 mb-6">
              Something went wrong loading the app. This might be a temporary issue.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              aria-describedby="reload-description"
            >
              Reload App
            </button>
            <div id="reload-description" className="sr-only">
              Reload the application to try again
            </div>
            <div className="mt-6 text-sm text-gray-500">
              <p>
                <a
                  href="https://github.com/chattanoogahockey/scorekeeper"
                  className="text-blue-600 hover:underline focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-sm"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="View the Hockey Scorekeeper project on GitHub (opens in new tab)"
                >
                  View on GitHub
                </a>
              </p>
            </div>
          </div>
        </main>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;