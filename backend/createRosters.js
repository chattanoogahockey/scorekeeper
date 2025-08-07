import { 
  getRostersContainer, 
  initializeContainers 
} from './cosmosClient.js';

/**
 * Script to create rosters for the new teams
 */

const teamRosters = [
  {
    teamName: 'Purpetrators',
    division: 'Gold',
    season: '2024-2025',
    players: [
      { firstName: 'John', lastName: 'Smith', jerseyNumber: 1, position: 'Forward' },
      { firstName: 'Mike', lastName: 'Johnson', jerseyNumber: 2, position: 'Defense' },
      { firstName: 'Steve', lastName: 'Wilson', jerseyNumber: 3, position: 'Forward' },
      { firstName: 'Dave', lastName: 'Brown', jerseyNumber: 4, position: 'Forward' },
      { firstName: 'Chris', lastName: 'Davis', jerseyNumber: 5, position: 'Defense' },
      { firstName: 'Tom', lastName: 'Miller', jerseyNumber: 6, position: 'Forward' },
      { firstName: 'Rob', lastName: 'Garcia', jerseyNumber: 7, position: 'Forward' },
      { firstName: 'Dan', lastName: 'Rodriguez', jerseyNumber: 8, position: 'Defense' },
      { firstName: 'Pat', lastName: 'Martinez', jerseyNumber: 9, position: 'Forward' },
      { firstName: 'Alex', lastName: 'Anderson', jerseyNumber: 10, position: 'Goalie' }
    ]
  },
  {
    teamName: 'Bachstreet Boys',
    division: 'Gold',
    season: '2024-2025',
    players: [
      { firstName: 'Brian', lastName: 'Littrell', jerseyNumber: 11, position: 'Forward' },
      { firstName: 'Nick', lastName: 'Carter', jerseyNumber: 12, position: 'Forward' },
      { firstName: 'AJ', lastName: 'McLean', jerseyNumber: 13, position: 'Defense' },
      { firstName: 'Howie', lastName: 'Dorough', jerseyNumber: 14, position: 'Forward' },
      { firstName: 'Kevin', lastName: 'Richardson', jerseyNumber: 15, position: 'Defense' },
      { firstName: 'Mark', lastName: 'Thompson', jerseyNumber: 16, position: 'Forward' },
      { firstName: 'Jake', lastName: 'White', jerseyNumber: 17, position: 'Forward' },
      { firstName: 'Ryan', lastName: 'Clark', jerseyNumber: 18, position: 'Defense' },
      { firstName: 'Kyle', lastName: 'Lewis', jerseyNumber: 19, position: 'Forward' },
      { firstName: 'Sean', lastName: 'Walker', jerseyNumber: 20, position: 'Goalie' }
    ]
  },
  {
    teamName: 'Skateful Dead',
    division: 'Gold',
    season: '2024-2025',
    players: [
      { firstName: 'Jerry', lastName: 'Garcia', jerseyNumber: 21, position: 'Forward' },
      { firstName: 'Bob', lastName: 'Weir', jerseyNumber: 22, position: 'Defense' },
      { firstName: 'Phil', lastName: 'Lesh', jerseyNumber: 23, position: 'Forward' },
      { firstName: 'Mickey', lastName: 'Hart', jerseyNumber: 24, position: 'Forward' },
      { firstName: 'Bill', lastName: 'Kreutzmann', jerseyNumber: 25, position: 'Defense' },
      { firstName: 'Ron', lastName: 'McKernan', jerseyNumber: 26, position: 'Forward' },
      { firstName: 'Keith', lastName: 'Godchaux', jerseyNumber: 27, position: 'Forward' },
      { firstName: 'Brent', lastName: 'Mydland', jerseyNumber: 28, position: 'Defense' },
      { firstName: 'Vince', lastName: 'Welnick', jerseyNumber: 29, position: 'Forward' },
      { firstName: 'Bruce', lastName: 'Hornsby', jerseyNumber: 30, position: 'Goalie' }
    ]
  },
  {
    teamName: 'UTC',
    division: 'Gold',
    season: '2024-2025',
    players: [
      { firstName: 'Thunder', lastName: 'Strike', jerseyNumber: 31, position: 'Forward' },
      { firstName: 'Lightning', lastName: 'Bolt', jerseyNumber: 32, position: 'Defense' },
      { firstName: 'Storm', lastName: 'Cloud', jerseyNumber: 33, position: 'Forward' },
      { firstName: 'Hurricane', lastName: 'Wind', jerseyNumber: 34, position: 'Forward' },
      { firstName: 'Tornado', lastName: 'Spin', jerseyNumber: 35, position: 'Defense' },
      { firstName: 'Blizzard', lastName: 'Snow', jerseyNumber: 36, position: 'Forward' },
      { firstName: 'Cyclone', lastName: 'Twist', jerseyNumber: 37, position: 'Forward' },
      { firstName: 'Tempest', lastName: 'Fury', jerseyNumber: 38, position: 'Defense' },
      { firstName: 'Gale', lastName: 'Force', jerseyNumber: 39, position: 'Forward' },
      { firstName: 'Frost', lastName: 'Freeze', jerseyNumber: 40, position: 'Goalie' }
    ]
  },
  {
    teamName: 'Whiskey Dekes',
    division: 'Gold',
    season: '2024-2025',
    players: [
      { firstName: 'Jack', lastName: 'Daniels', jerseyNumber: 41, position: 'Forward' },
      { firstName: 'Jim', lastName: 'Beam', jerseyNumber: 42, position: 'Defense' },
      { firstName: 'Jameson', lastName: 'Irish', jerseyNumber: 43, position: 'Forward' },
      { firstName: 'Crown', lastName: 'Royal', jerseyNumber: 44, position: 'Forward' },
      { firstName: 'Wild', lastName: 'Turkey', jerseyNumber: 45, position: 'Defense' },
      { firstName: 'Maker', lastName: 'Mark', jerseyNumber: 46, position: 'Forward' },
      { firstName: 'Bulleit', lastName: 'Bourbon', jerseyNumber: 47, position: 'Forward' },
      { firstName: 'Woodford', lastName: 'Reserve', jerseyNumber: 48, position: 'Defense' },
      { firstName: 'Buffalo', lastName: 'Trace', jerseyNumber: 49, position: 'Forward' },
      { firstName: 'Eagle', lastName: 'Rare', jerseyNumber: 50, position: 'Goalie' }
    ]
  },
  {
    teamName: 'Toe Draggins',
    division: 'Gold',
    season: '2024-2025',
    players: [
      { firstName: 'Connor', lastName: 'McDavid', jerseyNumber: 51, position: 'Forward' },
      { firstName: 'Sidney', lastName: 'Crosby', jerseyNumber: 52, position: 'Forward' },
      { firstName: 'Alexander', lastName: 'Ovechkin', jerseyNumber: 53, position: 'Forward' },
      { firstName: 'Nathan', lastName: 'MacKinnon', jerseyNumber: 54, position: 'Forward' },
      { firstName: 'Leon', lastName: 'Draisaitl', jerseyNumber: 55, position: 'Forward' },
      { firstName: 'Erik', lastName: 'Karlsson', jerseyNumber: 56, position: 'Defense' },
      { firstName: 'Victor', lastName: 'Hedman', jerseyNumber: 57, position: 'Defense' },
      { firstName: 'Cale', lastName: 'Makar', jerseyNumber: 58, position: 'Defense' },
      { firstName: 'Auston', lastName: 'Matthews', jerseyNumber: 59, position: 'Forward' },
      { firstName: 'Andrei', lastName: 'Vasilevskiy', jerseyNumber: 60, position: 'Goalie' }
    ]
  }
];

async function createTeamRosters() {
  console.log('🏒 Creating team rosters...');
  
  try {
    // Initialize database containers
    await initializeContainers();
    const rostersContainer = getRostersContainer();
    
    console.log('🗑️ Removing existing rosters for these teams...');
    
    // Get all existing rosters for these teams
    const teamNames = teamRosters.map(team => team.teamName);
    
    for (const teamName of teamNames) {
      const { resources: existingRosters } = await rostersContainer.items
        .query({
          query: "SELECT * FROM c WHERE c.teamName = @teamName",
          parameters: [{ name: '@teamName', value: teamName }]
        })
        .fetchAll();
      
      // Delete existing rosters for this team
      for (const roster of existingRosters) {
        try {
          const partitionKey = roster.teamId || roster.teamName;
          await rostersContainer.item(roster.id, partitionKey).delete();
          console.log(`✅ Deleted existing roster entry for ${teamName}`);
        } catch (deleteError) {
          if (deleteError.code === 404) {
            console.log(`ℹ️  Roster entry already removed for ${teamName}`);
          } else {
            console.error(`❌ Failed to delete roster for ${teamName}:`, deleteError.message);
          }
        }
      }
    }
    
    console.log('✨ Adding new team rosters...');
    
    // Add new rosters
    for (const team of teamRosters) {
      for (const player of team.players) {
        const rosterEntry = {
          id: `${team.teamName}-${player.jerseyNumber}`,
          teamId: team.teamName,
          teamName: team.teamName,
          division: team.division,
          season: team.season,
          firstName: player.firstName,
          lastName: player.lastName,
          fullName: `${player.firstName} ${player.lastName}`,
          jerseyNumber: player.jerseyNumber,
          position: player.position,
          createdAt: new Date().toISOString()
        };
        
        try {
          const { resource } = await rostersContainer.items.create(rosterEntry);
          console.log(`✅ Added player: ${player.firstName} ${player.lastName} (#${player.jerseyNumber}) - ${team.teamName}`);
        } catch (createError) {
          console.error(`❌ Failed to add player ${player.firstName} ${player.lastName}:`, createError.message);
        }
      }
    }
    
    console.log('🎉 Team rosters created successfully!');
    console.log(`👥 Created rosters for:`);
    
    teamRosters.forEach(team => {
      console.log(`   ${team.teamName} (${team.players.length} players)`);
    });
    
  } catch (error) {
    console.error('💥 Error during roster creation:', error);
    process.exit(1);
  }
}

// Run the script
createTeamRosters()
  .then(() => {
    console.log('🏁 Roster creation completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Roster creation failed:', error);
    process.exit(1);
  });
