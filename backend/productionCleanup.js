import fs from 'fs';

const serverPath = './server.js';
let content = fs.readFileSync(serverPath, 'utf8');

console.log('🧹 PRODUCTION CLEANUP - Removing fallback logic');

// Track changes
let changes = 0;

// Remove fallback patterns
const patterns = [
  // assistedBy fallbacks
  {
    search: /assistedBy: ([^.]+)\.assistedBy \|\| \1\.assists \|\| \[\]/g,
    replace: 'assistedBy: $1.assistedBy || []'
  },
  // playerName fallbacks (if any remain)
  {
    search: /playerName: ([^.]+)\.playerName \|\| \1\.scorer/g,
    replace: 'playerName: $1.playerName'
  },
  {
    search: /([^.]+)\.playerName \|\| \1\.penalizedPlayer/g,
    replace: '$1.playerName'
  },
  // Generic scorer references in comments or variable names
  {
    search: /const scorer = ([^.]+)\.playerName \|\| 'a player'/g,
    replace: 'const scorer = $1.playerName || \'a player\''
  }
];

patterns.forEach(({ search, replace }) => {
  const before = content;
  content = content.replace(search, replace);
  if (content !== before) {
    const matches = (before.match(search) || []).length;
    changes += matches;
    console.log(`  ✅ Fixed ${matches} instances of fallback pattern`);
  }
});

console.log(`\n📊 Total changes: ${changes}`);

if (changes > 0) {
  fs.writeFileSync(serverPath, content);
  console.log('✅ server.js cleaned for production');
} else {
  console.log('✅ server.js already clean');
}

process.exit(0);
