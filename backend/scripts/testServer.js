#!/usr/bin/env node
// Simple server to test historical data API
import express from 'express';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const app = express();

app.get('/test-historical', async (req, res) => {
  try {
    const { getHistoricalPlayerStatsContainer } = await import('../cosmosClient.js');
    const histC = getHistoricalPlayerStatsContainer();
    
    const query = { 
      query: 'SELECT TOP 10 * FROM c WHERE c.source = @source',
      parameters: [{ name: '@source', value: 'historical' }]
    };
    
    const { resources } = await histC.items.query(query).fetchAll();
    
    res.json({
      success: true,
      count: resources.length,
      sample: resources.slice(0, 3)
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.listen(3002, () => {
  console.log('Test server running on http://localhost:3002');
  console.log('Test endpoint: http://localhost:3002/test-historical');
});
