import { getRostersContainer } from './cosmosClient.js';

async function fixRosterData() {
  try {
    const container = getRostersContainer();
    
    console.log('🔍 Checking current roster data structure...');
    
    // Get all existing records
    const querySpec = {
      query: 'SELECT * FROM c',
      parameters: [],
    };
    
    const { resources: rosters } = await container.items.query(querySpec).fetchAll();
    console.log(`Found ${rosters.length} roster records`);
    
    // Show what we have currently
    console.log('\n📋 Current data sample:');
    console.log('First record:', JSON.stringify(rosters[0], null, 2));
    
    // Define team to division mapping for cha-hockey (using actual team names from data)
    const teamDivisionMapping = {
      'Bachstreet Boys': 'Gold',
      'Whiskey Dekes': 'Gold', 
      'Purpetrators': 'Silver',
      'Toe Draggins': 'Silver',
      'Skateful Dead': 'Bronze',
      // Add more teams as needed
    };
    
    console.log('\n🔧 Updating records to add division field...');
    
    for (const roster of rosters) {
      const division = teamDivisionMapping[roster.team];
      if (!division) {
        console.log(`⚠️ Unknown team: ${roster.team} - skipping`);
        continue;
      }
      
      // Add division field
      roster.division = division;
      roster.updatedAt = new Date().toISOString();
      
      // Update the record
      await container.item(roster.id, roster.team).replace(roster);
      console.log(`✅ Updated ${roster.firstName} ${roster.lastName} (${roster.team}) - added division: ${division}`);
    }
    
    console.log('🎉 Finished updating all roster records with division information!');
    
  } catch (error) {
    console.error('❌ Error updating roster data:', error);
  }
}

// Run the script
fixRosterData();
