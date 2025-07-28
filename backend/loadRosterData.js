import { getRostersContainer } from './cosmosClient.js';

const rosterData = [
  // Bachstreet Boys
  { firstName: "Avery", lastName: "Bachman", teamName: "Bachstreet Boys", jerseyNumber: "10" },
  { firstName: "Kevin", lastName: "Burrell", teamName: "Bachstreet Boys", jerseyNumber: "11" },
  { firstName: "David", lastName: "Delmotte", teamName: "Bachstreet Boys", jerseyNumber: "12" },
  { firstName: "Caleb", lastName: "Erdner", teamName: "Bachstreet Boys", jerseyNumber: "13" },
  { firstName: "Joseph", lastName: "Feeney", teamName: "Bachstreet Boys", jerseyNumber: "14" },
  { firstName: "Sam", lastName: "Koebley", teamName: "Bachstreet Boys", jerseyNumber: "15" },
  { firstName: "Gregory", lastName: "Marshall", teamName: "Bachstreet Boys", jerseyNumber: "16" },
  { firstName: "Marc", lastName: "Redinger", teamName: "Bachstreet Boys", jerseyNumber: "17" },
  { firstName: "Alexey", lastName: "Veronin", teamName: "Bachstreet Boys", jerseyNumber: "18" },
  
  // Whiskey Dekes
  { firstName: "Kurtis", lastName: "Anderson", teamName: "Whiskey Dekes", jerseyNumber: "20" },
  { firstName: "Jarod", lastName: "Dible", teamName: "Whiskey Dekes", jerseyNumber: "21" },
  { firstName: "Noah", lastName: "Dillingham", teamName: "Whiskey Dekes", jerseyNumber: "22" },
  { firstName: "Shane", lastName: "Dockery", teamName: "Whiskey Dekes", jerseyNumber: "23" },
  { firstName: "Jared", lastName: "Leader", teamName: "Whiskey Dekes", jerseyNumber: "24" },
  { firstName: "Josh", lastName: "Martin", teamName: "Whiskey Dekes", jerseyNumber: "25" },
  { firstName: "Eric", lastName: "Polino", teamName: "Whiskey Dekes", jerseyNumber: "26" },
  { firstName: "Joe", lastName: "Pollis", teamName: "Whiskey Dekes", jerseyNumber: "27" },
  { firstName: "William", lastName: "Shea", teamName: "Whiskey Dekes", jerseyNumber: "28" },
  { firstName: "Josh", lastName: "Zweizig", teamName: "Whiskey Dekes", jerseyNumber: "29" },
  
  // Purpetrators
  { firstName: "Sam", lastName: "Bambrick", teamName: "Purpetrators", jerseyNumber: "30" },
  { firstName: "Jacob", lastName: "Elam", teamName: "Purpetrators", jerseyNumber: "31" },
  { firstName: "Brady", lastName: "Fulton", teamName: "Purpetrators", jerseyNumber: "32" },
  { firstName: "Owen", lastName: "Garner", teamName: "Purpetrators", jerseyNumber: "33" },
  { firstName: "Caden", lastName: "Gersky", teamName: "Purpetrators", jerseyNumber: "34" },
  { firstName: "Dante", lastName: "Marshall", teamName: "Purpetrators", jerseyNumber: "35" },
  { firstName: "David", lastName: "Mercer", teamName: "Purpetrators", jerseyNumber: "36" },
  { firstName: "Brad", lastName: "Truel", teamName: "Purpetrators", jerseyNumber: "37" },
  
  // Toe Draggins
  { firstName: "Conner", lastName: "Barry", teamName: "Toe Draggins", jerseyNumber: "40" },
  { firstName: "Nathan", lastName: "Brown", teamName: "Toe Draggins", jerseyNumber: "41" },
  { firstName: "Steven", lastName: "Fox", teamName: "Toe Draggins", jerseyNumber: "42" },
  { firstName: "Jordan", lastName: "Houde", teamName: "Toe Draggins", jerseyNumber: "43" },
  { firstName: "Justin", lastName: "Lucia", teamName: "Toe Draggins", jerseyNumber: "44" },
  { firstName: "Adam", lastName: "Michel", teamName: "Toe Draggins", jerseyNumber: "45" },
  { firstName: "Shaun", lastName: "Olsen", teamName: "Toe Draggins", jerseyNumber: "46" },
  { firstName: "Raphael", lastName: "Santos", teamName: "Toe Draggins", jerseyNumber: "47" },
  { firstName: "Timothy", lastName: "Willison", teamName: "Toe Draggins", jerseyNumber: "48" },
  
  // Skateful Dead
  { firstName: "Martin", lastName: "Bartow", teamName: "Skateful Dead", jerseyNumber: "50" },
  { firstName: "Jason", lastName: "Cochran", teamName: "Skateful Dead", jerseyNumber: "51" },
  { firstName: "Colby", lastName: "Frye", teamName: "Skateful Dead", jerseyNumber: "52" },
  { firstName: "Steven", lastName: "Howell", teamName: "Skateful Dead", jerseyNumber: "53" },
  { firstName: "Kenneth", lastName: "Johns", teamName: "Skateful Dead", jerseyNumber: "54" },
  { firstName: "Chris", lastName: "Sislo", teamName: "Skateful Dead", jerseyNumber: "55" },
  { firstName: "Evan", lastName: "Skiles", teamName: "Skateful Dead", jerseyNumber: "56" },
  { firstName: "Greg", lastName: "Williams", teamName: "Skateful Dead", jerseyNumber: "57" }
];

async function loadRosterData() {
  try {
    console.log('Starting roster data load...');
    const container = getRostersContainer();
    
    for (const player of rosterData) {
      const rosterRecord = {
        id: `${player.teamName.replace(/\s+/g, '-').toLowerCase()}-${player.firstName.toLowerCase()}-${player.lastName.toLowerCase()}`,
        teamId: `${player.teamName.replace(/\s+/g, '-').toLowerCase()}-gold-winter2025`, // partition key
        firstName: player.firstName,
        lastName: player.lastName,
        fullName: `${player.firstName} ${player.lastName}`,
        teamName: player.teamName,
        division: "gold",
        season: "winter 2025",
        jerseyNumber: player.jerseyNumber,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      const { resource } = await container.items.create(rosterRecord);
      console.log(`Added ${resource.fullName} to ${resource.teamName}`);
    }
    
    console.log('Roster data load completed successfully!');
    
    // Summary
    const teamCounts = {};
    rosterData.forEach(player => {
      teamCounts[player.teamName] = (teamCounts[player.teamName] || 0) + 1;
    });
    
    console.log('\n📊 Team Summary:');
    Object.entries(teamCounts).forEach(([team, count]) => {
      console.log(`  ${team}: ${count} players`);
    });
    
  } catch (error) {
    console.error('❌ Error loading roster data:', error);
  }
}

// Run the script
loadRosterData();
