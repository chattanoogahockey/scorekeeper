import { generateRinkReport } from './rinkReportGenerator.js';

console.log('📰 Testing rink report generation for Gold division...');

try {
  const report = await generateRinkReport('Gold');
  console.log('✅ Report generated successfully!');
  console.log('Report ID:', report.id);
  console.log('Division:', report.division);
  console.log('Title:', report.title);
  console.log('Generated at:', report.publishedAt);
  console.log('\nFirst 200 characters of HTML:');
  console.log(report.html.substring(0, 200) + '...');
  console.log('\nHighlights:');
  report.highlights.forEach((highlight, i) => {
    console.log(`  ${i + 1}. ${highlight}`);
  });
} catch (error) {
  console.error('❌ Error generating report:', error);
  process.exit(1);
}

console.log('✅ Test completed successfully!');
