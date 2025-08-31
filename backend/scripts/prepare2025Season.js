#!/usr/bin/env node
/**
 * Hockey Scorekeeper 2025 Fall Season Data Cleanup Script
 * This script removes test data and prepares for the new season
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const DRY_RUN = process.argv.includes('--dry-run');

console.log('🏒 Hockey Scorekeeper 2025 Fall Season Data Cleanup');
console.log('===================================================');

if (DRY_RUN) {
  console.log('🔍 DRY RUN MODE - No changes will be made\n');
} else {
  console.log('⚠️  LIVE MODE - Data will be permanently deleted\n');
}

async function getContainers() {
  const cosmosClient = await import('../cosmosClient.js');
  return {
    games: cosmosClient.getGamesContainer(),
    goals: cosmosClient.getGoalsContainer(),
    penalties: cosmosClient.getPenaltiesContainer(), 
    rosters: cosmosClient.getRostersContainer(),
    attendance: cosmosClient.getAttendanceContainer(),
    otShootout: cosmosClient.getOTShootoutContainer(),
    shotsOnGoal: cosmosClient.getShotsOnGoalContainer(),
    playerStats: cosmosClient.getPlayerStatsContainer()
  };
}

async function clearContainer(containerName, container) {
  console.log(`🧹 Cleaning container: ${containerName}`);
  
  try {
    const { resources } = await container.items.query('SELECT c.id, c._partitionKey FROM c').fetchAll();
    
    console.log(`   Found ${resources.length} documents to delete`);
    
    if (DRY_RUN) {
      console.log(`   [DRY RUN] Would delete ${resources.length} documents`);
      return;
    }
    
    let deleted = 0;
    for (const doc of resources) {
      try {
        await container.item(doc.id, doc._partitionKey).delete();
        deleted++;
        
        if (deleted % 50 === 0) {
          console.log(`   Progress: ${deleted}/${resources.length} deleted`);
        }
      } catch (error) {
        if (error.code === 404) {
          // Document already deleted, continue
          deleted++;
        } else {
          console.error(`   Error deleting document ${doc.id}:`, error.message);
        }
      }
    }
    
    console.log(`   ✅ Successfully deleted ${deleted} documents from ${containerName}`);
    
  } catch (error) {
    console.error(`   ❌ Error cleaning ${containerName}:`, error.message);
  }
}

async function analyzeCurrentData() {
  console.log('📊 Analyzing current data...\n');
  
  const containers = await getContainers();
  
  for (const [name, container] of Object.entries(containers)) {
    try {
      const { resources } = await container.items.query('SELECT VALUE COUNT(1) FROM c').fetchAll();
      console.log(`  ${name}: ${resources[0]} documents`);
    } catch (error) {
      console.log(`  ${name}: Error reading (${error.message})`);
    }
  }
  console.log();
}

async function cleanTestData() {
  console.log('🧹 Starting test data cleanup...\n');
  
  const containers = await getContainers();
  
  // Containers to clean for new season
  const containersToClean = [
    'games',           // Remove test games
    'goals',           // Remove test goals  
    'penalties',       // Remove test penalties
    'rosters',         // Remove old rosters (you'll upload new ones)
    'attendance',      // Remove test attendance
    'otShootout',      // Remove test overtime/shootout data
    'shotsOnGoal',     // Remove test shots data
    'playerStats'      // Remove old live stats (will be regenerated from new games)
  ];
  
  console.log('Containers to clean:');
  containersToClean.forEach(name => console.log(`  - ${name}`));
  console.log();
  
  console.log('Containers to PRESERVE (important data):');
  console.log('  - settings (global configuration)');
  console.log('  - historical-player-stats (historical data)');
  console.log('  - players (you may want to clean this too)');
  console.log('  - rink-reports (historical reports)');
  console.log();
  
  for (const containerName of containersToClean) {
    if (containers[containerName]) {
      await clearContainer(containerName, containers[containerName]);
    } else {
      console.log(`⚠️  Container ${containerName} not found or not accessible`);
    }
  }
}

async function checkContainerNaming() {
  console.log('🔍 Checking container naming consistency...\n');
  
  try {
    const cosmosClient = await import('../cosmosClient.js');
    const db = await cosmosClient.getDatabase();
    
    // Get all containers
    const containerList = await db.containers.readAll().fetchAll();
    const containerNames = containerList.resources.map(c => c.id);
    
    console.log('Current containers:');
    containerNames.forEach(name => console.log(`  - ${name}`));
    console.log();
    
    // Check for naming inconsistencies
    const issues = [];
    
    // Check for ot-shootout vs otshootout
    if (containerNames.includes('otshootout') && containerNames.includes('ot-shootout')) {
      issues.push('Both "otshootout" and "ot-shootout" exist');
    } else if (containerNames.includes('otshootout')) {
      issues.push('Container "otshootout" should be renamed to "ot-shootout"');
    }
    
    // Check for rink_reports vs rink-reports
    if (containerNames.includes('rink_reports') && containerNames.includes('rink-reports')) {
      issues.push('Both "rink_reports" and "rink-reports" exist');
    } else if (containerNames.includes('rink_reports')) {
      issues.push('Container "rink_reports" should be renamed to "rink-reports"');
    }
    
    // Check for shotsongoal vs shots-on-goal
    if (containerNames.includes('shotsongoal') && containerNames.includes('shots-on-goal')) {
      issues.push('Both "shotsongoal" and "shots-on-goal" exist');
    } else if (containerNames.includes('shotsongoal')) {
      issues.push('Container "shotsongoal" should be renamed to "shots-on-goal"');
    }
    
    if (issues.length > 0) {
      console.log('🚨 Container naming issues found:');
      issues.forEach(issue => console.log(`  ❌ ${issue}`));
      console.log('\nUse Azure Portal or Azure CLI to rename containers manually.');
      console.log('Recommended commands:');
      console.log('  az cosmosdb sql container create --name ot-shootout ...');
      console.log('  az cosmosdb sql container create --name rink-reports ...');  
      console.log('  az cosmosdb sql container create --name shots-on-goal ...');
    } else {
      console.log('✅ All container names follow consistent hyphenated naming convention');
    }
    
  } catch (error) {
    console.error('❌ Error checking containers:', error.message);
  }
  console.log();
}

async function main() {
  try {
    // Check environment
    if (!process.env.COSMOS_DB_URI || !process.env.COSMOS_DB_KEY || !process.env.COSMOS_DB_NAME) {
      console.error('❌ Missing Cosmos DB environment variables');
      console.error('Required: COSMOS_DB_URI, COSMOS_DB_KEY, COSMOS_DB_NAME');
      process.exit(1);
    }
    
    console.log('✅ Cosmos DB configuration found\n');
    
    // Analyze current data
    await analyzeCurrentData();
    
    // Check container naming
    await checkContainerNaming();
    
    if (!DRY_RUN) {
      // Confirm before proceeding
      console.log('⚠️  This will permanently delete test data for 2025 season preparation.');
      console.log('Historical player stats and settings will be preserved.');
      console.log('Type "YES" to continue or Ctrl+C to cancel:');
      
      // Simple confirmation (in real script you'd use readline)
      const confirmation = process.argv.includes('--confirm');
      if (!confirmation) {
        console.log('❌ Add --confirm flag to proceed with deletion');
        process.exit(1);
      }
    }
    
    // Clean test data
    await cleanTestData();
    
    console.log('\n🎯 2025 Fall Season Preparation Summary:');
    console.log('✅ Test data cleaned from game-related containers');
    console.log('✅ Historical player stats preserved');
    console.log('✅ System ready for new season data');
    console.log('\n📋 Next Steps:');
    console.log('1. Upload new 2025 Fall rosters for Gold, Silver, Bronze divisions');
    console.log('2. Upload scheduled games for the new season');
    console.log('3. Verify container naming consistency (if issues found above)');
    console.log('\n🏒 Ready for 2025 Adult Fall season!');
    
  } catch (error) {
    console.error('❌ Script failed:', error.message);
    process.exit(1);
  }
}

// Show usage if no args
if (process.argv.length === 2) {
  console.log('Usage:');
  console.log('  node prepare2025Season.js --dry-run    # Preview what would be deleted');
  console.log('  node prepare2025Season.js --confirm    # Actually delete the data');
  console.log('\nThis script will:');
  console.log('  - Clean test data from games, goals, penalties, rosters, etc.');
  console.log('  - Preserve historical-player-stats and settings');
  console.log('  - Check for container naming inconsistencies');
  process.exit(0);
}

main().catch(console.error);
