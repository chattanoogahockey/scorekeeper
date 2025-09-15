/**
 * Helper utilities for static mode operation
 */

/**
 * Show a modal alert explaining that a feature is not available in static mode
 */
export const showStaticModeAlert = (featureName) => {
  alert(`📖 READ-ONLY MODE\n\n"${featureName}" is not available in static mode.\n\nThis is a demo version hosted on GitHub Pages with sample data.\nTo use full editing features, you would need to set up the backend server.`);
};

/**
 * Replacement function for axios POST calls in static mode
 */
export const staticModePost = async (url, data, options = {}) => {
  console.warn(`🚫 Static Mode: Blocking POST request to ${url}`, data);
  showStaticModeAlert('Data Creation/Submission');
  throw new Error('POST requests not available in static mode');
};

/**
 * Replacement function for axios PUT calls in static mode
 */
export const staticModePut = async (url, data, options = {}) => {
  console.warn(`🚫 Static Mode: Blocking PUT request to ${url}`, data);
  showStaticModeAlert('Data Updates');
  throw new Error('PUT requests not available in static mode');
};

/**
 * Replacement function for axios DELETE calls in static mode
 */
export const staticModeDelete = async (url, options = {}) => {
  console.warn(`🚫 Static Mode: Blocking DELETE request to ${url}`);
  showStaticModeAlert('Data Deletion');
  throw new Error('DELETE requests not available in static mode');
};

/**
 * Create a banner component to show on pages with disabled features
 */
export const StaticModeBanner = () => (
  <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-4">
    <div className="flex">
      <div className="flex-shrink-0">
        <svg className="h-5 w-5 text-yellow-500" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
      </div>
      <div className="ml-3">
        <h3 className="text-sm font-medium text-yellow-800">
          Read-Only Demo Mode
        </h3>
        <div className="mt-2 text-sm text-yellow-700">
          <p>
            This page displays sample data. Editing features are disabled in this GitHub Pages demo.
            View-only functionality is fully available.
          </p>
        </div>
      </div>
    </div>
  </div>
);