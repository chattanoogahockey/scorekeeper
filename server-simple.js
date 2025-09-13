import express from 'express';
import path from 'path';
import { existsSync } from 'fs';

const app = express();
const PORT = process.env.PORT || 8080;

console.log('🚀 Simple Hockey Scorekeeper Server');
console.log('Port:', PORT);
console.log('Directory:', process.cwd());

// Basic middleware
app.use(express.json());
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// Health endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    version: '2.1.simple',
    timestamp: new Date().toISOString(),
    message: 'Simple server is running'
  });
});

// Root endpoint
app.get('/', (req, res) => {
  const indexPath = path.join(process.cwd(), 'frontend/dist/index.html');
  if (existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.json({
      message: 'Hockey Scorekeeper',
      version: '2.1.simple',
      status: 'Frontend build not found',
      health: '/api/health'
    });
  }
});

// Static files
const distPath = path.join(process.cwd(), 'frontend/dist');
if (existsSync(distPath)) {
  app.use(express.static(distPath));
}

// Catch-all for SPA
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) {
    res.status(404).json({ error: 'API endpoint not found' });
  } else {
    const indexPath = path.join(process.cwd(), 'frontend/dist/index.html');
    if (existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      res.status(404).json({ error: 'Page not found' });
    }
  }
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server running on 0.0.0.0:${PORT}`);
});

export default app;