#!/usr/bin/env node

/**
 * Comprehensive Field Consistency Analysis
 * 
 * This script performs a complete end-to-end review of all container fields
 * to ensure consistent naming conventions across the entire application
 */

import { CosmosClient } from '@azure/cosmos';
import { config } from '../config/index.js';
import dotenv from 'dotenv';

dotenv.config({ path: '../.env' });

const client = new CosmosClient({
  endpoint: config.cosmos.uri,
  key: config.cosmos.key
});

const database = client.database(config.cosmos.database);

async function analyzeFieldConsistency() {
  console.log('🔍 COMPREHENSIVE FIELD CONSISTENCY ANALYSIS\n');
  console.log('Analyzing ALL containers and their field naming conventions...\n');
  
  const containerAnalysis = {};
  
  try {
    // Get all containers
    const { resources: containers } = await database.containers.readAll().fetchAll();
    
    for (const containerDef of containers) {
      const containerName = containerDef.id;
      console.log(`📊 Analyzing container: ${containerName}`);
      
      const container = database.container(containerName);
      
      try {
        // Get sample documents to analyze field structure
        const { resources: documents } = await container.items.query('SELECT * FROM c').fetchAll();
        
        if (documents.length === 0) {
          console.log(`   ⚠️  Empty container - no field analysis possible`);
          containerAnalysis[containerName] = { status: 'empty', fields: [], sampleCount: 0 };
          continue;
        }
        
        // Analyze field names across all documents
        const allFields = new Set();
        const fieldVariations = {};
        
        documents.forEach(doc => {
          Object.keys(doc).forEach(field => {
            // Skip system fields
            if (!field.startsWith('_')) {
              allFields.add(field);
              
              // Track variations of similar field names
              const normalizedField = field.toLowerCase();
              if (!fieldVariations[normalizedField]) {
                fieldVariations[normalizedField] = new Set();
              }
              fieldVariations[normalizedField].add(field);
            }
          });
        });
        
        // Get sample document for structure analysis
        const sampleDoc = documents[0];
        
        containerAnalysis[containerName] = {
          status: 'analyzed',
          sampleCount: documents.length,
          fields: Array.from(allFields).sort(),
          fieldVariations,
          sampleDocument: sampleDoc
        };
        
        console.log(`   ✅ Found ${documents.length} documents with ${allFields.size} unique fields`);
        
      } catch (queryError) {
        console.log(`   ❌ Error querying container: ${queryError.message}`);
        containerAnalysis[containerName] = { status: 'error', error: queryError.message };
      }
    }
    
    console.log('\n📋 FIELD CONSISTENCY ANALYSIS RESULTS:\n');
    
    // Key field categories to check for consistency
    const keyFieldCategories = {
      playerIdentification: ['playerName', 'playername', 'player', 'scorer', 'penalizedPlayer'],
      teamIdentification: ['teamName', 'teamname', 'team', 'scoringTeam', 'penalizedTeam', 'homeTeam', 'awayTeam'],
      gameIdentification: ['gameId', 'gameid', 'game'],
      divisionIdentification: ['division', 'div'],
      timeIdentification: ['recordedAt', 'createdAt', 'updatedAt', 'timestamp', 'gameDate'],
      seasonIdentification: ['season', 'year']
    };
    
    console.log('🎯 CRITICAL FIELD CONSISTENCY CHECK:\n');
    
    Object.entries(keyFieldCategories).forEach(([category, variations]) => {
      console.log(`${category.toUpperCase()}:`);
      
      const foundVariations = {};
      
      Object.entries(containerAnalysis).forEach(([containerName, analysis]) => {
        if (analysis.status === 'analyzed') {
          const foundFields = analysis.fields.filter(field => 
            variations.some(variation => 
              field.toLowerCase().includes(variation.toLowerCase())
            )
          );
          
          if (foundFields.length > 0) {
            foundVariations[containerName] = foundFields;
          }
        }
      });
      
      if (Object.keys(foundVariations).length > 0) {
        Object.entries(foundVariations).forEach(([container, fields]) => {
          console.log(`   ${container}: ${fields.join(', ')}`);
        });
      } else {
        console.log(`   No fields found in this category`);
      }
      console.log('');
    });
    
    // Detailed container analysis
    console.log('📊 DETAILED CONTAINER FIELD ANALYSIS:\n');
    
    Object.entries(containerAnalysis).forEach(([containerName, analysis]) => {
      console.log(`${containerName.toUpperCase()}:`);
      
      if (analysis.status === 'analyzed') {
        console.log(`   Document Count: ${analysis.sampleCount}`);
        console.log(`   Fields (${analysis.fields.length}): ${analysis.fields.join(', ')}`);
        
        // Show sample document structure (first few fields)
        const sampleFields = Object.entries(analysis.sampleDocument)
          .filter(([key]) => !key.startsWith('_'))
          .slice(0, 8)
          .map(([key, value]) => `${key}: ${typeof value}`)
          .join(', ');
        console.log(`   Sample Structure: ${sampleFields}`);
        
        // Check for field name inconsistencies within this container
        const inconsistencies = [];
        Object.entries(analysis.fieldVariations).forEach(([normalized, variations]) => {
          if (variations.size > 1) {
            inconsistencies.push(`${normalized}: ${Array.from(variations).join(', ')}`);
          }
        });
        
        if (inconsistencies.length > 0) {
          console.log(`   ⚠️  Field Variations: ${inconsistencies.join('; ')}`);
        }
        
      } else {
        console.log(`   Status: ${analysis.status}`);
        if (analysis.error) {
          console.log(`   Error: ${analysis.error}`);
        }
      }
      console.log('');
    });
    
    return containerAnalysis;
    
  } catch (error) {
    console.error('❌ Error during field analysis:', error.message);
    throw error;
  }
}

// Run the analysis
analyzeFieldConsistency()
  .then((analysis) => {
    console.log('🏁 Field consistency analysis complete');
    console.log('\n🎯 NEXT STEPS:');
    console.log('   1. Review field naming inconsistencies');
    console.log('   2. Standardize critical field names across containers');
    console.log('   3. Update application code to use consistent field names');
    console.log('   4. Test end-to-end data flow');
    process.exit(0);
  })
  .catch(error => {
    console.error('💥 Analysis failed:', error);
    process.exit(1);
  });
