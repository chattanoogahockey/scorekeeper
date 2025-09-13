const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 8080;

console.log('🚀 Ultra Basic Server');
console.log('Port:', PORT);

// Health endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    version: '2.1.basic',
    time: new Date().toISOString()
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Hockey Scorekeeper Basic Server',
    version: '2.1.basic',
    health: '/api/health'
  });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server running on port ${PORT}`);
});

module.exports = app;