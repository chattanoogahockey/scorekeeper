import OpenAI from 'openai';

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Generate professional roller hockey goal announcement using OpenAI
 */
export async function generateGoalAnnouncement(goalData, playerStats = null) {
  try {
    const { 
      playerName, 
      teamName, 
      period, 
      timeRemaining, 
      assistedBy = [], 
      goalType = 'even strength',
      homeScore,
      awayScore,
      homeTeam,
      awayTeam
    } = goalData;

    // Build context for the LLM
    const assistText = assistedBy.length > 0 ? 
      `Assisted by ${assistedBy.join(' and ')}` : 
      'Unassisted';

    const scoreText = teamName === homeTeam ? 
      `${homeTeam} ${homeScore}, ${awayTeam} ${awayScore}` :
      `${awayTeam} ${awayScore}, ${homeTeam} ${homeScore}`;

    const statsText = playerStats ? 
      `This is ${playerName}'s ${playerStats.goalsThisGame + 1}${getOrdinalSuffix(playerStats.goalsThisGame + 1)} goal of the game, and ${playerStats.seasonGoals + 1}${getOrdinalSuffix(playerStats.seasonGoals + 1)} of the season.` :
      '';

    const prompt = `You are a professional roller hockey arena announcer. Create an exciting, energetic goal announcement for the following goal:

Player: ${playerName}
Team: ${teamName} 
Period: ${period}
Time: ${timeRemaining}
Goal Type: ${goalType}
${assistText}
Current Score: ${scoreText}
${statsText}

Write this in the style of a professional roller hockey announcer - be energetic, clear, and exciting. Include the player name prominently, mention assists if any, and build excitement around the goal. Keep it concise but impactful (2-3 sentences max). Do not include any stage directions or formatting - just the announcement text that would be spoken.

Examples of professional roller hockey announcements:
- "GOAL! Scored by number 87, Sidney Crosby! Assisted by Malkin and Letang. That's his 15th of the season and gives Pittsburgh a 3-2 lead!"
- "SCORES! What a snipe by Connor McDavid! Unassisted beauty puts Edmonton up 2-1 in the second period!"

Your announcement:`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "You are a professional roller hockey arena announcer. Create exciting, energetic goal announcements that capture the excitement of live roller hockey."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      max_tokens: 200,
      temperature: 0.8,
    });

    return completion.choices[0].message.content.trim();
  } catch (error) {
    console.error('Error generating goal announcement:', error);
    throw new Error('Failed to generate announcement: ' + error.message);
  }
}

/**
 * Generate scoreless game commentary
 */
export async function generateScorelessCommentary(gameData) {
  try {
    const { homeTeam, awayTeam, period } = gameData;

    const prompt = `You are a professional roller hockey announcer during a scoreless game between ${homeTeam} and ${awayTeam}. We're in period ${period} and it's still 0-0. Generate exciting commentary about:

- The defensive battle happening
- Goaltending performances 
- Key saves or plays
- Building tension of a tight game
- Historical context about these teams if possible

Keep it engaging and create excitement even without goals. 2-3 sentences max. Sound like a real roller hockey announcer building drama.

Your commentary:`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system", 
          content: "You are a professional roller hockey announcer who can make even scoreless games exciting with your commentary about defensive play, goaltending, and game tension."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      max_tokens: 150,
      temperature: 0.9,
    });

    return completion.choices[0].message.content.trim();
  } catch (error) {
    console.error('Error generating scoreless commentary:', error);
    throw new Error('Failed to generate commentary: ' + error.message);
  }
}

/**
 * Generate goal feed description for game feed
 */
export async function generateGoalFeedDescription(goalData, playerStats = null) {
  try {
    const { 
      playerName, 
      teamName,
      assistedBy = [],
      goalType = 'even strength'
    } = goalData;

    const assistText = assistedBy.length > 0 ? `, assisted by ${assistedBy.join(' and ')}` : '';
    const goalsThisGame = playerStats?.goalsThisGame || 0;
    const seasonGoals = playerStats?.seasonGoals || 0;

    const prompt = `Create a brief 1-2 sentence roller hockey goal description for a game feed. Be concise but informative:

Player: ${playerName}
Team: ${teamName}
Goal Type: ${goalType}
${assistedBy.length > 0 ? `Assists: ${assistedBy.join(', ')}` : 'Unassisted'}
Goals this game: ${goalsThisGame + 1}
Season goals: ${seasonGoals + 1}

Write like a sports ticker or game feed - professional but brief. Focus on the player's performance.

Example: "Steven Howell with the 2nd of the night for his sixth on the season"

Your description:`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "You are writing brief, professional roller hockey goal descriptions for a game feed. Be concise and informative."
        },
        {
          role: "user", 
          content: prompt
        }
      ],
      max_tokens: 50,
      temperature: 0.7,
    });

    return completion.choices[0].message.content.trim();
  } catch (error) {
    console.error('Error generating goal feed description:', error);
    // Fallback to simple description
    const goals = playerStats ? playerStats.goalsThisGame + 1 : 1;
    const season = playerStats ? playerStats.seasonGoals + 1 : 1;
    return `${playerName} scores ${goals > 1 ? `his ${goals}${getOrdinalSuffix(goals)} of the game` : ''} for goal #${season} on the season`;
  }
}

/**
 * Generate penalty feed description
 */
export async function generatePenaltyFeedDescription(penaltyData) {
  try {
    const {
      penalizedPlayer,
      team,
      penaltyType,
      period,
      timeRemaining
    } = penaltyData;

    const prompt = `Create a brief 1-2 sentence penalty description for a roller hockey game feed:

Player: ${penalizedPlayer}
Team: ${team}
Penalty: ${penaltyType}
Period: ${period}
Time: ${timeRemaining}

Write like a sports ticker - professional and brief.

Example: "Jones heads to the box for interference, putting his team shorthanded"

Your description:`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "You are writing brief, professional roller hockey penalty descriptions for a game feed."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      max_tokens: 50,
      temperature: 0.7,
    });

    return completion.choices[0].message.content.trim();
  } catch (error) {
    console.error('Error generating penalty feed description:', error);
    return `${penalizedPlayer} called for ${penaltyType}`;
  }
}

/**
 * Generate professional roller hockey penalty announcement using OpenAI
 */
export async function generatePenaltyAnnouncement(penaltyData, gameContext = null) {
  try {
    const { 
      playerName, 
      teamName, 
      penaltyType, 
      period, 
      timeRemaining, 
      length = 2
    } = penaltyData;

    const { homeTeam, awayTeam, currentScore } = gameContext || {};

    const prompt = `You are a professional roller hockey arena announcer. Create a clear, authoritative penalty announcement for the following penalty:

Player: ${playerName}
Team: ${teamName}
Penalty: ${penaltyType}
Period: ${period}
Time: ${timeRemaining}
Penalty Length: ${length} minutes
${gameContext ? `Score: ${homeTeam} ${currentScore?.home || 0}, ${awayTeam} ${currentScore?.away || 0}` : ''}

Write this in the style of a professional hockey announcer - be clear, authoritative, and professional. State the penalty clearly and include the time. Keep it concise and official sounding (1-2 sentences). Do not include any stage directions or formatting - just the announcement text that would be spoken.

Examples:
- "Number 14, John Smith, two minutes for tripping"
- "Interference penalty to Jake Wilson, that's two minutes in the box"`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "You are a professional hockey arena announcer making penalty calls."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      max_tokens: 50,
      temperature: 0.7,
    });

    return completion.choices[0].message.content.trim();
  } catch (error) {
    console.error('Error generating penalty announcement:', error);
    return `${playerName}, ${length} minutes for ${penaltyType}`;
  }
}

/**
 * Helper function to get ordinal suffix (1st, 2nd, 3rd, etc.)
 */
function getOrdinalSuffix(num) {
  const j = num % 10;
  const k = num % 100;
  
  if (j === 1 && k !== 11) return 'st';
  if (j === 2 && k !== 12) return 'nd';
  if (j === 3 && k !== 13) return 'rd';
  return 'th';
}

export default {
  generateGoalAnnouncement,
  generateScorelessCommentary,
  generateGoalFeedDescription,
  generatePenaltyFeedDescription,
  generatePenaltyAnnouncement
};
