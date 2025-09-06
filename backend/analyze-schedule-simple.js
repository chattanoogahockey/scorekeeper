const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

// Use a relative path or env var for portability
const filePath = process.env.EXCEL_FILE_PATH || path.join(__dirname, '../../CHAHKY/data/fall_2025_schedule.xlsx');

try {
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(worksheet);

  if (!data.length) {
    console.log('No data found in the Excel file.');
    return;
  }

  console.log('=== EXCEL ANALYSIS ===');
  console.log('Headers:', Object.keys(data[0]));
  console.log('Total rows:', data.length);

  // Write to file for easier reading
  fs.writeFileSync('schedule_analysis.json', JSON.stringify({
    headers: Object.keys(data[0]),
    rowCount: data.length,
    sampleRows: data.slice(0, 3)
  }, null, 2));

  console.log('Analysis written to schedule_analysis.json');

  // Check for team names with >
  const teamsWithArrows = data.filter(row => {
    const homeTeam = row['Home Team'] || row['Home'] || '';
    const awayTeam = row['Away Team'] || row['Away'] || '';
    return homeTeam.includes('>') || awayTeam.includes('>');
  });

  if (teamsWithArrows.length > 0) {
    console.log(`Found ${teamsWithArrows.length} teams with > arrows`);
    console.log('Sample:', teamsWithArrows[0]);
  }

} catch (error) {
  console.error('Error:', error.message);
}
