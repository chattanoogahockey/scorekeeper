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
 * Generate dual announcer conversation for goal announcements
 * Features snarky male announcer from NY and optimistic female announcer
 */
export async function generateDualGoalAnnouncement(goalData, playerStats = null) {
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

    const assistText = assistedBy.length > 0 ? 
      `Assisted by ${assistedBy.join(' and ')}` : 
      'Unassisted';

    const scoreText = teamName === homeTeam ? 
      `${homeTeam} ${homeScore}, ${awayTeam} ${awayScore}` :
      `${awayTeam} ${awayScore}, ${homeTeam} ${homeScore}`;

    const prompt = `Create a realistic 6-line conversation between two hockey announcers about this goal. Alternate male/female, ending on female.

GOAL DETAILS:
- Player: ${playerName}
- Team: ${teamName}
- Period: ${period}
- Time: ${timeRemaining}
- Goal Type: ${goalType}
- ${assistText}
- Score: ${scoreText}

ANNOUNCER PERSONALITIES:

MALE ANNOUNCER (starts first):
- From New York, professional, deep voice, less snark, more classic sports announcer
- Rangers fan, hates Islanders
- Slightly cranky but professional
- Uses dry humor and strong opinions

FEMALE ANNOUNCER:
- Optimistic and cheerful
- Loves all teams, slight Red Wings preference  
- Balances male's snark with positivity
- Teases him lightly when he gets cranky

CONVERSATION RULES:
- Exactly 6 lines total (3 each, alternating male-female-male-female-male-female)
- Keep each line to 1-2 sentences max
- Sound like real announcers, not scripted
- Male starts with goal call, female responds
- Include the goal details naturally
- Show their personalities clearly

FORMAT: Return ONLY a JSON array like:
[
  {"speaker": "male", "text": "Line 1 here"},
  {"speaker": "female", "text": "Line 2 here"},
  {"speaker": "male", "text": "Line 3 here"},
  {"speaker": "female", "text": "Line 4 here"},
  {"speaker": "male", "text": "Line 5 here"},
  {"speaker": "female", "text": "Line 6 here"}
]`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "You are creating realistic hockey announcer conversations. Return ONLY valid JSON with the exact format requested. No additional text or formatting."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      max_tokens: 400,
      temperature: 0.9,
    });

    const conversationText = completion.choices[0].message.content.trim();
    
    // Parse the JSON response
    try {
      const conversation = JSON.parse(conversationText);
      if (Array.isArray(conversation) && conversation.length === 6) {
        return conversation;
      } else {
        throw new Error('Invalid conversation format');
      }
    } catch (parseError) {
      console.error('Failed to parse dual announcer conversation:', parseError);
      // Fallback to simple conversation
      return [
        {"speaker": "male", "text": `GOAL! ${playerName} scores for ${teamName}!`},
        {"speaker": "female", "text": `What a shot! That's his ${(playerStats?.goalsThisGame || 0) + 1} of the game!`},
        {"speaker": "male", "text": `${assistText}. Pretty solid play there.`},
        {"speaker": "female", "text": `The crowd is on their feet! ${scoreText} now.`},
        {"speaker": "male", "text": `Not bad for a ${goalType} goal.`},
        {"speaker": "female", "text": `Hockey at its finest! What an exciting game!`}
      ];
    }
  } catch (error) {
    console.error('Error generating dual goal announcement:', error);
    throw new Error('Failed to generate dual announcer conversation: ' + error.message);
  }
}

/**
 * Generate dual announcer conversation for penalty announcements
 */
export async function generateDualPenaltyAnnouncement(penaltyData, gameContext = null) {
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

    const prompt = `Create a realistic 4-line conversation between two hockey announcers about this penalty. Alternate male/female, ending on female.

PENALTY DETAILS:
- Player: ${playerName}
- Team: ${teamName}
- Penalty: ${penaltyType}
- Period: ${period}
- Time: ${timeRemaining}
- Length: ${length} minutes
${gameContext ? `- Score: ${homeTeam} ${currentScore?.home || 0}, ${awayTeam} ${currentScore?.away || 0}` : ''}

ANNOUNCER PERSONALITIES (same as before):

MALE ANNOUNCER (starts first):
- From New York, professional, deep voice, less snark, more classic sports announcer
- Rangers fan, hates Islanders  
- Slightly cranky but professional

FEMALE ANNOUNCER:
- Optimistic and cheerful
- Loves all teams, slight Red Wings preference
- Balances male's snark with positivity

CONVERSATION RULES:
- Exactly 4 lines total (2 each, alternating male-female-male-female)
- Keep each line to 1-2 sentences max
- Male announces penalty, female responds
- Show their personalities clearly
- Sound natural and conversational

FORMAT: Return ONLY a JSON array like:
[
  {"speaker": "male", "text": "Line 1 here"},
  {"speaker": "female", "text": "Line 2 here"},
  {"speaker": "male", "text": "Line 3 here"},
  {"speaker": "female", "text": "Line 4 here"}
]`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "You are creating realistic hockey announcer conversations about penalties. Return ONLY valid JSON with the exact format requested."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      max_tokens: 300,
      temperature: 0.8,
    });

    const conversationText = completion.choices[0].message.content.trim();
    
    try {
      const conversation = JSON.parse(conversationText);
      if (Array.isArray(conversation) && conversation.length === 4) {
        return conversation;
      } else {
        throw new Error('Invalid conversation format');
      }
    } catch (parseError) {
      console.error('Failed to parse dual penalty conversation:', parseError);
      // Fallback conversation
      return [
        {"speaker": "male", "text": `${playerName}, ${length} minutes for ${penaltyType}.`},
        {"speaker": "female", "text": `That's going to put ${teamName} on the penalty kill.`},
        {"speaker": "male", "text": `Looked like a good call to me. Can't do that.`},
        {"speaker": "female", "text": `Great opportunity for the power play unit!`}
      ];
    }
  } catch (error) {
    console.error('Error generating dual penalty announcement:', error);
    throw new Error('Failed to generate dual penalty conversation: ' + error.message);
  }
}

/**
 * Generate dual announcer random commentary conversation
 * This is the main feature - an AI-driven conversation starter that leads to freeform dialogue
 */
export async function generateDualRandomCommentary(gameId, gameContext = {}) {
  try {
    // First, generate a conversation starter based on analytics/context
    const starterPrompt = `Create a conversation starter for two hockey announcers during a break in the action. Base it on realistic hockey context.

CONTEXT: ${JSON.stringify(gameContext, null, 2)}

Generate a single opening line from the MALE announcer that could lead to interesting discussion. Topics could include:
- Player performance (hot/cold streaks)
- Team standings or recent games
- Historical matchups
- Hockey trivia or facts
- Current game situation

MALE ANNOUNCER PERSONALITY:
- From New York, snarky and sarcastic
- Rangers fan, hates Islanders
- Has strong opinions about East Coast teams
- Slightly cranky but knowledgeable

Return just the opening line text, no JSON or formatting.`;

    const starterCompletion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "You are a snarky male hockey announcer from New York. Generate realistic conversation starters during hockey broadcasts."
        },
        {
          role: "user",
          content: starterPrompt
        }
      ],
      max_tokens: 150,
      temperature: 0.9,
    });

    const conversationStarter = starterCompletion.choices[0].message.content.trim();

    // Now generate the full 10-line conversation starting with that opener
    const conversationPrompt = `Continue this hockey announcer conversation for exactly 10 lines total (5 each, alternating male-female). Start with the given opener.

OPENER: "${conversationStarter}"

PERSONALITIES:

MALE ANNOUNCER:
- From New York, snarky and sarcastic  
- Rangers fan, hates Islanders
- Slightly cranky, strong opinions on East Coast teams
- Uses dry humor

FEMALE ANNOUNCER:
- Optimistic and cheerful
- Loves all teams, slight Red Wings preference
- Balances his snark with positivity and fun facts
- Teases him lightly when he gets cranky

RULES:
- Exactly 10 lines (5 each, alternating starting with male)
- Keep each line to 1-2 sentences max
- Sound like a natural conversation between broadcast partners
- Female should respond to male's topics but add her own perspective
- Include their personalities clearly
- End on a positive note from the female announcer

FORMAT: Return ONLY a JSON array starting with the opener:
[
  {"speaker": "male", "text": "${conversationStarter}"},
  {"speaker": "female", "text": "Response here"},
  ...continue for 8 more lines...
]`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "You are creating a realistic 10-line hockey announcer conversation. Return ONLY valid JSON with exactly 10 lines alternating male-female."
        },
        {
          role: "user",
          content: conversationPrompt
        }
      ],
      max_tokens: 600,
      temperature: 0.9,
    });

    const conversationText = completion.choices[0].message.content.trim();
    
    try {
      const conversation = JSON.parse(conversationText);
      if (Array.isArray(conversation) && conversation.length === 10) {
        return conversation;
      } else {
        throw new Error('Invalid conversation length');
      }
    } catch (parseError) {
      console.error('Failed to parse dual random conversation:', parseError);
      // Fallback to a basic conversation
      return [
        {"speaker": "male", "text": conversationStarter},
        {"speaker": "female", "text": "Oh, I love talking hockey! What do you think about the pace of this game?"},
        {"speaker": "male", "text": "It's alright. Could use more hitting, but that's just me."},
        {"speaker": "female", "text": "The skill level is incredible though! These players are so talented."},
        {"speaker": "male", "text": "True. Still prefer the old days when the Rangers actually won something."},
        {"speaker": "female", "text": "Come on, every team has their ups and downs! That's what makes hockey great."},
        {"speaker": "male", "text": "Easy for you to say. Your Red Wings had their dynasty."},
        {"speaker": "female", "text": "And they earned it! Just like every championship team does."},
        {"speaker": "male", "text": "I suppose. Still waiting for my turn though."},
        {"speaker": "female", "text": "That's the beauty of hockey - anything can happen! Hope springs eternal!"}
      ];
    }
  } catch (error) {
    console.error('Error generating dual random commentary:', error);
    throw new Error('Failed to generate dual random conversation: ' + error.message);
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
  generatePenaltyAnnouncement,
  generateDualGoalAnnouncement,
  generateDualPenaltyAnnouncement,
  generateDualRandomCommentary
};
