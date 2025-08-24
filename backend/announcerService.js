import OpenAI from 'openai';
import logger from './logger.js';

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Hockey Time Understanding Utility
 * In hockey, periods count DOWN to zero. There are 3 periods.
 * Example: 00:26 in Period 1 is LATER in the game than 16:00 in Period 1
 * Period 3 at 00:26 is MUCH later than Period 1 at 00:26
 */
function calculateGameProgression(period, timeRemaining) {
  // Convert time string (MM:SS) to total seconds
  const [minutes, seconds] = timeRemaining.split(':').map(Number);
  const totalSecondsRemaining = (minutes * 60) + seconds;
  
  // Each period is 20 minutes (1200 seconds)
  const secondsPerPeriod = 20 * 60; // 1200 seconds
  
  // Calculate how much time has elapsed in current period
  const elapsedInCurrentPeriod = secondsPerPeriod - totalSecondsRemaining;
  
  // Calculate total elapsed time in game
  const totalElapsedTime = ((period - 1) * secondsPerPeriod) + elapsedInCurrentPeriod;
  
  // Total game time is 3 periods of 20 minutes each (3600 seconds)
  const totalGameTime = 3 * secondsPerPeriod; // 3600 seconds
  
  // Calculate progression percentage
  const percentage = Math.round((totalElapsedTime / totalGameTime) * 100);
  
  // Determine context based on period and time remaining
  let context, urgency;
  
  if (period === 1) {
    if (totalSecondsRemaining > 600) { // More than 10 minutes left
      context = "early in the first period";
      urgency = "low";
    } else {
      context = "late in the first period";
      urgency = "medium";
    }
  } else if (period === 2) {
    if (totalSecondsRemaining > 600) {
      context = "early in the second period";
      urgency = "medium";
    } else {
      context = "late in the second period";
      urgency = "medium-high";
    }
  } else if (period === 3) {
    if (totalSecondsRemaining > 300) { // More than 5 minutes left
      context = "third period";
      urgency = "high";
    } else {
      context = "crunch time in the third period";
      urgency = "very high";
    }
  }
  
  return {
    percentage,
    context,
    urgency,
    totalElapsedTime,
    totalSecondsRemaining
  };
}

/**
 * Generate professional roller hockey goal announcement using OpenAI
 */
export async function generateGoalAnnouncement(goalData, playerStats = null, voiceGender = 'male') {
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

    // Determine personality based on voice gender
    const personalityPrompt = voiceGender === 'female' ? 
      `You are a professional roller hockey arena announcer named Linda. You are the play-by-play voice in the Scorekeeper app. Create an exciting goal announcement that captures Linda's upbeat, bright, energetic approach to hockey broadcasting.` :
      `You are a professional roller hockey arena announcer named Al. You are the play-by-play voice in the Scorekeeper app. Create an exciting goal announcement that captures Al's natural play-by-play rhythm and delivery.`;

  const styleGuidelines = voiceGender === 'female' ? 
      `**STYLE GUIDELINES (Linda's approach):**
- **Upbeat and energetic**: Bright, warm tone that makes every goal feel electric
- **Confident and conversational**: Clear delivery like she's smiling as she speaks
- **Fan-first excitement**: Genuine enthusiasm for every scoring moment
- **Emotional presence**: Let the joy and excitement come through naturally
- **Never gets jaded**: Every goal matters, every game is important
- **Skill appreciation**: Highlights the talent and effort behind each goal

**OBJECTIVITY / RESTRAINT RULES:**
- Stay factual: who scored, assist(s), time, impact on score, milestone if any.
- Prefer concrete data (score, period context, goal number) over generic hype words.
- Avoid cliche hype adjectives ("massive", "epic", "insane", etc.) unless truly warranted.
- No meme or AI-ish phrases (e.g., "Boom goes the dynamite", "absolute chaos", "electric stuff", "can you believe it?", "what a moment" as filler).
- 1 concise sentence; a second only if clearly adding a stat/milestone.

**PROHIBITED:** catchphrases, memes, internet slang, exaggerated filler, overuse of exclamation marks (max 1). 

**PERSONALITY TRAITS:**
- Joyful and fan-friendly approach to every call
- Believes in comebacks and momentum shifts
- Credits skill, grit, and character
- Upbeat without being over-the-top
- Conversational warmth with professional authority
- Uses roller-specific terms only (no ice hockey references)` :
      `**STYLE GUIDELINES (Al's approach):**
- **Play-by-play lyricist**: The game is the melody—you provide the lyrics
- **Vivid but minimal**: Use clear, concise phrases to match the energy on the rink
- **Spontaneous**: Never sound prewritten. Let the game drive your emotion and reaction
- **Intensity-aware**: Modulate your voice to match the tempo. Build tension naturally
- **Let the moment breathe**: Capture the excitement naturally

**OBJECTIVITY / RESTRAINT RULES:**
- Prioritize facts: scorer, assists, timing, score impact, milestone.
- Avoid fluff, memes, cliches, internet slang, or manufactured hype.
- Do NOT use phrases like "Boom goes the dynamite", "What a moment", "Can you believe it?", "Unreal stuff", or similar.
- 1 concise sentence; second only if adding concrete stat/milestone.
- Single exclamation max.

**PROHIBITED:** Memes, over-the-top catchphrases, AI-sounding filler, needless adjectives.

**PERSONALITY TRAITS:**
- Warm and composed under pressure
- Natural voice of excitement during big plays
- Genuinely optimistic without sounding naïve
- Quick with dry, understated humor when appropriate
- Professional but fan-minded—loves the game and the players`;

    const examples = voiceGender === 'female' ?
      `Examples in Linda style for roller hockey:
- "OH MY! ${playerName} lights the lamp! What a beautiful shot and what a moment!"
- "YES! ${playerName} finds the back of the net! The energy in this rink is incredible!"` :
      `Examples in Al style for roller hockey:
- "He fires—SCORES! ${playerName} gives them the lead with 19 seconds left! Can you believe this place?!"
- "Shot on goal—HE SCORES! ${playerName} with the snipe! What a moment!"`;

    // Calculate game timing context for hockey-aware announcements
    const gameProgression = calculateGameProgression(period, timeRemaining);
    const timingContext = `
IMPORTANT HOCKEY TIMING CONTEXT: 
- In hockey, time counts DOWN from 20:00 to 00:00 each period
- This goal was scored at ${timeRemaining} in period ${period}
- Game progression: ${gameProgression.percentage}% complete
- Timing context: ${gameProgression.context}
- Time urgency: ${gameProgression.urgency}
- A goal at 00:26 happens LATER in the period than 16:00`;

    const prompt = `${personalityPrompt}

Player: ${playerName}
Team: ${teamName} 
Period: ${period}
Time: ${timeRemaining}
Goal Type: ${goalType}
${assistText}
Current Score: ${scoreText}
${statsText}

${timingContext}

${styleGuidelines}

Write this as ${voiceGender === 'female' ? 'Linda' : 'Al'} would call it - be energetic, clear, and exciting. Include the player name prominently, mention assists if any, and build excitement around the goal. Consider the game timing context for appropriate urgency and excitement level. Keep it concise but impactful (1-2 sentences max). Do not include any stage directions or formatting - just the announcement text that would be spoken.

${examples}

Your ${voiceGender === 'female' ? 'Linda' : 'Al'}-style announcement:`;

    const systemContent = voiceGender === 'female' ?
      "You are a professional roller hockey arena announcer named Linda. Use her upbeat, energetic, and warm delivery style with genuine excitement for every goal." :
      "You are a professional roller hockey arena announcer named Al. Use his vivid but minimal play-by-play style, natural excitement, and understated humor to create compelling goal announcements.";

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: systemContent
        },
        {
          role: "user",
          content: prompt
        }
      ],
      max_tokens: 200,
      temperature: 0.8,
    });

  return stripFluff(completion.choices[0].message.content.trim());
  } catch (error) {
    console.error('Error generating goal announcement:', error);
    throw new Error('Failed to generate announcement: ' + error.message);
  }
}

/**
 * Generate scoreless game commentary
 */
export async function generateScorelessCommentary(gameData, voiceGender = 'male') {
  try {
    const { homeTeam, awayTeam, period } = gameData;

    // Determine personality based on voice gender
    const personalityPrompt = voiceGender === 'female' ? 
      `You are a professional roller hockey announcer named Linda. Generate exciting commentary about this scoreless battle with Linda's bright, energetic approach.` :
      `You are a professional roller hockey announcer named Al. Generate commentary about this scoreless game with Al's play-by-play mastery and natural excitement.`;

    const styleGuidelines = voiceGender === 'female' ? 
      `**STYLE GUIDELINES (Linda's approach):**
- **Upbeat energy**: Even scoreless games are exciting with the right perspective
- **Fan-first excitement**: Make viewers appreciate the defensive battle
- **Confident commentary**: Clear delivery that builds anticipation
- **Warm enthusiasm**: Genuine appreciation for both teams' efforts
- **Hockey knowledge**: Highlight the tactical battle and goaltending
- **Never gets jaded**: Every scoreless moment builds toward something special` :
      `**STYLE GUIDELINES (Al's approach):**
- **Build tension naturally**: Let the scoreless drama unfold through your words
- **Vivid but minimal**: Paint the picture without overcomplicating
- **Professional appreciation**: Respect the defensive battle and goaltending
- **Natural anticipation**: Create excitement for the eventual breakthrough
- **Understated authority**: Let the game situation speak through your delivery`;

    const prompt = `${personalityPrompt}

You're covering a scoreless game between ${homeTeam} and ${awayTeam}. We're in period ${period} and it's still 0-0. Generate exciting commentary about:

- The defensive battle happening
- Goaltending performances 
- Key saves or plays
- Building tension of a tight game
- Historical context about these teams if possible

${styleGuidelines}

Keep it engaging and create excitement even without goals. 2-3 sentences max. Sound like ${voiceGender === 'female' ? 'Linda building energy and appreciation for both teams' : 'Al building drama naturally'}.

Your ${voiceGender === 'female' ? 'Linda' : 'Al'}-style commentary:`;

    const systemContent = voiceGender === 'female' ?
      "You are a professional roller hockey announcer named Linda. Use her upbeat, energetic approach to make even scoreless games exciting with genuine enthusiasm and hockey knowledge." :
      "You are a professional roller hockey announcer named Al. Use his tension-building ability and natural excitement to make scoreless games compelling.";

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system", 
          content: systemContent
        },
        {
          role: "user",
          content: prompt
        }
      ],
      max_tokens: 150,
      temperature: 0.9,
    });

  return stripFluff(completion.choices[0].message.content.trim());
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

  return stripFluff(completion.choices[0].message.content.trim());
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

  return stripFluff(completion.choices[0].message.content.trim());
  } catch (error) {
    console.error('Error generating penalty feed description:', error);
    return `${penalizedPlayer} called for ${penaltyType}`;
  }
}

/**
 * Generate professional roller hockey penalty announcement using OpenAI
 */
export async function generatePenaltyAnnouncement(penaltyData, gameContext = null, voiceGender = 'male') {
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

    // Determine personality based on voice gender
    const personalityPrompt = voiceGender === 'female' ? 
      `You are a professional roller hockey arena announcer named Linda. Create a clear, authoritative penalty announcement with Linda's upbeat but professional approach.` :
      `You are a professional roller hockey arena announcer named Al. Create a clear, authoritative penalty announcement for the following penalty:`;

  const styleGuidelines = voiceGender === 'female' ? 
      `**STYLE GUIDELINES (Linda's approach):**
- **Professional but warm**: Clear, authoritative delivery with Linda's signature warmth
- **Confident and conversational**: Matter-of-fact delivery with underlying enthusiasm
- **Fan-first approach**: Explain the call clearly for everyone watching
- **Emotional intelligence**: Balanced reaction appropriate to the situation
- **Never condescending**: Respectful of players while being clear about the penalty
- **Uses roller-specific terms only**: No ice hockey references

**OBJECTIVITY / RESTRAINT RULES:**
- State player, infraction, time, and strategic impact succinctly.
- Avoid hype or dramatic filler (no memes, catchphrases, or internet slang).
- One sentence unless a second adds a specific strategic or statistical fact.
- No exaggerated moralizing; stay professional.

**PERSONALITY TRAITS:**
- Upbeat professionalism even during penalty calls
- Clear communication with underlying hockey knowledge
- Warm authority that keeps the game moving
- Professional but approachable delivery` :
      `**STYLE GUIDELINES (Al's approach):**
- **Play-by-play clarity comes first**: Clear, concise phrases that match the moment
- **Professional but fan-minded**: Loves the game, understands the players
- **Understated authority**: Professional delivery without being overly dramatic
- **Natural rhythm**: Let the call feel spontaneous, not scripted

**OBJECTIVITY / RESTRAINT RULES:**
- State facts only: player, penalty, length, timing, situational impact.
- Avoid clichés ("huge", "massive", "unbelievable") unless literally justified.
- No memes or AI-ish filler ("boom goes the dynamite", etc.).
- Prefer neutral, professional tone; single exclamation max if used.

**PERSONALITY TRAITS:**
- Warm and composed under pressure
- Professional delivery with natural touch
- Clear, authoritative, and professional
- Quick with dry, understated humor when appropriate`;

    const examples = voiceGender === 'female' ?
      `Examples in Linda style:
- "Number 14, John Smith, two minutes for tripping. Clear call by the official."
- "Interference on Jake Wilson, that's a two-minute minor. Good eye by the ref there."` :
      `Examples in Al style:
- "Number 14, John Smith... two minutes for tripping"
- "Interference on Jake Wilson, and that's two minutes"`;

    // Calculate game timing context for hockey-aware announcements
    const penaltyGameProgression = calculateGameProgression(period, timeRemaining);
    const penaltyTimingContext = `
IMPORTANT HOCKEY TIMING CONTEXT: 
- In hockey, time counts DOWN from 20:00 to 00:00 each period
- This penalty occurred at ${timeRemaining} in period ${period}
- Game progression: ${penaltyGameProgression.percentage}% complete
- Timing context: ${penaltyGameProgression.context}
- Time urgency: ${penaltyGameProgression.urgency}
- A penalty at 00:26 happens LATER in the period than 16:00`;

    const prompt = `${personalityPrompt}

Player: ${playerName}
Team: ${teamName}
Penalty: ${penaltyType}
Period: ${period}
Time: ${timeRemaining}
Penalty Length: ${length} minutes
${gameContext ? `Score: ${homeTeam} ${currentScore?.home || 0}, ${awayTeam} ${currentScore?.away || 0}` : ''}

${penaltyTimingContext}

${styleGuidelines}

Write this as ${voiceGender === 'female' ? 'Linda' : 'Al'} would call it - be clear, authoritative, and professional with ${voiceGender === 'female' ? 'her warm but professional' : 'his natural'} touch. State the penalty clearly and include the time. Consider the game timing context for appropriate urgency and tone. Keep it concise and authoritative (1-2 sentences). Do not include any stage directions or formatting - just the announcement text that would be spoken.

${examples}`;

    const systemContent = voiceGender === 'female' ?
      "You are a professional hockey arena announcer named Linda. Use her warm but professional delivery style with clear authority for penalty announcements." :
      "You are a professional hockey arena announcer named Al. Use his clear, authoritative yet natural delivery style for penalty announcements.";

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: systemContent
        },
        {
          role: "user",
          content: prompt
        }
      ],
      max_tokens: 50,
      temperature: 0.7,
    });

  return stripFluff(completion.choices[0].message.content.trim());
  } catch (error) {
    console.error('Error generating penalty announcement:', error);
    return `${playerName}, ${length} minutes for ${penaltyType}`;
  }
}

/**
 * Generate dual announcer conversation for goal announcements
 * Features Al (snarky male announcer from NY) and Linda (optimistic female announcer)
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

    // Calculate game timing context for hockey-aware announcements
    const dualGoalProgression = calculateGameProgression(period, timeRemaining);
    const dualGoalTimingContext = `
IMPORTANT HOCKEY TIMING CONTEXT: 
- In hockey, time counts DOWN from 20:00 to 00:00 each period
- This goal was scored at ${timeRemaining} in period ${period}
- Game progression: ${dualGoalProgression.percentage}% complete
- Timing context: ${dualGoalProgression.context}
- Time urgency: ${dualGoalProgression.urgency}
- A goal at 00:26 happens LATER in the period than 16:00`;

  const prompt = `Create a realistic 4-line conversation between two veteran hockey announcers about this goal. These are seasoned broadcast partners who know each other well and naturally build on each other's commentary. Keep it concise but natural.

STRICT NAMING RULES (CRITICAL):
- The male announcer is ONLY ever referred to as "Al" (never any last name, never other first names or nicknames).
- The female announcer is ONLY ever referred to as "Linda" (never any last name, never other first names like Bob, Lisa, etc.).
- Do NOT invent or insert last names for Al or Linda.
- Do NOT switch their names or refer to either by any other name.

If the model might slip, self-correct silently and output the corrected version.

GOAL DETAILS:
- Player: ${playerName}
- Team: ${teamName}
- Period: ${period}
- Time: ${timeRemaining}
- Goal Type: ${goalType}
- ${assistText}
- Score: ${scoreText}

${dualGoalTimingContext}

ANNOUNCER PERSONALITIES:

AL (Male Announcer):
- Calls the play-by-play with authority and excitement
- Natural conversationalist who sets up his partner for analysis

LINDA (Female Announcer):
- Provides color commentary and analysis
- Builds on Al's observations with her own insights

CONVERSATION DYNAMICS:
- Start with Al's goal call (scripted)
- Linda responds with immediate reaction
- Brief back-and-forth with natural flow
- Sound like broadcast partners who've worked together for years
- Keep it concise but engaging

FORMAT: Return ONLY a JSON array with 4 lines alternating male-female-male-female:
[
  {"speaker": "male", "text": "Initial goal call here"},
  {"speaker": "female", "text": "Immediate reaction"},
  {"speaker": "male", "text": "Follow-up observation"},
  {"speaker": "female", "text": "Analysis or insight"}
]`;

  const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
      role: "system",
  content: "You are creating realistic, natural conversations between veteran hockey broadcast partners named Al and Linda. You MUST ONLY use the first names Al and Linda to identify or reference them, never last names, never other names. Return ONLY valid JSON with exactly 4 alternating lines (male-female-male-female). If the model generates any other name for the announcers, replace it with the correct one before returning."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      max_tokens: 300, // Reduced for faster responses
      temperature: 0.9,
    });

    const conversationText = completion.choices[0].message.content.trim();
    
    // Parse the JSON response
    try {
  const conversation = sanitizeConversation(JSON.parse(conversationText));
  if (Array.isArray(conversation) && conversation.length === 4) {
        return conversation;
      } else {
        throw new Error('Invalid conversation format');
      }
    } catch (parseError) {
      console.error('Failed to parse dual announcer conversation:', parseError);
      // Fallback to enhanced conversation
  return sanitizeConversation([
        {"speaker": "male", "text": `GOAL! ${playerName} scores for ${teamName}!`},
        {"speaker": "female", "text": `What a shot! That's exactly what this team needed!`},
        {"speaker": "male", "text": `The ${assistText.toLowerCase()} really set that up perfectly.`},
    {"speaker": "female", "text": `Great teamwork, and now it's ${scoreText}.`}
  ]);
    }
  } catch (error) {
    console.error('Error generating dual goal announcement:', error);
    // Graceful fallback (4-line) instead of throwing to keep app responsive
    try {
      const { playerName, teamName } = goalData || {};
      return sanitizeConversation([
        { speaker: 'male', text: `Goal on the play for ${teamName}!` },
        { speaker: 'female', text: `${playerName || 'The scorer'} showing great touch there.` },
        { speaker: 'male', text: `That finish changes the tempo.` },
        { speaker: 'female', text: `Absolutely. Momentum swing right now.` }
      ], 'dual-goal-fallback');
    } catch (_) {
      throw new Error('Failed to generate dual announcer conversation: ' + error.message);
    }
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

    // Calculate game timing context for hockey-aware announcements
    const dualPenaltyProgression = calculateGameProgression(period, timeRemaining);
    const dualPenaltyTimingContext = `
IMPORTANT HOCKEY TIMING CONTEXT: 
- In hockey, time counts DOWN from 20:00 to 00:00 each period
- This penalty occurred at ${timeRemaining} in period ${period}
- Game progression: ${dualPenaltyProgression.percentage}% complete
- Timing context: ${dualPenaltyProgression.context}
- Time urgency: ${dualPenaltyProgression.urgency}
- A penalty at 00:26 happens LATER in the period than 16:00`;

  const prompt = `Create a realistic 4-line conversation between two veteran hockey announcers about this penalty. These are seasoned broadcast partners who naturally discuss the call, its impact, and game flow.

STRICT NAMING RULES (CRITICAL):
- The male announcer is ONLY ever referred to as "Al" (no last name, no other names).
- The female announcer is ONLY ever referred to as "Linda" (no last name, never Bob, etc.).
- Do NOT fabricate last names or alternate first names.
- If an incorrect name would appear, correct it silently before output.

PENALTY DETAILS:
- Player: ${playerName}
- Team: ${teamName}
- Penalty: ${penaltyType}
- Period: ${period}
- Time: ${timeRemaining}
- Length: ${length} minutes
${gameContext ? `- Score: ${homeTeam} ${currentScore?.home || 0}, ${awayTeam} ${currentScore?.away || 0}` : ''}

${dualPenaltyTimingContext}

ANNOUNCER PERSONALITIES:

AL (Male Announcer):
- Calls the penalty with authority and context
- Sets up discussion about impact on game flow
- Can question or support referee decisions
- Focuses on timing and strategic implications

LINDA (Female Announcer):
- Provides analysis of the penalty call
- Discusses player discipline and team impact
- Can agree/disagree with Al's assessment
- Brings up power play opportunities or defensive strategies

CONVERSATION DYNAMICS:
- Start with Al's penalty call (factual)
- Linda responds with immediate assessment
- Brief back-and-forth about impact and implications
- Sound like experienced broadcast partners
- Keep it concise but natural

FORMAT: Return ONLY a JSON array with 4 lines alternating male-female-male-female:
[
  {"speaker": "male", "text": "Penalty call here"},
  {"speaker": "female", "text": "Assessment of the call"},
  {"speaker": "male", "text": "Follow-up or context"},
  {"speaker": "female", "text": "Analysis or strategic impact"}
]`;

  const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
      role: "system",
  content: "You are creating realistic, natural conversations between veteran hockey broadcast partners named Al and Linda about penalties. ONLY use 'Al' and 'Linda' as names. No last names, no substitutes. Return ONLY valid JSON with exactly 4 alternating lines (male-female-male-female). Sanitize any accidental other names to the correct ones before returning."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      max_tokens: 300, // Reduced for faster responses
      temperature: 0.8,
    });

    const conversationText = completion.choices[0].message.content.trim();
    
    try {
  const conversation = sanitizeConversation(JSON.parse(conversationText));
  if (Array.isArray(conversation) && conversation.length === 4) {
        return conversation;
      } else {
        throw new Error('Invalid conversation format');
      }
    } catch (parseError) {
      console.error('Failed to parse dual penalty conversation:', parseError);
      // Enhanced fallback conversation
  return sanitizeConversation([
        {"speaker": "male", "text": `${playerName}, ${length} minutes for ${penaltyType}.`},
        {"speaker": "female", "text": `That's a textbook call by the official there.`},
        {"speaker": "male", "text": `Bad timing for ${teamName} - they were building momentum.`},
        {"speaker": "female", "text": `Now it's a power play opportunity for the other team.`}
  ]);
    }
  } catch (error) {
    console.error('Error generating dual penalty announcement:', error);
    try {
      const { playerName, penaltyType } = penaltyData || {};
      return sanitizeConversation([
        { speaker: 'male', text: `${playerName || 'Player'} called for ${penaltyType || 'a minor penalty'}.` },
        { speaker: 'female', text: `Tough timing, that puts pressure on the kill.` },
        { speaker: 'male', text: `Need disciplined clears now.` },
        { speaker: 'female', text: `Exactly—can't let this snowball.` }
      ], 'dual-penalty-fallback');
    } catch (_) {
      throw new Error('Failed to generate dual penalty conversation: ' + error.message);
    }
  }
}

/**
 * Generate dual announcer random commentary conversation
 * This is the main feature - an AI-driven conversation starter that leads to freeform dialogue
 */
export async function generateDualRandomCommentary(gameId, gameContext = {}) {
  console.log('🎙️ Starting generateDualRandomCommentary for gameId:', gameId);
  console.log('🎙️ Game context:', gameContext);
  
  try {
    // First, generate a conversation starter based on analytics/context
  const starterPrompt = `Create a conversation starter for two veteran hockey announcers during a break in the action. These are experienced broadcast partners who know each other well and can discuss hockey naturally.

STRICT NAMING RULES (CRITICAL):
- Male announcer name: Al (ONLY 'Al').
- Female announcer name: Linda (ONLY 'Linda').
- Never use last names or any other substitute names (e.g., Bob). If you would, silently correct it.

CONTEXT: ${JSON.stringify(gameContext, null, 2)}

Generate a single opening line from AL (the male announcer) that could lead to interesting discussion. Topics could include:
- Player performance or recent hot streaks
- Team strategy or coaching decisions
- League standings or playoff implications
- Historical matchups between teams
- Interesting hockey facts or observations
- Game flow and momentum shifts

AL (Male Announcer):
- Natural conversationalist with hockey knowledge
- Can ask questions that set up his partner
- Makes observations about game patterns
- Uses understated humor appropriately
- Professional but engaging delivery

Return just the opening line text, no JSON or formatting.`;

    console.log('🤖 Making OpenAI starter call...');
    const starterCompletion = await Promise.race([
      openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: "You are Al, a veteran male hockey announcer. ONLY use the names Al and Linda for the broadcast team (no last names, no substitutions). Generate natural conversation starters that experienced broadcast partners would use during hockey games."
          },
          {
            role: "user",
            content: starterPrompt
          }
        ],
        max_tokens: 100, // Reduced for faster responses
        temperature: 0.9,
      }),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('OpenAI starter call timeout after 15 seconds')), 15000)
      )
    ]);

    const conversationStarter = starterCompletion.choices[0].message.content.trim();
    console.log('🎙️ Generated conversation starter:', conversationStarter);

    // Now generate the full 5-line conversation starting with that opener
  const conversationPrompt = `Continue this hockey announcer conversation for exactly 4 lines total, alternating male-female-male-female. These are veteran broadcast partners who naturally build on each other's observations.

STRICT NAMING RULES (CRITICAL):
- Use ONLY 'Al' and 'Linda'.
- No last names. No other first names. No nicknames. If any other name would appear, replace it with the correct one before returning.

OPENER: "${conversationStarter}"

ANNOUNCER PERSONALITIES:

AL (Male Announcer):
- Experienced play-by-play with natural conversational ability
- Can challenge or support his partner's views
- Makes strategic observations about hockey

LINDA (Female Announcer):
- Expert color commentator with deep hockey knowledge
- Can agree/disagree with Al's points
- Brings up player backgrounds and team dynamics

CONVERSATION DYNAMICS:
- Sound like seasoned broadcast partners who enjoy working together
- Natural conversational flow with back-and-forth energy
- React to each other's points, agree/disagree naturally
- Show personality and chemistry between announcers
- Cover topics like strategy, player performance, team dynamics
- Make it engaging and unpredictable - surprise each other
- Keep it concise but entertaining

FORMAT: Return ONLY a JSON array with exactly 4 lines alternating male-female-male-female`;

    console.log('🤖 Making OpenAI conversation call...');
    const completion = await Promise.race([
      openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: "You are creating realistic, natural conversations between veteran hockey broadcast partners named Al and Linda. ONLY output 'Al' and 'Linda' – no last names, no alternative names. Return ONLY valid JSON with exactly 4 alternating lines (male-female-male-female). Sanitize output if necessary before returning."
          },
          {
            role: "user",
            content: conversationPrompt
          }
        ],
        max_tokens: 350, // Reduced for faster responses
        temperature: 0.9,
      }),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('OpenAI conversation call timeout after 20 seconds')), 20000)
      )
    ]);

    const conversationText = completion.choices[0].message.content.trim();
    console.log('🎙️ Generated conversation text:', conversationText);
    
    try {
  const rawConversation = sanitizeConversation(JSON.parse(conversationText));
      console.log('🎙️ Parsed raw conversation:', rawConversation);
      
      // Convert conversation format if needed
      let conversation;
      if (Array.isArray(rawConversation)) {
        // Check if it's in the expected format with speaker/text
        if (rawConversation.length > 0 && rawConversation[0].speaker && rawConversation[0].text) {
          conversation = rawConversation;
        } 
        // Check if it's in the male_announcer/female_announcer format
        else if (rawConversation.length > 0 && 
                 (rawConversation[0].male_announcer || rawConversation[0].female_announcer)) {
          conversation = [];
          for (let i = 0; i < rawConversation.length; i++) {
            const line = rawConversation[i];
            if (line.male_announcer) {
              conversation.push({ speaker: "male", text: line.male_announcer });
            } else if (line.female_announcer) {
              conversation.push({ speaker: "female", text: line.female_announcer });
            }
          }
        } else {
          throw new Error('Unrecognized conversation format');
        }
        
        console.log('🎙️ Converted conversation:', conversation);
        
  if (conversation.length === 4) {
          console.log('🎙️ Received conversation from generateDualRandomCommentary:', conversation.length, 'lines');
          return conversation;
        } else {
          throw new Error('Invalid conversation length: ' + conversation.length);
        }
      } else {
        throw new Error('Conversation is not an array');
      }
    } catch (parseError) {
      console.error('Failed to parse dual random conversation:', parseError);
      // Enhanced fallback to a more natural conversation
  return sanitizeConversation([
        {"speaker": "male", "text": conversationStarter},
        {"speaker": "female", "text": "You know what I love about that? The way these teams adapt their strategies."},
        {"speaker": "male", "text": "Exactly! And the skill level in this league keeps getting better."},
        {"speaker": "female", "text": "Oh absolutely! The conditioning these players have now is incredible."}
  ]);
    }
  } catch (error) {
    console.error('Error generating dual random commentary:', error);
    try {
      return sanitizeConversation([
        { speaker: 'male', text: 'Pace has really settled into a tactical stretch here.' },
        { speaker: 'female', text: 'Yeah, both benches managing shifts carefully right now.' },
        { speaker: 'male', text: 'They’re probing for a clean entry without turning it over.' },
        { speaker: 'female', text: 'And patience like this usually sets up a burst of chances.' }
      ], 'dual-random-fallback');
    } catch (_) {
      throw new Error('Failed to generate dual random conversation: ' + error.message);
    }
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

/**
 * Sanitize conversation lines to enforce strict naming (Al, Linda only, no last names)
 */
export function sanitizeConversation(convo, context = 'dual-announcer') {
  if (!Array.isArray(convo)) return convo;
  const maleVariants = [/\bAlan\b/gi, /\bAllan\b/gi, /\bAlfred\b/gi, /\bAlbert\b/gi];
  const femaleVariants = [/\bLynda\b/gi, /\bLindsey\b/gi, /\bLindsey\b/gi, /\bLindy\b/gi];
  const wrongFemaleToLinda = [/\bBob\b/gi, /\bBobby\b/gi];
  let modifications = 0;
  const sanitized = convo.map(line => {
    if (!line || typeof line.text !== 'string') return line;
    let original = line.text;
    let t = original;
    // Normalize male variants to Al
    maleVariants.forEach(r => { if (r.test(t)) { t = t.replace(r, 'Al'); modifications++; } });
    // Normalize female variants to Linda
    femaleVariants.forEach(r => { if (r.test(t)) { t = t.replace(r, 'Linda'); modifications++; } });
    // Replace mis-gender hallucinations to Linda
    wrongFemaleToLinda.forEach(r => { if (r.test(t)) { t = t.replace(r, 'Linda'); modifications++; } });
    // Remove last names after Al or Linda
    const lastNamePattern = /\b(Al|Linda)\s+[A-Z][a-z]+\b/g;
    t = t.replace(lastNamePattern, (m, p1) => { modifications++; return p1; });
  t = stripFluff(t, false); // remove fluff but don't log each phrase individually
  return { ...line, text: t };
  });
  if (modifications > 0) {
    const msg = `Sanitized ${modifications} name issue(s) in conversation (${context})`;
    if (logger && logger.warn) logger.warn(msg); else console.warn(msg);
  }
  return sanitized;
}

// Fluff / meme phrase stripping utility
const FLUFF_PATTERNS = [
  /boom goes the dynamite/gi,
  /can you believe (this|it)/gi,
  /what a moment/gi,
  /absolute (chaos|madness)/gi,
  /unreal stuff/gi,
  /electric (atmosphere|energy)/gi,
  /lights? it up/gi,
  /the building (erupt|explod)/gi,
  /(epic|massive|insane) (goal|shot|play)/gi,
  /all day long/gi,
  /no doubt about it/gi,
  /(that|this) place is (going|about) (crazy|wild)/gi
];

function stripFluff(text, log = false) {
  if (!text) return text;
  let modified = text;
  let hits = 0;
  FLUFF_PATTERNS.forEach(p => {
    if (p.test(modified)) {
      hits++;
      modified = modified.replace(p, '').replace(/\s{2,}/g, ' ').trim();
    }
  });
  // Collapse excessive exclamations
  modified = modified.replace(/!{2,}/g, '!');
  // Remove leftover orphan punctuation at end
  modified = modified.replace(/([:,;\-])$/g, '').trim();
  // Ensure first char capitalized
  if (modified) modified = modified.charAt(0).toUpperCase() + modified.slice(1);
  if (log && hits > 0) {
    if (logger && logger.warn) logger.warn(`Stripped ${hits} fluff phrase(s) from announcement`); else console.warn('Stripped fluff phrases');
  }
  return modified;
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
