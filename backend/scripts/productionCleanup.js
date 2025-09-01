#!/usr/bin/env node

/**
 * Final Production Cleanup
 * 
 * Remove all remaining fallback logic for old field names
 */

import { readFileSync, writeFileSync } from 'fs';
import path from 'path';

const serverFilePath = path.join(process.cwd(), 'server.js');

console.log('🧹 FINAL PRODUCTION CLEANUP\n');
console.log('Removing all remaining fallback logic for old field names...\n');

try {
  let content = readFileSync(serverFilePath, 'utf8');
  let changeCount = 0;
  
  // Remove fallback logic patterns
  const patterns = [
    // Player name fallbacks
    { 
      pattern: /playerName \|\| g\.scorer/g, 
      replacement: 'playerName',
      description: 'goal player name fallbacks'
    },
    { 
      pattern: /g\.playerName \|\| g\.scorer/g, 
      replacement: 'g.playerName',
      description: 'goal playerName fallbacks'
    },
    { 
      pattern: /playerName \|\| lastGoal\.scorer/g, 
      replacement: 'playerName',
      description: 'last goal player fallbacks'
    },
    { 
      pattern: /lastGoal\.playerName \|\| lastGoal\.scorer/g, 
      replacement: 'lastGoal.playerName',
      description: 'last goal playerName fallbacks'
    },
    { 
      pattern: /recentGoal\.playerName \|\| recentGoal\.scorer \|\| 'a player'/g, 
      replacement: "recentGoal.playerName || 'a player'",
      description: 'recent goal player fallbacks'
    },
    { 
      pattern: /goal\.playerName \|\| goal\.scorer/g, 
      replacement: 'goal.playerName',
      description: 'generic goal player fallbacks'
    },
    { 
      pattern: /p\.playerName \|\| p\.penalizedPlayer/g, 
      replacement: 'p.playerName',
      description: 'penalty player fallbacks'
    },
    
    // Team name fallbacks
    { 
      pattern: /g\.playerName \|\| g\.scorer \|\| null/g, 
      replacement: 'g.playerName',
      description: 'goal player with null fallback'
    },
    
    // Query parameter fixes
    { 
      pattern: /c\.scorer = @playerId/g, 
      replacement: 'c.playerName = @playerId',
      description: 'query parameter scorer references'
    },
    
    // Legacy field comments cleanup
    { 
      pattern: /\/\/ Legacy fields removed \(scoringTeam, scorer, assists, time\) now normalized via \/api\/admin\/normalize-events/g, 
      replacement: '// Fields standardized: playerName, teamName, timeRemaining, length',
      description: 'legacy field comments'
    },
    { 
      pattern: /\/\/ Legacy fields removed \(penalizedTeam, penalizedPlayer, penaltyLength, time\) now normalized via \/api\/admin\/normalize-events/g, 
      replacement: '// Fields standardized: playerName, teamName, timeRemaining, length',
      description: 'legacy penalty field comments'
    },
  ];
  
  patterns.forEach(({ pattern, replacement, description }) => {
    const matches = content.match(pattern);
    if (matches) {
      content = content.replace(pattern, replacement);
      changeCount += matches.length;
      console.log(`✅ Updated ${matches.length} ${description}`);
    }
  });
  
  // Write the cleaned content
  if (changeCount > 0) {
    writeFileSync(serverFilePath, content, 'utf8');
    console.log(`\n🎉 Successfully cleaned up ${changeCount} remaining fallback references`);
  } else {
    console.log('ℹ️  No fallback references found to clean up');
  }
  
} catch (error) {
  console.error('❌ Cleanup failed:', error.message);
  process.exit(1);
}

console.log('\n✨ Production cleanup complete! Server.js is now pristine.');
