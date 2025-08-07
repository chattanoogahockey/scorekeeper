#!/usr/bin/env node

/**
 * Test script for dual announcer functionality
 * This tests the core AI conversation generation without requiring a full server setup
 */

import { generateDualGoalAnnouncement, generateDualPenaltyAnnouncement, generateDualRandomCommentary } from './announcerService.js';

async function testDualAnnouncers() {
  console.log('🎤 Testing Dual Announcer Functionality\n');

  try {
    // Test dual goal announcement
    console.log('1️⃣ Testing Dual Goal Announcement...');
    const goalData = {
      playerName: 'Connor McDavid',
      teamName: 'Edmonton Oilers',
      period: 2,
      timeRemaining: '15:30',
      assistedBy: ['Leon Draisaitl'],
      goalType: 'power play',
      homeScore: 2,
      awayScore: 1,
      homeTeam: 'Edmonton Oilers',
      awayTeam: 'Calgary Flames'
    };

    const playerStats = {
      goalsThisGame: 1,
      seasonGoals: 15
    };

    const goalConversation = await generateDualGoalAnnouncement(goalData, playerStats);
    console.log('✅ Goal conversation generated:');
    goalConversation.forEach((line, index) => {
      console.log(`   ${index + 1}. ${line.speaker.toUpperCase()}: "${line.text}"`);
    });
    console.log();

    // Test dual penalty announcement
    console.log('2️⃣ Testing Dual Penalty Announcement...');
    const penaltyData = {
      playerName: 'Brad Marchand',
      teamName: 'Boston Bruins',
      penaltyType: 'slashing',
      period: 1,
      timeRemaining: '8:45',
      length: 2
    };

    const gameContext = {
      homeTeam: 'Boston Bruins',
      awayTeam: 'New York Rangers',
      currentScore: { home: 0, away: 1 }
    };

    const penaltyConversation = await generateDualPenaltyAnnouncement(penaltyData, gameContext);
    console.log('✅ Penalty conversation generated:');
    penaltyConversation.forEach((line, index) => {
      console.log(`   ${index + 1}. ${line.speaker.toUpperCase()}: "${line.text}"`);
    });
    console.log();

    // Test dual random commentary
    console.log('3️⃣ Testing Dual Random Commentary...');
    const randomGameContext = {
      gameId: 'test-game-123',
      homeTeam: 'New York Rangers',
      awayTeam: 'New York Islanders',
      division: 'Gold',
      goalsCount: 5,
      penaltiesCount: 3,
      currentScore: { home: 3, away: 2 }
    };

    const randomConversation = await generateDualRandomCommentary('test-game-123', randomGameContext);
    console.log('✅ Random commentary conversation generated:');
    randomConversation.forEach((line, index) => {
      console.log(`   ${index + 1}. ${line.speaker.toUpperCase()}: "${line.text}"`);
    });
    console.log();

    console.log('🎉 All dual announcer tests completed successfully!');
    console.log('\n📋 Summary:');
    console.log(`   • Goal conversation: ${goalConversation.length} lines`);
    console.log(`   • Penalty conversation: ${penaltyConversation.length} lines`);
    console.log(`   • Random conversation: ${randomConversation.length} lines`);
    console.log('\n✨ Dual announcer feature is ready to use!');

  } catch (error) {
    console.error('❌ Dual announcer test failed:', error);
    console.error('Make sure you have:');
    console.error('   • OPENAI_API_KEY environment variable set');
    console.error('   • OpenAI package installed (npm install openai)');
    console.error('   • Internet connection for API calls');
    process.exit(1);
  }
}

// Run the test if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testDualAnnouncers();
}

export { testDualAnnouncers };
