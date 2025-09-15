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
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center p-8 max-w-md">
            <div className="text-6xl mb-4">🏒</div>
            <h1 className="text-2xl font-bold text-gray-800 mb-4">
              Hockey Scorekeeper
            </h1>
            <p className="text-gray-600 mb-6">
              Something went wrong loading the app. This might be a temporary issue.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Reload App
            </button>
            <div className="mt-6 text-sm text-gray-500">
              <p>Static demo version - no server required</p>
              <p className="mt-1">
                <a 
                  href="https://github.com/chattanoogahockey/scorekeeper" 
                  className="text-blue-600 hover:underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  View on GitHub
                </a>
              </p>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;