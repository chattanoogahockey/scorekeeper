import { generateRinkReport } from './rinkReportGenerator.js';

console.log('📰 Testing basic rink report generation...');

try {
  console.log('Starting generation...');
  const report = await generateRinkReport('Gold');
  console.log('✅ Report generated!');
  console.log('Report:', {
    id: report.id,
    division: report.division,
    title: report.title,
    htmlLength: report.html.length,
    highlightsCount: report.highlights.length
  });
} catch (error) {
  console.error('❌ Error:', error.message);
  console.error('Stack:', error.stack);
}
