#!/usr/bin/env node
import XLSX from 'xlsx';
import path from 'path';

const excelPath = 'C:\\Users\\marce\\OneDrive\\Documents\\CHAHKY\\data\\fall_2025_rosters_scheduling.xlsx';

try {
  const workbook = XLSX.readFile(excelPath);
  console.log('Sheets:', workbook.SheetNames);

  workbook.SheetNames.forEach(sheet => {
    const worksheet = workbook.Sheets[sheet];
    const data = XLSX.utils.sheet_to_json(worksheet, {header:1});
    console.log(`\n${sheet} - First 5 rows:`);
    data.slice(0,5).forEach((row, i) => console.log(`Row ${i+1}:`, row));
  });
} catch (error) {
  console.error('Error reading Excel file:', error.message);
}
