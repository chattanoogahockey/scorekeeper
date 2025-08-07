import { getRinkReportsContainer, initializeContainers } from './cosmosClient.js';

// Simple rink report generation that handles no completed games
async function generateBasicRinkReport(division) {
  const reportId = `${division}-all-submitted`;
  console.log(`📰 Generating basic rink report for ${division} division...`);
  
  try {
    await initializeContainers();
    
    // Create a basic report for when no games are completed yet
    const report = {
      id: reportId,
      division,
      publishedAt: new Date().toISOString(),
      author: 'AI Report Generator',
      title: `${division} Division Roundup`,
      html: `
        <p>The ${division} Division season is ready to begin! Games are scheduled and teams are preparing for what promises to be an exciting season of hockey.</p>
        
        <h3>Season Preview</h3>
        <p>Teams have been practicing hard and rosters are finalized. The upcoming games will showcase the talent and competitive spirit that makes this division so entertaining to watch.</p>
        
        <h3>Looking Ahead</h3>
        <p>As games begin to be played and results are submitted, this report will showcase the highlights, standout performances, and exciting moments from each matchup. Check back after games are completed to see detailed statistics and analysis.</p>
        
        <p>Get ready for an amazing season of ${division} division hockey!</p>
      `,
      highlights: [
        `${division} division season ready to begin`,
        'Teams have finalized rosters and are prepared for competition',
        'Exciting games scheduled ahead'
      ],
      standoutPlayers: [],
      leagueUpdates: [
        `${division} division rosters are complete`,
        'Teams are preparing for the upcoming season',
        'Games are scheduled and ready to begin'
      ],
      upcomingPredictions: [
        {
          matchup: 'Season Opener',
          prediction: 'Expect competitive, high-energy hockey as teams debut their lineups',
          keyFactor: 'Early season chemistry and execution will be crucial'
        }
      ],
      generatedBy: 'auto',
      lastUpdated: new Date().toISOString()
    };
    
    const container = getRinkReportsContainer();
    await container.items.upsert(report);
    
    console.log(`✅ Basic rink report generated and stored for ${division} division`);
    return report;
  } catch (error) {
    console.error(`❌ Error generating basic rink report for ${division} division:`, error);
    throw error;
  }
}

// Test the basic report generation
try {
  const report = await generateBasicRinkReport('Gold');
  console.log('✅ Report generated successfully!');
  console.log('Report ID:', report.id);
  console.log('Title:', report.title);
  console.log('Highlights:', report.highlights.length);
} catch (error) {
  console.error('❌ Error:', error);
}
