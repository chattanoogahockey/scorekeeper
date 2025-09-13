import express from 'express';
import path from 'path';
import cors from 'cors';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 8080;

console.log('🚀 Hockey Scorekeeper Backend Server');
console.log('Port:', PORT);
console.log('Environment:', process.env.NODE_ENV || 'development');

// Enable CORS
app.use(cors());

// Parse JSON bodies
app.use(express.json());

// Health endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    version: '2.1.0',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Hockey Scorekeeper API',
    version: '2.1.0',
    health: '/api/health',
    timestamp: new Date().toISOString()
  });
});

// API routes placeholder
app.get('/api/games', (req, res) => {
  res.json({
    message: 'Games endpoint - placeholder',
    data: []
  });
});

app.get('/api/rosters', (req, res) => {
  res.json({
    message: 'Rosters endpoint - placeholder',
    data: []
  });
});

// Serve static files from frontend/dist
const frontendDistPath = path.join(__dirname, '..', '..', 'frontend', 'dist');
console.log('Frontend dist path:', frontendDistPath);

// Check if frontend dist exists
if (fs.existsSync(frontendDistPath)) {
  console.log('✅ Frontend dist directory found');
  app.use(express.static(frontendDistPath));

  // Serve React app for all non-API routes
  app.get('*', (req, res) => {
    // Skip API routes
    if (req.path.startsWith('/api/')) {
      return res.status(404).json({ error: 'API endpoint not found' });
    }
    res.sendFile(path.join(frontendDistPath, 'index.html'));
  });
} else {
  console.log('❌ Frontend dist directory not found:', frontendDistPath);
}

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`✅ Health check: http://localhost:${PORT}/api/health`);
});

export default app;