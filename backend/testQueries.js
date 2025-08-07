import { getGamesContainer, getGoalsContainer, getPenaltiesContainer, initializeContainers } from './cosmosClient.js';

console.log('🔍 Testing database queries...');

try {
  await initializeContainers();
  
  console.log('1. Querying games...');
  const gamesContainer = getGamesContainer();
  const { resources: games } = await gamesContainer.items.query('SELECT * FROM c WHERE c.division = "Gold"').fetchAll();
  console.log('   Found', games.length, 'games');
  
  console.log('2. Querying goals...');
  const goalsContainer = getGoalsContainer();
  const { resources: goals } = await goalsContainer.items.query('SELECT * FROM c').fetchAll();
  console.log('   Found', goals.length, 'goals');
  
  console.log('3. Querying penalties...');
  const penaltiesContainer = getPenaltiesContainer();
  const { resources: penalties } = await penaltiesContainer.items.query('SELECT * FROM c').fetchAll();
  console.log('   Found', penalties.length, 'penalties');
  
  console.log('✅ Database queries completed successfully');
  
} catch (error) {
  console.error('❌ Error:', error);
}
