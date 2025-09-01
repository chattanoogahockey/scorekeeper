#!/usr/bin/env node

/**
 * Update Backend Code Field References
 * 
 * This script updates all remaining references to old field names in the backend code
 */

import { readFileSync, writeFileSync } from 'fs';
import path from 'path';

const serverFilePath = path.join(process.cwd(), 'server.js');

console.log('🔧 UPDATING BACKEND FIELD REFERENCES\n');

try {
  let content = readFileSync(serverFilePath, 'utf8');
  let changeCount = 0;
  
  // Track all changes
  const changes = [];
  
  // Update goal filtering references (homeTeam scoring)
  const homeGoalPattern = /g\.teamName \|\| g\.scoringTeam.*=== game\.homeTeam/g;
  const homeGoalMatches = content.match(homeGoalPattern);
  if (homeGoalMatches) {
    content = content.replace(homeGoalPattern, 'g.teamName === game.homeTeam');
    changeCount += homeGoalMatches.length;
    changes.push(`Updated ${homeGoalMatches.length} home goal filtering references`);
  }
  
  // Update goal filtering references (awayTeam scoring)
  const awayGoalPattern = /g\.teamName \|\| g\.scoringTeam.*=== game\.awayTeam/g;
  const awayGoalMatches = content.match(awayGoalPattern);
  if (awayGoalMatches) {
    content = content.replace(awayGoalPattern, 'g.teamName === game.awayTeam');
    changeCount += awayGoalMatches.length;
    changes.push(`Updated ${awayGoalMatches.length} away goal filtering references`);
  }
  
  // Update penalty field references in announcements
  const penaltyPlayerPattern = /playerName: lastPenalty\.playerName \|\| lastPenalty\.penalizedPlayer/g;
  const penaltyPlayerMatches = content.match(penaltyPlayerPattern);
  if (penaltyPlayerMatches) {
    content = content.replace(penaltyPlayerPattern, 'playerName: lastPenalty.playerName');
    changeCount += penaltyPlayerMatches.length;
    changes.push(`Updated ${penaltyPlayerMatches.length} penalty player announcement references`);
  }
  
  const penaltyTeamPattern = /teamName: lastPenalty\.teamName \|\| lastPenalty\.penalizedTeam/g;
  const penaltyTeamMatches = content.match(penaltyTeamPattern);
  if (penaltyTeamMatches) {
    content = content.replace(penaltyTeamPattern, 'teamName: lastPenalty.teamName');
    changeCount += penaltyTeamMatches.length;
    changes.push(`Updated ${penaltyTeamMatches.length} penalty team announcement references`);
  }
  
  const penaltyLengthPattern = /lastPenalty\.length \|\| lastPenalty\.penaltyLength/g;
  const penaltyLengthMatches = content.match(penaltyLengthPattern);
  if (penaltyLengthMatches) {
    content = content.replace(penaltyLengthPattern, 'lastPenalty.length');
    changeCount += penaltyLengthMatches.length;
    changes.push(`Updated ${penaltyLengthMatches.length} penalty length references`);
  }
  
  const penaltyTimePattern = /lastPenalty\.timeRemaining \|\| lastPenalty\.time/g;
  const penaltyTimeMatches = content.match(penaltyTimePattern);
  if (penaltyTimeMatches) {
    content = content.replace(penaltyTimePattern, 'lastPenalty.timeRemaining');
    changeCount += penaltyTimeMatches.length;
    changes.push(`Updated ${penaltyTimeMatches.length} penalty time references`);
  }
  
  // Update aggregation logic for goals by team
  const goalAggPattern = /goalsByTeam: goals\.reduce\(\(acc, goal\) => \{\s*acc\[goal\.scoringTeam\] = \(acc\[goal\.scoringTeam\] \|\| 0\) \+ 1;/g;
  const goalAggMatches = content.match(goalAggPattern);
  if (goalAggMatches) {
    content = content.replace(goalAggPattern, 'goalsByTeam: goals.reduce((acc, goal) => {\n          acc[goal.teamName] = (acc[goal.teamName] || 0) + 1;');
    changeCount += goalAggMatches.length;
    changes.push(`Updated ${goalAggMatches.length} goal aggregation references`);
  }
  
  // Update aggregation logic for penalties by team
  const penaltyAggPattern = /penaltiesByTeam: penalties\.reduce\(\(acc, penalty\) => \{\s*acc\[penalty\.penalizedTeam\] = \(acc\[penalty\.penalizedTeam\] \|\| 0\) \+ 1;/g;
  const penaltyAggMatches = content.match(penaltyAggPattern);
  if (penaltyAggMatches) {
    content = content.replace(penaltyAggPattern, 'penaltiesByTeam: penalties.reduce((acc, penalty) => {\n          acc[penalty.teamName] = (acc[penalty.teamName] || 0) + 1;');
    changeCount += penaltyAggMatches.length;
    changes.push(`Updated ${penaltyAggMatches.length} penalty aggregation references`);
  }
  
  // Update PIM calculation references
  const pimPattern = /p\.length \|\| p\.penaltyLength \|\| 0/g;
  const pimMatches = content.match(pimPattern);
  if (pimMatches) {
    content = content.replace(pimPattern, 'p.length || 0');
    changeCount += pimMatches.length;
    changes.push(`Updated ${pimMatches.length} PIM calculation references`);
  }
  
  // Update query parameter references for old field names
  const queryPenalizedTeamPattern = /c\.penalizedTeam = @team/g;
  const queryPenalizedTeamMatches = content.match(queryPenalizedTeamPattern);
  if (queryPenalizedTeamMatches) {
    content = content.replace(queryPenalizedTeamPattern, 'c.teamName = @team');
    changeCount += queryPenalizedTeamMatches.length;
    changes.push(`Updated ${queryPenalizedTeamMatches.length} query parameter references for team`);
  }
  
  const queryPenalizedPlayerPattern = /c\.penalizedPlayer = @playerId/g;
  const queryPenalizedPlayerMatches = content.match(queryPenalizedPlayerPattern);
  if (queryPenalizedPlayerMatches) {
    content = content.replace(queryPenalizedPlayerPattern, 'c.playerName = @playerId');
    changeCount += queryPenalizedPlayerMatches.length;
    changes.push(`Updated ${queryPenalizedPlayerMatches.length} query parameter references for player`);
  }
  
  // Update stats calculation fallbacks
  const statsGoalPattern = /name = g\.playerName \|\| g\.scorer;/g;
  const statsGoalMatches = content.match(statsGoalPattern);
  if (statsGoalMatches) {
    content = content.replace(statsGoalPattern, 'name = g.playerName;');
    changeCount += statsGoalMatches.length;
    changes.push(`Updated ${statsGoalMatches.length} stats calculation goal references`);
  }
  
  const statsPenaltyPattern = /name = p\.playerName \|\| p\.penalizedPlayer;/g;
  const statsPenaltyMatches = content.match(statsPenaltyPattern);
  if (statsPenaltyMatches) {
    content = content.replace(statsPenaltyPattern, 'name = p.playerName;');
    changeCount += statsPenaltyMatches.length;
    changes.push(`Updated ${statsPenaltyMatches.length} stats calculation penalty references`);
  }
  
  // Update team total calculations
  const teamGoalTotalPattern = /for \(const goal of gameGoals\) \{\s*const t = goal\.teamName \|\| goal\.scoringTeam \|\| 'Unknown';/g;
  const teamGoalTotalMatches = content.match(teamGoalTotalPattern);
  if (teamGoalTotalMatches) {
    content = content.replace(teamGoalTotalPattern, "for (const goal of gameGoals) {\n        const t = goal.teamName || 'Unknown';");
    changeCount += teamGoalTotalMatches.length;
    changes.push(`Updated ${teamGoalTotalMatches.length} team goal total calculations`);
  }
  
  const teamPenaltyTotalPattern = /for \(const pen of gamePens\) \{\s*const t = pen\.teamName \|\| pen\.penalizedTeam \|\| 'Unknown';/g;
  const teamPenaltyTotalMatches = content.match(teamPenaltyTotalPattern);
  if (teamPenaltyTotalMatches) {
    content = content.replace(teamPenaltyTotalPattern, "for (const pen of gamePens) {\n        const t = pen.teamName || 'Unknown';");
    changeCount += teamPenaltyTotalMatches.length;
    changes.push(`Updated ${teamPenaltyTotalMatches.length} team penalty total calculations`);
  }
  
  // Update normalization endpoints to remove conditional logic
  const normalizeGoalsPattern = /if \(!g\.playerName && g\.scorer\) \{ g\.playerName = g\.scorer; changed = true; \}/g;
  const normalizeGoalsMatches = content.match(normalizeGoalsPattern);
  if (normalizeGoalsMatches) {
    content = content.replace(normalizeGoalsPattern, '// Field already standardized - scorer field removed');
    changeCount += normalizeGoalsMatches.length;
    changes.push(`Updated ${normalizeGoalsMatches.length} goal normalization logic`);
  }
  
  const normalizePenaltiesPattern = /if \(!p\.playerName && p\.penalizedPlayer\) \{ p\.playerName = p\.penalizedPlayer; changed = true; \}/g;
  const normalizePenaltiesMatches = content.match(normalizePenaltiesPattern);
  if (normalizePenaltiesMatches) {
    content = content.replace(normalizePenaltiesPattern, '// Field already standardized - penalizedPlayer field removed');
    changeCount += normalizePenaltiesMatches.length;
    changes.push(`Updated ${normalizePenaltiesMatches.length} penalty normalization logic`);
  }
  
  // Write the updated content back to the file
  if (changeCount > 0) {
    writeFileSync(serverFilePath, content, 'utf8');
    
    console.log(`✅ Successfully updated ${changeCount} field references in server.js\n`);
    console.log('📋 Changes made:');
    changes.forEach((change, index) => {
      console.log(`   ${index + 1}. ${change}`);
    });
  } else {
    console.log('ℹ️  No field references needed updating');
  }
  
} catch (error) {
  console.error('❌ Error updating field references:', error.message);
  process.exit(1);
}

console.log('\n🎉 Backend code field references updated successfully!');
