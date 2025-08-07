import { generateRinkReport, generateReportsForAllDivisions } from './rinkReportGenerator.js';
import fs from 'fs';

console.log('📰 Generating a basic Gold division rink report...');

try {
  // Just generate for Gold division
  const report = await generateRinkReport('Gold');
  
  console.log('✅ Report generated successfully!');
  console.log('Report details:');
  console.log('- ID:', report.id);
  console.log('- Division:', report.division);
  console.log('- Title:', report.title);
  console.log('- Published:', report.publishedAt);
  console.log('- Highlights count:', report.highlights.length);
  console.log('- HTML length:', report.html.length);
  
  // Save the HTML to see what it looks like
  fs.writeFileSync('rink-report-preview.html', `
    <html>
    <head><title>${report.title}</title></head>
    <body>
      <h1>${report.title}</h1>
      ${report.html}
      <h2>Highlights</h2>
      <ul>
        ${report.highlights.map(h => `<li>${h}</li>`).join('')}
      </ul>
    </body>
    </html>
  `);
  
  console.log('📄 Report preview saved to rink-report-preview.html');
  
} catch (error) {
  console.error('❌ Error:', error.message);
  console.error('Stack:', error.stack);
}
