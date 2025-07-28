import { getRostersContainer } from './cosmosClient.js';

async function addSubPlaceholders() {
  try {
    const container = getRostersContainer();
    
    // Get all unique teams
    const { resources: teams } = await container.items.query('SELECT DISTINCT c.teamName, c.teamId, c.division FROM c').fetchAll();
    
    console.log('Adding Sub placeholders for teams:', teams.map(t => t.teamName));
    
    for (const team of teams) {
      // Check if Sub placeholder already exists for this team
      const { resources: existingSubs } = await container.items.query({
        query: 'SELECT * FROM c WHERE c.teamName = @teamName AND c.firstName = @firstName',
        parameters: [
          { name: '@teamName', value: team.teamName },
          { name: '@firstName', value: 'Sub' }
        ]
      }).fetchAll();
      
      if (existingSubs.length > 0) {
        console.log(`Sub placeholder already exists for ${team.teamName}`);
        continue;
      }
      
      // Create Sub placeholder
      const subPlayer = {
        id: `${team.teamId}-sub-placeholder`,
        teamId: team.teamId,
        firstName: 'Sub',
        lastName: 'Sub',
        fullName: 'Sub',
        teamName: team.teamName,
        division: team.division,
        season: 'winter 2025',
        jerseyNumber: 'SUB',
        position: 'Sub',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      await container.items.create(subPlayer);
      console.log(`✅ Added Sub placeholder for ${team.teamName}`);
    }
    
    console.log('Sub placeholders added successfully!');
    
    // Verify by counting total rosters
    const { resources: allRosters } = await container.items.query('SELECT * FROM c').fetchAll();
    console.log(`Total roster entries now: ${allRosters.length}`);
    
  } catch (error) {
    console.error('Error adding Sub placeholders:', error);
  }
}

addSubPlaceholders();
