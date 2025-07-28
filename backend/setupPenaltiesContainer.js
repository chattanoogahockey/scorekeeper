#!/usr/bin/env node

/**
 * Setup script for the penalties container in Azure Cosmos DB
 * This script creates the penalties container if it doesn't exist
 */

import { getDatabase } from './cosmosClient.js';

async function setupPenaltiesContainer() {
  console.log('🏒 Setting up Penalties Container...');
  
  try {
    const database = await getDatabase();
    
    // Define container settings
    const containerDefinition = {
      id: 'penalties',
      partitionKey: { paths: ['/gameId'] }, // Partition by game ID for good distribution
      indexingPolicy: {
        indexingMode: 'consistent',
        includedPaths: [
          {
            path: '/*', // Index all paths by default
          }
        ],
        excludedPaths: [
          {
            path: '/details/*', // Don't index the details object deeply
          }
        ]
      }
    };
    
    // Create container
    const { container } = await database.containers.createIfNotExists(containerDefinition);
    console.log(`✅ Penalties container '${container.id}' is ready!`);
    
    // Insert a sample penalty for testing
    const samplePenalty = {
      id: 'sample-penalty-1',
      gameId: 'test-game-1',
      period: 1,
      penalizedTeam: 'Sample Team',
      penalizedPlayer: 'Sample Player',
      penaltyType: 'Tripping',
      penaltyLength: '2',
      time: '10:30',
      details: {
        description: 'Sample penalty for testing',
        severity: 'minor'
      },
      recordedAt: new Date().toISOString()
    };
    
    try {
      await container.items.create(samplePenalty);
      console.log('✅ Sample penalty record created');
    } catch (error) {
      if (error.code === 409) {
        console.log('ℹ️  Sample penalty already exists');
      } else {
        console.log('⚠️  Could not create sample penalty:', error.message);
      }
    }
    
    console.log('🎉 Penalties container setup complete!');
    
  } catch (error) {
    console.error('❌ Error setting up penalties container:', error);
    process.exit(1);
  }
}

// Run the setup
setupPenaltiesContainer();
