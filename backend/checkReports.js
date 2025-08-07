import { getRinkReportsContainer, initializeContainers } from './cosmosClient.js';

await initializeContainers();
const container = getRinkReportsContainer();
const { resources: reports } = await container.items.query('SELECT * FROM c').fetchAll();

console.log('📰 Rink reports in database:', reports.length);
reports.forEach((report, i) => {
  console.log(`${i+1}. ${report.id} - ${report.title}`);
  console.log(`   Division: ${report.division}`);
  console.log(`   Published: ${report.publishedAt}`);
  console.log(`   Highlights: ${report.highlights.length}`);
  console.log('');
});
