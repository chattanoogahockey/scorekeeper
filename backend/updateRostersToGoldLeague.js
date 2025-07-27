import { getRostersContainer } from './cosmosClient.js';

async function updateRostersToGoldLeague() {
  try {
    const container = getRostersContainer();
    
    console.log('🔄 Updating all roster records to use "Gold" league instead of "cha-hockey"...');
    
    // Get all existing roster records
    const querySpec = {
      query: 'SELECT * FROM c WHERE c.league = "cha-hockey"',
      parameters: [],
    };
    
    const { resources: rosters } = await container.items.query(querySpec).fetchAll();
    console.log(`Found ${rosters.length} roster records to update from cha-hockey to Gold`);
    
    for (const roster of rosters) {
      // Update league to Gold
      roster.league = 'Gold';
      roster.leagueId = 'gold';
      roster.updatedAt = new Date().toISOString();
      
      // Update the record
      await container.item(roster.id, roster.team).replace(roster);
      console.log(`✅ Updated ${roster.firstName} ${roster.lastName} (${roster.team}) - changed to Gold league`);
    }
    
    console.log('🎉 Finished updating all roster records to Gold league!');
    
  } catch (error) {
    console.error('❌ Error updating rosters to Gold league:', error);
  }
}

// Run the script
updateRostersToGoldLeague();
