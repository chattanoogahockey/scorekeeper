#!/usr/bin/env node
/**
 * Fix Cosmos DB Container Naming Inconsistencies
 * This script migrates data from inconsistently named containers to properly named ones
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const DRY_RUN = process.argv.includes('--dry-run');

console.log('🔧 Hockey Scorekeeper Container Naming Fix');
console.log('==========================================');

if (DRY_RUN) {
  console.log('🔍 DRY RUN MODE - No changes will be made\n');
} else {
  console.log('⚠️  LIVE MODE - Containers will be migrated\n');
}

async function getDatabase() {
  const cosmosClient = await import('../cosmosClient.js');
  return cosmosClient.getDatabase();
}

async function migrateContainer(db, oldName, newName, partitionKey) {
  console.log(`🔄 Migrating: ${oldName} → ${newName}`);
  
  try {
    // Check if old container exists
    let oldContainer;
    try {
      oldContainer = db.container(oldName);
      await oldContainer.read(); // Test if it exists
    } catch (error) {
      if (error.code === 404) {
        console.log(`   ✅ ${oldName} doesn't exist, skipping migration`);
        return;
      }
      throw error;
    }
    
    // Check if new container exists
    let newContainer;
    try {
      newContainer = db.container(newName);
      await newContainer.read(); // Test if it exists
      console.log(`   ✅ ${newName} already exists`);
    } catch (error) {
      if (error.code === 404) {
        if (DRY_RUN) {
          console.log(`   [DRY RUN] Would create container: ${newName}`);
        } else {
          console.log(`   📦 Creating container: ${newName}`);
          const { container } = await db.containers.create({
            id: newName,
            partitionKey: { paths: [partitionKey] }
          });
          newContainer = container;
        }
      } else {
        throw error;
      }
    }
    
    // Get data from old container
    const { resources: documents } = await oldContainer.items.query('SELECT * FROM c').fetchAll();
    console.log(`   📊 Found ${documents.length} documents to migrate`);
    
    if (documents.length === 0) {
      console.log(`   ✅ No data to migrate from ${oldName}`);
      if (!DRY_RUN) {
        console.log(`   🗑️  Deleting empty container: ${oldName}`);
        await oldContainer.delete();
      }
      return;
    }
    
    if (DRY_RUN) {
      console.log(`   [DRY RUN] Would migrate ${documents.length} documents`);
      console.log(`   [DRY RUN] Would delete old container: ${oldName}`);
      return;
    }
    
    // Migrate documents
    let migrated = 0;
    for (const doc of documents) {
      try {
        await newContainer.items.create(doc);
        migrated++;
        
        if (migrated % 10 === 0) {
          console.log(`   Progress: ${migrated}/${documents.length} migrated`);
        }
      } catch (error) {
        console.error(`   ❌ Error migrating document ${doc.id}:`, error.message);
      }
    }
    
    console.log(`   ✅ Migrated ${migrated} documents to ${newName}`);
    
    // Delete old container
    console.log(`   🗑️  Deleting old container: ${oldName}`);
    await oldContainer.delete();
    
    console.log(`   ✅ Migration complete: ${oldName} → ${newName}`);
    
  } catch (error) {
    console.error(`   ❌ Error migrating ${oldName}:`, error.message);
  }
}

async function fixContainerNaming() {
  console.log('🔧 Fixing container naming inconsistencies...\n');
  
  const db = await getDatabase();
  
  // Define migrations needed
  const migrations = [
    {
      oldName: 'otshootout',
      newName: 'ot-shootout', 
      partitionKey: '/gameId'
    },
    {
      oldName: 'rink_reports',
      newName: 'rink-reports',
      partitionKey: '/division'
    },
    {
      oldName: 'shotsongoal', 
      newName: 'shots-on-goal',
      partitionKey: '/gameId'
    }
  ];
  
  for (const migration of migrations) {
    await migrateContainer(db, migration.oldName, migration.newName, migration.partitionKey);
    console.log(); // Add spacing
  }
}

async function verifyContainers() {
  console.log('🔍 Verifying container naming...\n');
  
  const db = await getDatabase();
  const containerList = await db.containers.readAll().fetchAll();
  const containerNames = containerList.resources.map(c => c.id).sort();
  
  console.log('Current containers:');
  containerNames.forEach(name => {
    const status = name.includes('_') || (!name.includes('-') && name.length > 8) ? '❌' : '✅';
    console.log(`  ${status} ${name}`);
  });
  
  // Check for expected standard names
  const expectedContainers = [
    'settings',
    'analytics', 
    'rink-reports',
    'games',
    'players',
    'goals',
    'penalties',
    'rosters',
    'attendance',
    'ot-shootout',
    'shots-on-goal',
    'historical-player-stats'
  ];
  
  console.log('\nExpected standard containers:');
  expectedContainers.forEach(name => {
    const exists = containerNames.includes(name);
    const status = exists ? '✅' : '❌';
    console.log(`  ${status} ${name} ${exists ? '' : '(missing)'}`);
  });
  
  // Check for old naming patterns
  const oldPatterns = ['otshootout', 'rink_reports', 'shotsongoal'];
  const foundOld = oldPatterns.filter(pattern => containerNames.includes(pattern));
  
  if (foundOld.length > 0) {
    console.log('\n🚨 Old naming patterns still found:');
    foundOld.forEach(name => console.log(`  ❌ ${name} (should be migrated)`));
  } else {
    console.log('\n✅ All containers follow consistent hyphenated naming!');
  }
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
    
    // Verify current state
    await verifyContainers();
    console.log();
    
    if (!DRY_RUN) {
      console.log('⚠️  This will migrate data and delete old inconsistently named containers.');
      console.log('Type "YES" to continue or add --dry-run to preview:');
      
      const confirmation = process.argv.includes('--confirm');
      if (!confirmation) {
        console.log('❌ Add --confirm flag to proceed with migration');
        process.exit(1);
      }
    }
    
    // Fix container naming
    await fixContainerNaming();
    
    // Verify again
    console.log('🔍 Post-migration verification:\n');
    await verifyContainers();
    
    console.log('\n✅ Container naming fix complete!');
    console.log('🏒 Ready for consistent container operations!');
    
  } catch (error) {
    console.error('❌ Script failed:', error.message);
    process.exit(1);
  }
}

// Show usage if no args
if (process.argv.length === 2) {
  console.log('Usage:');
  console.log('  node fixContainerNaming.js --dry-run    # Preview migrations');
  console.log('  node fixContainerNaming.js --confirm    # Actually migrate containers');
  console.log('\nThis script will:');
  console.log('  - Migrate data from inconsistently named containers');
  console.log('  - Delete old containers after successful migration');
  console.log('  - Ensure all containers follow hyphenated naming convention');
  process.exit(0);
}

main().catch(console.error);
