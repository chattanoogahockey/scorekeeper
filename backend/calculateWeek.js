// Calculate what week April 3rd, 2025 is
const gameDate = new Date('2025-04-03');
const year = gameDate.getFullYear();
const startOfYear = new Date(year, 0, 1);
const dayOfYear = Math.floor((gameDate - startOfYear) / (24 * 60 * 60 * 1000)) + 1;
const weekNumber = Math.ceil(dayOfYear / 7);
const weekId = `${year}-W${weekNumber.toString().padStart(2, '0')}`;

console.log('Game date:', gameDate.toDateString());
console.log('Day of year:', dayOfYear);
console.log('Week number:', weekNumber);
console.log('Week ID:', weekId);

// Also calculate current week
const now = new Date();
const currentYear = now.getFullYear();
const currentStartOfYear = new Date(currentYear, 0, 1);
const currentDayOfYear = Math.floor((now - currentStartOfYear) / (24 * 60 * 60 * 1000)) + 1;
const currentWeekNumber = Math.ceil(currentDayOfYear / 7);
const currentWeekId = `${currentYear}-W${currentWeekNumber.toString().padStart(2, '0')}`;

console.log('\nCurrent date:', now.toDateString());
console.log('Current week ID:', currentWeekId);
