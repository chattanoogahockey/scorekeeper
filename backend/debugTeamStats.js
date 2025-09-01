import { getDatabase } from './cosmosClient.js';

async function debugTeamStats() {
  try {
    const db = await getDatabase();
    const gamesC = db.container('games');
    const goalsC = db.container('goals');

    console.log('=== Debug Team Stats ===');

    // Check game submissions
    const { resources: submissions } = await gamesC.items.query({
      query: "SELECT * FROM c WHERE c.eventType = 'game-submission'",
      parameters: []
    }).fetchAll();
    
    console.log(`Found ${submissions.length} game submissions:`);
    submissions.forEach((sub, i) => {
      console.log(`  ${i+1}. Game ID: ${sub.gameId}, Home: ${sub.homeTeam}, Away: ${sub.awayTeam}, Division: ${sub.division}`);
      console.log(`     Final Score: ${JSON.stringify(sub.finalScore)}`);
    });

    // Check actual games
    const gameIds = submissions.map(s => s.gameId);
    const { resources: allGames } = await gamesC.items.query('SELECT * FROM c WHERE NOT IS_DEFINED(c.eventType)').fetchAll();
    console.log(`\nFound ${allGames.length} base games (no eventType)`);
    
    const byId = new Map(allGames.map(g => [g.id, g]));
    let matchedGames = [];
    for (const sub of submissions) { 
      const g = byId.get(sub.gameId); 
      if (g) {
        matchedGames.push(g);
        console.log(`  Matched submission ${sub.gameId} with base game ${g.id}`);
      } else {
        console.log(`  MISSING: No base game found for submission ${sub.gameId}`);
      }
    }

    console.log(`\nMatched ${matchedGames.length} games for team stats calculation`);

    // Check goals
    const { resources: allGoals } = await goalsC.items.query('SELECT * FROM c').fetchAll();
    const relevantGoals = allGoals.filter(g => gameIds.includes(g.gameId));
    console.log(`\nFound ${allGoals.length} total goals, ${relevantGoals.length} relevant to submitted games`);

    if (relevantGoals.length > 0) {
      console.log('Sample goal:', JSON.stringify(relevantGoals[0], null, 2));
    }

  } catch (e) {
    console.error('Debug error:', e);
  }
}

debugTeamStats();
