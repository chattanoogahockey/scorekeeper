import fs from 'fs';

const serverPath = './server.js';
let content = fs.readFileSync(serverPath, 'utf8');

console.log('🧹 FINAL BACKEND STANDARDIZATION');
console.log('================================\n');

let changes = 0;

// Remove fallback references for team fields
const teamPatterns = [
  {
    search: /g\.teamName \|\| g\.scoringTeam \|\| g\.team/g,
    replace: 'g.teamName',
    desc: 'teamName fallbacks in goals'
  },
  {
    search: /goal\.scoringTeam \|\| goal\.team \|\| goal\.teamName/g,
    replace: 'goal.teamName',
    desc: 'teamName fallbacks in goal processing'
  },
  {
    search: /\(g\.scoringTeam\|\|g\.team\)/g,
    replace: 'g.teamName',
    desc: 'teamName fallbacks in scoring logic'
  },
  {
    search: /if \(!g\.teamName && \(g\.scoringTeam \|\| g\.team\)\) \{ g\.teamName = g\.scoringTeam \|\| g\.team; changed = true; \}/g,
    replace: '// teamName is now standardized across all containers',
    desc: 'Remove teamName migration logic'
  }
];

teamPatterns.forEach(({ search, replace, desc }) => {
  const before = content;
  content = content.replace(search, replace);
  if (content !== before) {
    const matches = (before.match(search) || []).length;
    changes += matches;
    console.log(`✅ ${desc}: ${matches} instances`);
  }
});

// Update rink-reports handling to use standardized field names
const rinkReportPattern = {
  search: /standoutPlayers\s*:\s*\[\s*{\s*name:\s*([^,]+),\s*team:\s*([^,]+),/g,
  replace: 'standoutPlayers: [{ playerName: $1, teamName: $2,',
  desc: 'Update rink-reports standoutPlayers structure'
};

const before = content;
content = content.replace(rinkReportPattern.search, rinkReportPattern.replace);
if (content !== before) {
  const matches = (before.match(rinkReportPattern.search) || []).length;
  changes += matches;
  console.log(`✅ ${rinkReportPattern.desc}: ${matches} instances`);
}

console.log(`\n📊 Total backend changes: ${changes}`);

if (changes > 0) {
  fs.writeFileSync(serverPath, content);
  console.log('✅ Backend standardization complete');
} else {
  console.log('✅ Backend already standardized');
}

process.exit(0);
