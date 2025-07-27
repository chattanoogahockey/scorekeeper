import { getRostersContainer } from './cosmosClient.js';

async function updateRostersWithLeague() {
  try {
    const container = getRostersContainer();
    
    console.log('🔄 Updating all roster records to include league = "Gold"...');
    
    // Get all existing roster records
    const querySpec = {
      query: 'SELECT * FROM c',
      parameters: [],
    };
    
    const { resources: rosters } = await container.items.query(querySpec).fetchAll();
    console.log(`Found ${rosters.length} roster records to update`);
    
    for (const roster of rosters) {
      // Add league field if it doesn't exist
      if (!roster.league) {
        roster.league = 'Gold';
        roster.leagueId = 'gold';
        roster.updatedAt = new Date().toISOString();
        
        // Update the record
        await container.item(roster.id, roster.team).replace(roster);
        console.log(`✅ Updated ${roster.firstName} ${roster.lastName} (${roster.team}) - added Gold league`);
      } else {
        console.log(`⏭️  Skipped ${roster.firstName} ${roster.lastName} (${roster.team}) - already has league: ${roster.league}`);
      }
    }
    
    console.log('🎉 Finished updating roster records with league information!');
    
  } catch (error) {
    console.error('❌ Error updating rosters with league:', error);
  }
}

// Run the script
updateRostersWithLeague();
