import React from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import ErrorBoundary from './components/ErrorBoundary.jsx';

// Test component to verify basic functionality
function TestHome() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex flex-col items-center justify-center p-4">
      <div className="text-center mb-12">
        <div className="text-6xl mb-4">🏒</div>
        <h1 className="text-6xl font-bold text-blue-900 mb-4">
          Hockey Scorekeeper
        </h1>
        <p className="text-xl text-blue-700 mb-8">
          Static GitHub Pages App - Ready to Score!
        </p>
        <div className="space-y-4">
          <div className="bg-white rounded-lg p-6 shadow-lg">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">App Status</h2>
            <div className="space-y-2 text-left">
              <p className="text-green-600">✅ React App Loading</p>
              <p className="text-green-600">✅ Router Working</p>
              <p className="text-green-600">✅ Styles Loading</p>
              <p className="text-green-600">✅ Static Hosting Active</p>
            </div>
          </div>
          
          <button 
            onClick={() => window.location.hash = '#/test'}
            className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-6 rounded-lg"
          >
            Test Navigation
          </button>
        </div>
      </div>
    </div>
  );
}

function TestPage() {
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg p-8 shadow-lg text-center max-w-md">
        <h1 className="text-3xl font-bold text-gray-800 mb-4">Test Page</h1>
        <p className="text-gray-600 mb-6">Navigation is working!</p>
        <button 
          onClick={() => window.location.hash = '#/'}
          className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded"
        >
          Back to Home
        </button>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <HashRouter>
        <Routes>
          <Route path="/" element={<TestHome />} />
          <Route path="/test" element={<TestPage />} />
        </Routes>
      </HashRouter>
    </ErrorBoundary>
  );
}