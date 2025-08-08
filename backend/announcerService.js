import OpenAI from 'openai';

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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
      `You are a professional roller hockey arena announcer with the style and personality of **Linda Cohn's legendary ESPN hockey personality**—reimagined for roller hockey. You are the play-by-play voice in the Scorekeeper app. Create an exciting goal announcement that captures Linda's upbeat, bright, energetic approach to hockey broadcasting.` :
      `You are a professional roller hockey arena announcer with the style and personality of **Al Michaels**—adapted for roller hockey. You are the play-by-play voice in the Scorekeeper app. Create an exciting goal announcement that captures the rhythm, tone, and delivery that made Michaels iconic—just applied to a roller rink.`;

    const styleGuidelines = voiceGender === 'female' ? 
      `**STYLE GUIDELINES (Linda Cohn approach):**
- **Upbeat and energetic**: Bright, warm tone that makes every goal feel electric
- **Confident and conversational**: Clear delivery like she's smiling as she speaks
- **Fan-first excitement**: Genuine enthusiasm for every scoring moment
- **Emotional presence**: Let the joy and excitement come through naturally
- **Never gets jaded**: Every goal matters, every game is important
- **Skill appreciation**: Highlights the talent and effort behind each goal

**PERSONALITY TRAITS:**
- Joyful and fan-friendly approach to every call
- Believes in comebacks and momentum shifts
- Credits skill, grit, and character
- Upbeat without being over-the-top
- Conversational warmth with professional authority
- Uses roller-specific terms only (no ice hockey references)` :
      `**STYLE GUIDELINES (Al Michaels approach):**
- **Play-by-play lyricist**: The game is the melody—you provide the lyrics
- **Vivid but minimal**: Use clear, concise phrases to match the energy on the rink
- **Spontaneous**: Never sound prewritten. Let the game drive your emotion and reaction
- **Intensity-aware**: Modulate your voice to match the tempo. Build tension naturally
- **Let the moment breathe**: Capture the excitement naturally

**PERSONALITY TRAITS:**
- Warm and composed under pressure
- Natural voice of excitement during big plays
- Genuinely optimistic without sounding naïve
- Quick with dry, understated humor when appropriate
- Professional but fan-minded—loves the game and the players`;

    const examples = voiceGender === 'female' ?
      `Examples in Linda Cohn style for roller hockey:
- "OH MY! ${playerName} lights the lamp! What a beautiful shot and what a moment!"
- "YES! ${playerName} finds the back of the net! The energy in this rink is incredible!"` :
      `Examples in Al Michaels style for roller hockey:
- "He fires—SCORES! ${playerName} gives them the lead with 19 seconds left! Can you believe this place?!"
- "Shot on goal—HE SCORES! ${playerName} with the snipe! What a moment!"`;

    const prompt = `${personalityPrompt}

Player: ${playerName}
Team: ${teamName} 
Period: ${period}
Time: ${timeRemaining}
Goal Type: ${goalType}
${assistText}
Current Score: ${scoreText}
${statsText}

${styleGuidelines}

Write this as ${voiceGender === 'female' ? 'Linda Cohn' : 'Al Michaels'} would call it - be energetic, clear, and exciting. Include the player name prominently, mention assists if any, and build excitement around the goal. Keep it concise but impactful (1-2 sentences max). Do not include any stage directions or formatting - just the announcement text that would be spoken.

${examples}

Your ${voiceGender === 'female' ? 'Linda Cohn' : 'Al Michaels'}-style announcement:`;

    const systemContent = voiceGender === 'female' ?
      "You are a professional roller hockey arena announcer with the style and personality of Linda Cohn, adapted for roller hockey. Use her upbeat, energetic, and warm delivery style with genuine excitement for every goal." :
      "You are a professional roller hockey arena announcer with the style and personality of Al Michaels, adapted for roller hockey. Use his vivid but minimal play-by-play style, natural excitement, and understated humor to create compelling goal announcements.";

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

    return completion.choices[0].message.content.trim();
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
      `You are a professional roller hockey announcer with the style and personality of **Linda Cohn's legendary ESPN hockey personality**—reimagined for roller hockey. Generate exciting commentary about this scoreless battle with Linda's bright, energetic approach.` :
      `You are a professional roller hockey announcer with the style and personality of **Al Michaels**—adapted for roller hockey. Generate commentary about this scoreless game with Al's play-by-play mastery and natural excitement.`;

    const styleGuidelines = voiceGender === 'female' ? 
      `**STYLE GUIDELINES (Linda Cohn approach):**
- **Upbeat energy**: Even scoreless games are exciting with the right perspective
- **Fan-first excitement**: Make viewers appreciate the defensive battle
- **Confident commentary**: Clear delivery that builds anticipation
- **Warm enthusiasm**: Genuine appreciation for both teams' efforts
- **Hockey knowledge**: Highlight the tactical battle and goaltending
- **Never gets jaded**: Every scoreless moment builds toward something special` :
      `**STYLE GUIDELINES (Al Michaels approach):**
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

Keep it engaging and create excitement even without goals. 2-3 sentences max. Sound like ${voiceGender === 'female' ? 'Linda Cohn building energy and appreciation for both teams' : 'Al Michaels building drama naturally'}.

Your ${voiceGender === 'female' ? 'Linda Cohn' : 'Al Michaels'}-style commentary:`;

    const systemContent = voiceGender === 'female' ?
      "You are a professional roller hockey announcer with the style and personality of Linda Cohn, adapted for roller hockey. Use her upbeat, energetic approach to make even scoreless games exciting with genuine enthusiasm and hockey knowledge." :
      "You are a professional roller hockey announcer with the style and personality of Al Michaels, adapted for roller hockey. Use his tension-building ability and natural excitement to make scoreless games compelling.";

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
      `You are a professional roller hockey arena announcer with the style and personality of **Linda Cohn's legendary ESPN hockey personality**—reimagined for roller hockey. Create a clear, authoritative penalty announcement with Linda's upbeat but professional approach.` :
      `You are a professional roller hockey arena announcer with the style and personality of **Al Michaels**—adapted for roller hockey. Create a clear, authoritative penalty announcement for the following penalty:`;

    const styleGuidelines = voiceGender === 'female' ? 
      `**STYLE GUIDELINES (Linda Cohn approach):**
- **Professional but warm**: Clear, authoritative delivery with Linda's signature warmth
- **Confident and conversational**: Matter-of-fact delivery with underlying enthusiasm
- **Fan-first approach**: Explain the call clearly for everyone watching
- **Emotional intelligence**: Balanced reaction appropriate to the situation
- **Never condescending**: Respectful of players while being clear about the penalty
- **Uses roller-specific terms only**: No ice hockey references

**PERSONALITY TRAITS:**
- Upbeat professionalism even during penalty calls
- Clear communication with underlying hockey knowledge
- Warm authority that keeps the game moving
- Professional but approachable delivery` :
      `**STYLE GUIDELINES (Al Michaels approach):**
- **Play-by-play clarity comes first**: Clear, concise phrases that match the moment
- **Professional but fan-minded**: Loves the game, understands the players
- **Understated authority**: Professional delivery without being overly dramatic
- **Natural rhythm**: Let the call feel spontaneous, not scripted

**PERSONALITY TRAITS:**
- Warm and composed under pressure
- Professional delivery with natural touch
- Clear, authoritative, and professional
- Quick with dry, understated humor when appropriate`;

    const examples = voiceGender === 'female' ?
      `Examples in Linda Cohn style:
- "Number 14, John Smith, two minutes for tripping. Clear call by the official."
- "Interference on Jake Wilson, that's a two-minute minor. Good eye by the ref there."` :
      `Examples in Al Michaels style:
- "Number 14, John Smith... two minutes for tripping"
- "Interference on Jake Wilson, and that's two minutes"`;

    const prompt = `${personalityPrompt}

Player: ${playerName}
Team: ${teamName}
Penalty: ${penaltyType}
Period: ${period}
Time: ${timeRemaining}
Penalty Length: ${length} minutes
${gameContext ? `Score: ${homeTeam} ${currentScore?.home || 0}, ${awayTeam} ${currentScore?.away || 0}` : ''}

${styleGuidelines}

Write this as ${voiceGender === 'female' ? 'Linda Cohn' : 'Al Michaels'} would call it - be clear, authoritative, and professional with ${voiceGender === 'female' ? 'her warm but professional' : 'his natural'} touch. State the penalty clearly and include the time. Keep it concise and authoritative (1-2 sentences). Do not include any stage directions or formatting - just the announcement text that would be spoken.

${examples}`;

    const systemContent = voiceGender === 'female' ?
      "You are a professional hockey arena announcer with the style and personality of Linda Cohn, adapted for roller hockey. Use her warm but professional delivery style with clear authority for penalty announcements." :
      "You are a professional hockey arena announcer with the style and personality of Al Michaels, adapted for roller hockey. Use his clear, authoritative yet natural delivery style for penalty announcements.";

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

    const prompt = `Create a realistic 8-line conversation between two veteran hockey announcers about this goal. These are seasoned broadcast partners who know each other well and naturally build on each other's commentary. Think Mike Emrick and Eddie Olczyk, or Doc Emrick and Pierre McGuire - they debate, agree, disagree, and create natural dialogue.

GOAL DETAILS:
- Player: ${playerName}
- Team: ${teamName}
- Period: ${period}
- Time: ${timeRemaining}
- Goal Type: ${goalType}
- ${assistText}
- Score: ${scoreText}

ANNOUNCER PERSONALITIES:

MALE ANNOUNCER (Al Michaels style):
- Calls the play-by-play with authority and excitement
- Natural conversationalist who sets up his partner for analysis
- Quick wit, can challenge or agree with female announcer
- Makes observations about game flow, timing, momentum
- Asks questions that let his partner elaborate
- Not afraid to interrupt politely if he sees something

FEMALE ANNOUNCER (Linda Cohn style):
- Provides color commentary and analysis
- Builds on male's observations with her own insights
- Can disagree respectfully or add counterpoints
- Brings up player history, team dynamics, strategic elements
- Responds naturally to male's questions and comments
- Interjects with enthusiasm when she sees great plays

CONVERSATION DYNAMICS:
- Start with male announcer's goal call (scripted)
- Female responds with immediate reaction
- From there, let it flow naturally - they might:
  * Debate the significance of the goal
  * Discuss player performance or team strategy
  * Reference earlier plays or season performance
  * Interrupt each other politely (like real announcers do)
  * Build excitement together or analyze the tactical aspect
- Sound like broadcast partners who've worked together for years
- Include natural transitions like "You're absolutely right" or "But here's what I noticed" or "Hold on, did you see..."
- Let their personalities show through their reactions

FORMAT: Return ONLY a JSON array with 8 lines alternating male-female:
[
  {"speaker": "male", "text": "Initial goal call here"},
  {"speaker": "female", "text": "Immediate reaction"},
  {"speaker": "male", "text": "Follow-up observation or question"},
  {"speaker": "female", "text": "Analysis or counterpoint"},
  {"speaker": "male", "text": "Building on her point or new angle"},
  {"speaker": "female", "text": "Agreement, disagreement, or deeper insight"},
  {"speaker": "male", "text": "Wrap-up thought or new observation"},
  {"speaker": "female", "text": "Final analysis or forward-looking comment"}
]`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "You are creating realistic, natural conversations between veteran hockey broadcast partners. They should sound like seasoned announcers who know each other well, can interrupt politely, agree/disagree, and build on each other's observations. Return ONLY valid JSON with exactly 8 alternating lines."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      max_tokens: 600,
      temperature: 0.9,
    });

    const conversationText = completion.choices[0].message.content.trim();
    
    // Parse the JSON response
    try {
      const conversation = JSON.parse(conversationText);
      if (Array.isArray(conversation) && conversation.length === 8) {
        return conversation;
      } else {
        throw new Error('Invalid conversation format');
      }
    } catch (parseError) {
      console.error('Failed to parse dual announcer conversation:', parseError);
      // Fallback to enhanced conversation
      return [
        {"speaker": "male", "text": `GOAL! ${playerName} scores for ${teamName}!`},
        {"speaker": "female", "text": `What a shot! That's exactly what this team needed!`},
        {"speaker": "male", "text": `You can see the confidence building with each goal.`},
        {"speaker": "female", "text": `Absolutely, and the way he positioned himself there shows real hockey IQ.`},
        {"speaker": "male", "text": `The ${assistText.toLowerCase()} really set that up perfectly.`},
        {"speaker": "female", "text": `Great teamwork, and now it's ${scoreText}.`},
        {"speaker": "male", "text": `This changes the whole complexion of the game.`},
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

    const prompt = `Create a realistic 6-line conversation between two veteran hockey announcers about this penalty. These are seasoned broadcast partners who naturally discuss the call, its impact, and game flow.

PENALTY DETAILS:
- Player: ${playerName}
- Team: ${teamName}
- Penalty: ${penaltyType}
- Period: ${period}
- Time: ${timeRemaining}
- Length: ${length} minutes
${gameContext ? `- Score: ${homeTeam} ${currentScore?.home || 0}, ${awayTeam} ${currentScore?.away || 0}` : ''}

ANNOUNCER PERSONALITIES:

MALE ANNOUNCER (Al Michaels style):
- Calls the penalty with authority and context
- Sets up discussion about impact on game flow
- Can question or support referee decisions
- Focuses on timing and strategic implications

FEMALE ANNOUNCER (Linda Cohn style):
- Provides analysis of the penalty call
- Discusses player discipline and team impact
- Can agree/disagree with male's assessment
- Brings up power play opportunities or defensive strategies

CONVERSATION DYNAMICS:
- Start with male announcer's penalty call (factual)
- Female responds with immediate assessment
- Continue with natural back-and-forth about:
  * Whether it was a good call
  * Impact on the game/team
  * Player's track record or team's penalty situation
  * Strategic implications (power play, momentum)
- Sound like experienced broadcast partners who respect each other's opinions
- Include natural transitions and conversational flow

FORMAT: Return ONLY a JSON array with 6 lines alternating male-female:
[
  {"speaker": "male", "text": "Penalty call here"},
  {"speaker": "female", "text": "Assessment of the call"},
  {"speaker": "male", "text": "Follow-up or context"},
  {"speaker": "female", "text": "Analysis or strategic impact"},
  {"speaker": "male", "text": "Game flow or timing observation"},
  {"speaker": "female", "text": "Final thought on impact"}
]`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "You are creating realistic, natural conversations between veteran hockey broadcast partners about penalties. They should discuss the call, its impact, and game flow naturally. Return ONLY valid JSON with exactly 6 alternating lines."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      max_tokens: 400,
      temperature: 0.8,
    });

    const conversationText = completion.choices[0].message.content.trim();
    
    try {
      const conversation = JSON.parse(conversationText);
      if (Array.isArray(conversation) && conversation.length === 6) {
        return conversation;
      } else {
        throw new Error('Invalid conversation format');
      }
    } catch (parseError) {
      console.error('Failed to parse dual penalty conversation:', parseError);
      // Enhanced fallback conversation
      return [
        {"speaker": "male", "text": `${playerName}, ${length} minutes for ${penaltyType}.`},
        {"speaker": "female", "text": `That's a textbook call by the official there.`},
        {"speaker": "male", "text": `Bad timing for ${teamName} - they were building momentum.`},
        {"speaker": "female", "text": `Now it's a power play opportunity for the other team.`},
        {"speaker": "male", "text": `These penalty kills can really test a team's discipline.`},
        {"speaker": "female", "text": `Great opportunity to see what their special teams can do!`}
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
    const starterPrompt = `Create a conversation starter for two veteran hockey announcers during a break in the action. These are experienced broadcast partners who know each other well and can discuss hockey naturally.

CONTEXT: ${JSON.stringify(gameContext, null, 2)}

Generate a single opening line from the MALE announcer that could lead to interesting discussion. Topics could include:
- Player performance or recent hot streaks
- Team strategy or coaching decisions
- League standings or playoff implications
- Historical matchups between teams
- Interesting hockey facts or observations
- Game flow and momentum shifts

MALE ANNOUNCER (Al Michaels style):
- Natural conversationalist with hockey knowledge
- Can ask questions that set up his partner
- Makes observations about game patterns
- Uses understated humor appropriately
- Professional but engaging delivery

Return just the opening line text, no JSON or formatting.`;

    const starterCompletion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "You are a veteran male hockey announcer with the style and personality of Al Michaels, adapted for roller hockey. Generate natural conversation starters that experienced broadcast partners would use during hockey games."
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

    // Now generate the full 12-line conversation starting with that opener
    const conversationPrompt = `Continue this hockey announcer conversation for exactly 12 lines total (6 each, alternating male-female). These are veteran broadcast partners who naturally debate, agree, disagree, and build on each other's observations.

OPENER: "${conversationStarter}"

ANNOUNCER PERSONALITIES:

MALE ANNOUNCER (Al Michaels style):
- Experienced play-by-play with natural conversational ability
- Can challenge or support his partner's views
- Makes strategic observations about hockey
- Uses understated humor when appropriate
- Sets up his partner for deeper analysis

FEMALE ANNOUNCER (Linda Cohn style):
- Expert color commentator with deep hockey knowledge
- Can agree/disagree with male announcer's points
- Brings up player backgrounds and team dynamics
- Adds strategic insights and historical context
- Responds naturally and can redirect conversation

CONVERSATION DYNAMICS:
- Sound like seasoned broadcast partners who've worked together for years
- Natural interruptions and conversational flow
- Debate points respectfully when they disagree
- Build on each other's observations
- Include hockey analysis mixed with personality
- Cover topics like strategy, player performance, team dynamics
- Use natural transitions like "That's a great point, but..." or "You know what I noticed..."
- Let their different perspectives show through

FORMAT: Return ONLY a JSON array with exactly 12 lines alternating male-female`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "You are creating realistic, natural conversations between veteran hockey broadcast partners. They should sound like experienced announcers who know each other well, can interrupt politely, agree/disagree, and build on each other's observations. Return ONLY valid JSON with exactly 12 alternating lines."
        },
        {
          role: "user",
          content: conversationPrompt
        }
      ],
      max_tokens: 700,
      temperature: 0.9,
    });

    const conversationText = completion.choices[0].message.content.trim();
    
    try {
      const conversation = JSON.parse(conversationText);
      if (Array.isArray(conversation) && conversation.length === 12) {
        return conversation;
      } else {
        throw new Error('Invalid conversation length');
      }
    } catch (parseError) {
      console.error('Failed to parse dual random conversation:', parseError);
      // Enhanced fallback to a more natural conversation
      return [
        {"speaker": "male", "text": conversationStarter},
        {"speaker": "female", "text": "You know what I love about that? The way these teams are adapting their strategies."},
        {"speaker": "male", "text": "Exactly! And speaking of strategy, have you noticed how much faster this league has gotten?"},
        {"speaker": "female", "text": "Oh absolutely! The conditioning these players have now is just incredible."},
        {"speaker": "male", "text": "But here's what I'm wondering - are we losing some of the grit that made hockey special?"},
        {"speaker": "female", "text": "That's interesting, but I think the skill level more than makes up for it."},
        {"speaker": "male", "text": "Fair point. Though I still miss those good old-fashioned battles in the corners."},
        {"speaker": "female", "text": "True, but look at the creativity we see now! These players are artists on wheels."},
        {"speaker": "male", "text": "I'll give you that. The goalscoring is certainly more exciting."},
        {"speaker": "female", "text": "And the saves! These goalies are absolutely phenomenal."},
        {"speaker": "male", "text": "Now that we can definitely agree on. The athleticism is off the charts."},
        {"speaker": "female", "text": "This is exactly why I love covering this sport - there's always something new to appreciate!"}
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
