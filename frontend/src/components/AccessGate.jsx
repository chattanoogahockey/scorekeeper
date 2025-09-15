import React, { useState, useEffect } from 'react';

/**
 * Simple hash function for browser compatibility
 * Not cryptographically secure - for convenience only
 */
function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return hash.toString();
}

/**
 * Access Gate Configuration
 * Centralized configuration for the client-side access gate
 */
export const ACCESS_CONFIG = {
  // Enable/disable the gate entirely
  enabled: true,

  // Passphrase (change this to set your own passphrase)
  passphrase: 'scorekeeper2025',

  // Hash the passphrase for storage (simple hash for browser compatibility)
  getPassphraseHash: () => {
    return simpleHash(ACCESS_CONFIG.passphrase);
  },

  // localStorage key for access token
  storageKey: 'scorekeeper_access_granted',

  // How long access persists (in days)
  persistenceDays: 30,

  // Disclaimer text
  disclaimer: '⚠️ This access gate is for convenience only and provides no real security. Anyone with access to this device can bypass it. For production use, implement proper authentication.'
};

/**
 * Access Gate Hook
 * Manages access state and localStorage persistence
 */
export function useAccessGate() {
  const [hasAccess, setHasAccess] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAccess();
  }, []);

  const checkAccess = () => {
    if (!ACCESS_CONFIG.enabled) {
      setHasAccess(true);
      setIsLoading(false);
      return;
    }

    try {
      const stored = localStorage.getItem(ACCESS_CONFIG.storageKey);
      if (stored) {
        const { hash, timestamp } = JSON.parse(stored);

        // Check if access is still valid (within persistence period)
        const now = Date.now();
        const expiry = timestamp + (ACCESS_CONFIG.persistenceDays * 24 * 60 * 60 * 1000);

        if (now < expiry && hash === ACCESS_CONFIG.getPassphraseHash()) {
          setHasAccess(true);
        } else {
          // Expired or invalid, remove from storage
          localStorage.removeItem(ACCESS_CONFIG.storageKey);
        }
      }
    } catch (error) {
      console.warn('Error checking access:', error);
      localStorage.removeItem(ACCESS_CONFIG.storageKey);
    }

    setIsLoading(false);
  };

  const grantAccess = (enteredPassphrase) => {
    // Simple hash comparison (not secure, as intended)
    if (enteredPassphrase === ACCESS_CONFIG.passphrase) {
      const accessData = {
        hash: ACCESS_CONFIG.getPassphraseHash(),
        timestamp: Date.now()
      };

      localStorage.setItem(ACCESS_CONFIG.storageKey, JSON.stringify(accessData));
      setHasAccess(true);
      return true;
    }
    return false;
  };

  const revokeAccess = () => {
    localStorage.removeItem(ACCESS_CONFIG.storageKey);
    setHasAccess(false);
  };

  const resetAccess = () => {
    revokeAccess();
    // Force page reload to show gate again
    window.location.reload();
  };

  return {
    hasAccess,
    isLoading,
    grantAccess,
    revokeAccess,
    resetAccess,
    isEnabled: ACCESS_CONFIG.enabled
  };
}

/**
 * Access Gate Component
 * Simple passphrase-based gate for client-side access control
 */
export default function AccessGate({ children }) {
  const { hasAccess, isLoading, grantAccess, resetAccess, isEnabled } = useAccessGate();
  const [passphrase, setPassphrase] = useState('');
  const [error, setError] = useState('');
  const [showDisclaimer, setShowDisclaimer] = useState(false);

  // If gate is disabled, render children immediately
  if (!isEnabled) {
    return children;
  }

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // If access granted, render children
  if (hasAccess) {
    return children;
  }

  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (grantAccess(passphrase)) {
      // Success - component will re-render with access granted
    } else {
      setError('Incorrect passphrase. Please try again.');
      setPassphrase('');
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4" role="main" aria-labelledby="access-gate-title">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8" role="dialog" aria-modal="true" aria-labelledby="access-gate-title" aria-describedby="access-gate-description">
        {/* Header */}
        <header className="text-center mb-8">
          <div className="mx-auto w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mb-4" aria-hidden="true">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 id="access-gate-title" className="text-2xl font-bold text-gray-900 mb-2">Hockey Scorekeeper</h1>
          <p id="access-gate-description" className="text-gray-600">Enter passphrase to continue</p>
        </header>

        {/* Disclaimer */}
        <section className="mb-6" aria-labelledby="security-notice-heading">
          <button
            onClick={() => setShowDisclaimer(!showDisclaimer)}
            className="text-sm text-blue-600 hover:text-blue-800 underline focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-sm"
            aria-expanded={showDisclaimer}
            aria-controls="security-disclaimer"
            type="button"
          >
            {showDisclaimer ? 'Hide' : 'Show'} Security Notice
          </button>
          {showDisclaimer && (
            <div id="security-disclaimer" className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-md" role="alert" aria-live="polite">
              <p className="text-sm text-yellow-800">{ACCESS_CONFIG.disclaimer}</p>
            </div>
          )}
        </section>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div>
            <label htmlFor="passphrase" className="block text-sm font-medium text-gray-700 mb-1">
              Passphrase
            </label>
            <input
              type="password"
              id="passphrase"
              value={passphrase}
              onChange={(e) => setPassphrase(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter passphrase"
              required
              autoFocus
              aria-required="true"
              aria-describedby={error ? "passphrase-error" : undefined}
              aria-invalid={error ? "true" : "false"}
            />
          </div>

          {error && (
            <div id="passphrase-error" className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-3" role="alert" aria-live="assertive">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
            disabled={!passphrase.trim()}
            aria-describedby="submit-button-description"
          >
            Access Scorekeeper
          </button>
          <div id="submit-button-description" className="sr-only">
            Submit the passphrase to access the hockey scorekeeper application
          </div>
        </form>

        {/* Footer */}
        <footer className="mt-8 text-center">
          <p className="text-xs text-gray-500" aria-live="polite">
            Access granted will be remembered for {ACCESS_CONFIG.persistenceDays} days
          </p>
          <button
            onClick={resetAccess}
            className="mt-2 text-xs text-gray-400 hover:text-gray-600 underline focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 rounded-sm"
            type="button"
            aria-label="Reset access for testing purposes"
          >
            Reset Access (for testing)
          </button>
        </footer>
      </div>
    </main>
  );
}