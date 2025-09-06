const XLSX = require('xlsx');

try {
  const workbook = XLSX.readFile('C:/Users/marce/OneDrive/Documents/CHAHKY/data/fall_2025_schedule.xlsx');
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(worksheet);

  console.log('=== EXCEL ANALYSIS ===');
  console.log('Headers:', Object.keys(data[0] || {}));
  console.log('Total rows:', data.length);
  console.log('\nFirst 3 rows:');
  data.slice(0, 3).forEach((row, i) => {
    console.log(`Row ${i+1}:`, JSON.stringify(row, null, 2));
  });

  // Check for team names with >
  console.log('\n=== TEAM NAME ANALYSIS ===');
  const teamsWithArrows = data.filter(row => {
    const homeTeam = row['Home Team'] || row['Home'] || '';
    const awayTeam = row['Away Team'] || row['Away'] || '';
    return homeTeam.includes('>') || awayTeam.includes('>');
  });

  if (teamsWithArrows.length > 0) {
    console.log('Found teams with > arrows:');
    teamsWithArrows.slice(0, 5).forEach((row, i) => {
      console.log(`Example ${i+1}: Home="${row['Home Team'] || row['Home']}", Away="${row['Away Team'] || row['Away']}"`);
    });
  } else {
    console.log('No teams with > arrows found');
  }

} catch (error) {
  console.error('Error reading Excel file:', error.message);
}
