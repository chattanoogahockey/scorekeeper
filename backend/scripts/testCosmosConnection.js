#!/usr/bin/env node
// Test Cosmos DB connection and historical data access
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env') });

console.log('Environment check:');
console.log('COSMOS_DB_URI:', process.env.COSMOS_DB_URI ? 'SET' : 'NOT SET');
console.log('COSMOS_DB_KEY:', process.env.COSMOS_DB_KEY ? 'SET' : 'NOT SET');
console.log('COSMOS_DB_NAME:', process.env.COSMOS_DB_NAME ? 'SET' : 'NOT SET');

async function testCosmosConnection() {
  try {
    // Import cosmosClient
    const { getHistoricalPlayerStatsContainer } = await import('../cosmosClient.js');
    
    const container = getHistoricalPlayerStatsContainer();
    console.log('\n✅ Cosmos client connected successfully');
    
    // Test query for historical data
    const query = {
      query: 'SELECT TOP 5 * FROM c WHERE c.source = @source',
      parameters: [{ name: '@source', value: 'historical' }]
    };
    
    const { resources } = await container.items.query(query).fetchAll();
    console.log(`✅ Found ${resources.length} historical records`);
    
    if (resources.length > 0) {
      console.log('\nSample historical record:');
      console.log(JSON.stringify(resources[0], null, 2));
    }
    
    return true;
  } catch (error) {
    console.error('❌ Cosmos connection failed:', error.message);
    return false;
  }
}

async function testPlayerStatsEndpoint() {
  try {
    // Test the player stats logic directly
    const { getHistoricalPlayerStatsContainer } = await import('../cosmosClient.js');
    const histC = getHistoricalPlayerStatsContainer();
    
    // Query historical stats
    const histQuery = { query: 'SELECT * FROM c WHERE c.source = @source', parameters: [{ name: '@source', value: 'historical' }] };
    const { resources: historicalStats } = await histC.items.query(histQuery).fetchAll();
    
    console.log(`\n📊 Total historical stats: ${historicalStats.length}`);
    
    // Group by division for summary
    const byDivision = {};
    historicalStats.forEach(stat => {
      if (!byDivision[stat.division]) byDivision[stat.division] = 0;
      byDivision[stat.division]++;
    });
    
    console.log('Historical stats by division:');
    Object.entries(byDivision).forEach(([div, count]) => {
      console.log(`  ${div}: ${count} players`);
    });
    
    return true;
  } catch (error) {
    console.error('❌ Player stats test failed:', error.message);
    return false;
  }
}

async function main() {
  console.log('🧪 Testing Cosmos DB connection and historical data...\n');
  
  const cosmosOk = await testCosmosConnection();
  if (cosmosOk) {
    await testPlayerStatsEndpoint();
  }
  
  console.log('\n🏁 Test complete');
}

main().catch(console.error);
