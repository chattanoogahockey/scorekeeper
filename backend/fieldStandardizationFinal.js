import { CosmosClient } from '@azure/cosmos';
import dotenv from 'dotenv';
dotenv.config({ path: '.env' });

const client = new CosmosClient({
  endpoint: process.env.COSMOS_DB_URI,
  key: process.env.COSMOS_DB_KEY
});

const database = client.database('scorekeeper');

async function standardizeAllFields() {
  console.log('🏒 FINAL FIELD STANDARDIZATION');
  console.log('===============================\n');
  
  let totalUpdates = 0;
  
  // 1. Fix rink-reports: standardize 'name' to 'playerName' in standoutPlayers
  console.log('1️⃣ Standardizing rink-reports standoutPlayers...');
  const rinkReports = database.container('rink-reports');
  const { resources: rinkData } = await rinkReports.items.query('SELECT * FROM c').fetchAll();
  
  for (const report of rinkData) {
    let updated = false;
    
    if (report.standoutPlayers && Array.isArray(report.standoutPlayers)) {
      report.standoutPlayers.forEach(player => {
        if (player.name && !player.playerName) {
          player.playerName = player.name;
          delete player.name;
          updated = true;
        }
        if (player.team && !player.teamName) {
          player.teamName = player.team;
          delete player.team;
          updated = true;
        }
      });
    }
    
    if (updated) {
      await rinkReports.item(report.id, report.division).replace(report);
      totalUpdates++;
      console.log(`   ✅ Updated report ${report.id}`);
    }
  }
  
  // 2. Fix historical-player-stats: standardize 'team' to 'teamName'
  console.log('\\n2️⃣ Standardizing historical-player-stats...');
  const historicalStats = database.container('historical-player-stats');
  const { resources: histData } = await historicalStats.items.query('SELECT * FROM c').fetchAll();
  
  for (const stat of histData) {
    let updated = false;
    
    if (stat.team && !stat.teamName) {
      stat.teamName = stat.team;
      delete stat.team;
      updated = true;
    }
    
    if (updated) {
      await historicalStats.item(stat.id, stat.season).replace(stat);
      totalUpdates++;
      console.log(`   ✅ Updated historical stat ${stat.name} (${stat.teamName})`);
    }
  }
  
  // 3. Fix player-stats: standardize 'team' to 'teamName'
  console.log('\\n3️⃣ Standardizing player-stats...');
  const playerStats = database.container('player-stats');
  const { resources: playerData } = await playerStats.items.query('SELECT * FROM c').fetchAll();
  
  for (const stat of playerData) {
    let updated = false;
    
    if (stat.team && !stat.teamName) {
      stat.teamName = stat.team;
      delete stat.team;
      updated = true;
    }
    
    if (updated) {
      await playerStats.item(stat.id, stat.season).replace(stat);
      totalUpdates++;
      console.log(`   ✅ Updated player stat ${stat.name} (${stat.teamName})`);
    }
  }
  
  console.log(`\\n📊 STANDARDIZATION COMPLETE:`);
  console.log(`   Total records updated: ${totalUpdates}`);
  console.log(`\\n✅ FINAL FIELD STANDARDS:`);
  console.log(`   Player identification: playerName (consistent across all containers)`);
  console.log(`   Team identification: teamName (consistent across all containers)`);
  console.log(`   Game teams: homeTeam/awayTeam (preserved for scoreboard functionality)`);
  console.log(`   Timestamps: recordedAt (consistent across event containers)`);
  
  process.exit(0);
}

standardizeAllFields().catch(error => {
  console.error('❌ Error:', error);
  process.exit(1);
});
