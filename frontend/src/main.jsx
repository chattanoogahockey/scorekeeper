import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter as Router } from 'react-router-dom';
import App from './App.jsx';
import './index.css';
import axios from 'axios';

// Add global request interceptor for debugging
axios.interceptors.request.use(
  (config) => {
    if (config.url?.includes('/api/games') && !config.url.includes('submitted') && !config.url.includes('reset')) {
      console.log('🌐 AXIOS REQUEST INTERCEPTED:', {
        url: config.url,
        method: config.method,
        params: config.params,
        stack: new Error().stack.split('\n').slice(1, 4).join('\n')
      });
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

ReactDOM.createRoot(document.getElementById('root')).render(
  <Router>
    <App />
  </Router>,
);