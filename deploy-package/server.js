const path = require('path');
let express;
try {
  express = require('express');
} catch (e) {
  console.error('FATAL: express not found at runtime', e);
  process.exit(1);
}
let cors;
try {
  cors = require('cors');
} catch (e) {
  console.warn('cors not installed; continuing without it');
}

const app = express();
const PORT = process.env.PORT || 8080;
console.log('----------------------------------------');
console.log('Starting Hockey Scorekeeper Minimal Server');
console.log('Node version:', process.version);
console.log('Working dir:', process.cwd());
console.log('PORT:', PORT);
console.log('Env NODE_ENV:', process.env.NODE_ENV);
console.log('----------------------------------------');

if (cors) {
  app.use(cors());
}
app.use(express.json());

// Static assets if built
const distDir = path.join(__dirname, 'frontend', 'dist');
if (require('fs').existsSync(distDir)) {
  console.log('Serving static assets from', distDir);
  app.use(express.static(distDir));
}

// Health endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    version: '2.1.basic',
    time: new Date().toISOString()
  });
});

// Root endpoint (if index.html present serve it, else JSON)
app.get('/', (req, res) => {
  const indexFile = path.join(distDir, 'index.html');
  if (require('fs').existsSync(indexFile)) {
    res.sendFile(indexFile);
  } else {
    res.json({
      message: 'Hockey Scorekeeper Basic Server',
      version: '2.1.basic',
      health: '/api/health'
    });
  }
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server running on port ${PORT}`);
});

module.exports = app;