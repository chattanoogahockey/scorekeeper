import { getRostersContainer } from './cosmosClient.js';

const rosterData = [
  { firstName: "Avery", lastName: "Bachman", team: "Bachstreet Boys" },
  { firstName: "Kevin", lastName: "Burrell", team: "Bachstreet Boys" },
  { firstName: "David", lastName: "Delmotte", team: "Bachstreet Boys" },
  { firstName: "Caleb", lastName: "Erdner", team: "Bachstreet Boys" },
  { firstName: "Joseph", lastName: "Feeney", team: "Bachstreet Boys" },
  { firstName: "Sam", lastName: "Koebley", team: "Bachstreet Boys" },
  { firstName: "Gregory", lastName: "Marshall", team: "Bachstreet Boys" },
  { firstName: "Marc", lastName: "Redinger", team: "Bachstreet Boys" },
  { firstName: "Alexey", lastName: "Veronin", team: "Bachstreet Boys" },
  { firstName: "Kurtis", lastName: "Anderson", team: "Whiskey Dekes" },
  { firstName: "Jarod", lastName: "Dible", team: "Whiskey Dekes" },
  { firstName: "Noah", lastName: "Dillingham", team: "Whiskey Dekes" },
  { firstName: "Shane", lastName: "Dockery", team: "Whiskey Dekes" },
  { firstName: "Jared", lastName: "Leader", team: "Whiskey Dekes" },
  { firstName: "Josh", lastName: "Martin", team: "Whiskey Dekes" },
  { firstName: "Eric", lastName: "Polino", team: "Whiskey Dekes" },
  { firstName: "Joe", lastName: "Pollis", team: "Whiskey Dekes" },
  { firstName: "William", lastName: "Shea", team: "Whiskey Dekes" },
  { firstName: "Josh", lastName: "Zweizig", team: "Whiskey Dekes" },
  { firstName: "Sam", lastName: "Bambrick", team: "Purpetrators" },
  { firstName: "Jacob", lastName: "Elam", team: "Purpetrators" },
  { firstName: "Brady", lastName: "Fulton", team: "Purpetrators" },
  { firstName: "Owen", lastName: "Garner", team: "Purpetrators" },
  { firstName: "Caden", lastName: "Gersky", team: "Purpetrators" },
  { firstName: "Dante", lastName: "Marshall", team: "Purpetrators" },
  { firstName: "David", lastName: "Mercer", team: "Purpetrators" },
  { firstName: "Brad", lastName: "Truel", team: "Purpetrators" },
  { firstName: "Conner", lastName: "Barry", team: "Toe Draggins" },
  { firstName: "Nathan", lastName: "Brown", team: "Toe Draggins" },
  { firstName: "Steven", lastName: "Fox", team: "Toe Draggins" },
  { firstName: "Jordan", lastName: "Houde", team: "Toe Draggins" },
  { firstName: "Justin", lastName: "Lucia", team: "Toe Draggins" },
  { firstName: "Adam", lastName: "Michel", team: "Toe Draggins" },
  { firstName: "Shaun", lastName: "Olsen", team: "Toe Draggins" },
  { firstName: "Raphael", lastName: "Santos", team: "Toe Draggins" },
  { firstName: "Timothy", lastName: "Willison", team: "Toe Draggins" },
  { firstName: "Martin", lastName: "Bartow", team: "Skateful Dead" },
  { firstName: "Jason", lastName: "Cochran", team: "Skateful Dead" },
  { firstName: "Colby", lastName: "Frye", team: "Skateful Dead" },
  { firstName: "Steven", lastName: "Howell", team: "Skateful Dead" },
  { firstName: "Kenneth", lastName: "Johns", team: "Skateful Dead" },
  { firstName: "Chris", lastName: "Sislo", team: "Skateful Dead" },
  { firstName: "Evan", lastName: "Skiles", team: "Skateful Dead" },
  { firstName: "Greg", lastName: "Williams", team: "Skateful Dead" }
];

async function loadRosters() {
  try {
    const container = getRostersContainer();
    
    console.log('Loading roster data into Cosmos DB...');
    
    for (let i = 0; i < rosterData.length; i++) {
      const player = rosterData[i];
      const playerRecord = {
        id: `player-${player.firstName.toLowerCase()}-${player.lastName.toLowerCase()}-${Date.now()}-${i}`,
        firstName: player.firstName,
        lastName: player.lastName,
        fullName: `${player.firstName} ${player.lastName}`,
        team: player.team,
        teamId: player.team.toLowerCase().replace(/\s+/g, '-'),
        league: 'cha-hockey',
        position: null, // Can be added later
        jerseyNumber: null, // Can be added later
        isActive: true,
        createdAt: new Date().toISOString()
      };
      
      const { resource } = await container.items.create(playerRecord);
      console.log(`✅ Added ${player.firstName} ${player.lastName} (${player.team})`);
    }
    
    console.log(`🎉 Successfully loaded ${rosterData.length} players into the rosters container!`);
    
  } catch (error) {
    console.error('❌ Error loading rosters:', error);
  }
}

// Run the script
loadRosters();
