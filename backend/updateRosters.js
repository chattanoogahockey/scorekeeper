import { 
  getGamesContainer, 
  getAttendanceContainer, 
  getRostersContainer, 
  getGoalsContainer, 
  getPenaltiesContainer, 
  getOTShootoutContainer, 
  getRinkReportsContainer,
  getSettingsContainer,
  getAnalyticsContainer,
  getPlayersContainer,
  initializeContainers
} from './cosmosClient.js';

const newRosterData = [
  // Bachstreet Boys
  { firstName: 'Avery', lastName: 'Bachman', team: 'Bachstreet Boys' },
  { firstName: 'Kevin', lastName: 'Burrell', team: 'Bachstreet Boys' },
  { firstName: 'David', lastName: 'Delmotte', team: 'Bachstreet Boys' },
  { firstName: 'Caleb', lastName: 'Erdner', team: 'Bachstreet Boys' },
  { firstName: 'Joseph', lastName: 'Feeney', team: 'Bachstreet Boys' },
  { firstName: 'Sam', lastName: 'Koebley', team: 'Bachstreet Boys' },
  { firstName: 'Gregory', lastName: 'Marshall', team: 'Bachstreet Boys' },
  { firstName: 'Marc', lastName: 'Redinger', team: 'Bachstreet Boys' },
  { firstName: 'Alexey', lastName: 'Veronin', team: 'Bachstreet Boys' },
  
  // Whiskey Dekes
  { firstName: 'Kurtis', lastName: 'Anderson', team: 'Whiskey Dekes' },
  { firstName: 'Jarod', lastName: 'Dible', team: 'Whiskey Dekes' },
  { firstName: 'Noah', lastName: 'Dillingham', team: 'Whiskey Dekes' },
  { firstName: 'Shane', lastName: 'Dockery', team: 'Whiskey Dekes' },
  { firstName: 'Jared', lastName: 'Leader', team: 'Whiskey Dekes' },
  { firstName: 'Josh', lastName: 'Martin', team: 'Whiskey Dekes' },
  { firstName: 'Eric', lastName: 'Polino', team: 'Whiskey Dekes' },
  { firstName: 'Joe', lastName: 'Pollis', team: 'Whiskey Dekes' },
  { firstName: 'William', lastName: 'Shea', team: 'Whiskey Dekes' },
  { firstName: 'Josh', lastName: 'Zweizig', team: 'Whiskey Dekes' },
  
  // Purpetrators
  { firstName: 'Sam', lastName: 'Bambrick', team: 'Purpetrators' },
  { firstName: 'Jacob', lastName: 'Elam', team: 'Purpetrators' },
  { firstName: 'Brady', lastName: 'Fulton', team: 'Purpetrators' },
  { firstName: 'Owen', lastName: 'Garner', team: 'Purpetrators' },
  { firstName: 'Caden', lastName: 'Gersky', team: 'Purpetrators' },
  { firstName: 'Dante', lastName: 'Marshall', team: 'Purpetrators' },
  { firstName: 'David', lastName: 'Mercer', team: 'Purpetrators' },
  { firstName: 'Brad', lastName: 'Truel', team: 'Purpetrators' },
  
  // Toe Draggins
  { firstName: 'Conner', lastName: 'Barry', team: 'Toe Draggins' },
  { firstName: 'Nathan', lastName: 'Brown', team: 'Toe Draggins' },
  { firstName: 'Steven', lastName: 'Fox', team: 'Toe Draggins' },
  { firstName: 'Jordan', lastName: 'Houde', team: 'Toe Draggins' },
  { firstName: 'Justin', lastName: 'Lucia', team: 'Toe Draggins' },
  { firstName: 'Adam', lastName: 'Michel', team: 'Toe Draggins' },
  { firstName: 'Shaun', lastName: 'Olsen', team: 'Toe Draggins' },
  { firstName: 'Raphael', lastName: 'Santos', team: 'Toe Draggins' },
  { firstName: 'Timothy', lastName: 'Willison', team: 'Toe Draggins' },
  
  // Skateful Dead
  { firstName: 'Martin', lastName: 'Bartow', team: 'Skateful Dead' },
  { firstName: 'Jason', lastName: 'Cochran', team: 'Skateful Dead' },
  { firstName: 'Colby', lastName: 'Frye', team: 'Skateful Dead' },
  { firstName: 'Steven', lastName: 'Howell', team: 'Skateful Dead' },
  { firstName: 'Kenneth', lastName: 'Johns', team: 'Skateful Dead' },
  { firstName: 'Chris', lastName: 'Sislo', team: 'Skateful Dead' },
  { firstName: 'Evan', lastName: 'Skiles', team: 'Skateful Dead' },
  { firstName: 'Greg', lastName: 'Williams', team: 'Skateful Dead' },
  
  // UTC (Placeholder team for games)
  { firstName: 'John', lastName: 'Player1', team: 'UTC' },
  { firstName: 'Mike', lastName: 'Player2', team: 'UTC' },
  { firstName: 'Steve', lastName: 'Player3', team: 'UTC' },
  { firstName: 'Dave', lastName: 'Player4', team: 'UTC' },
  { firstName: 'Chris', lastName: 'Player5', team: 'UTC' },
  { firstName: 'Tom', lastName: 'Player6', team: 'UTC' },
  { firstName: 'Rob', lastName: 'Player7', team: 'UTC' },
  { firstName: 'Dan', lastName: 'Player8', team: 'UTC' }
];

async function updateRosters() {
  try {
    // Initialize containers first
    await initializeContainers();
    const rostersContainer = getRostersContainer();
    
    console.log('🗑️ Deleting all existing roster data...');
    
    // Get all existing roster items
    const { resources: existingRosters } = await rostersContainer.items
      .query('SELECT * FROM c')
      .fetchAll();
    
    // Delete all existing rosters
    for (const roster of existingRosters) {
      try {
        await rostersContainer.item(roster.id, roster.teamName || roster.id).delete();
        console.log(`   Deleted: ${roster.id}`);
      } catch (deleteError) {
        console.log(`   Failed to delete ${roster.id}:`, deleteError.message);
      }
    }
    
    console.log('✅ All existing rosters deleted');
    console.log('📝 Creating new team rosters...');
    
    // Group players by team
    const teamRosters = {};
    newRosterData.forEach(player => {
      if (!teamRosters[player.team]) {
        teamRosters[player.team] = [];
      }
      teamRosters[player.team].push({
        name: `${player.firstName} ${player.lastName}`,
        firstName: player.firstName,
        lastName: player.lastName
      });
    });
    
    // Create roster documents for each team
    for (const [teamName, players] of Object.entries(teamRosters)) {
      const rosterDoc = {
        id: teamName.replace(/\s+/g, '_').toLowerCase(),
        teamName: teamName,
        season: '2024-2025',
        division: 'Gold',
        players: players,
        totalPlayers: players.length,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      await rostersContainer.items.create(rosterDoc);
      console.log(`✅ Created roster for ${teamName} (${players.length} players)`);
    }
    
    console.log('🎉 Roster update completed successfully!');
    console.log(`📊 Total teams: ${Object.keys(teamRosters).length}`);
    console.log(`📊 Total players: ${newRosterData.length}`);
    
  } catch (error) {
    console.error('❌ Error updating rosters:', error);
    process.exit(1);
  }
}

// Run the update
updateRosters().then(() => {
  console.log('✅ Roster update script completed');
  process.exit(0);
}).catch(error => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});
