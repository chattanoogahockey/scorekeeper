import OpenAI from 'openai';
import textToSpeech from '@google-cloud/text-to-speech';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Initialize Google Cloud Text-to-Speech client
// In Azure, this will use Application Default Credentials
const ttsClient = new textToSpeech.TextToSpeechClient({
  // Will automatically use environment credentials in Azure
  // For local development, you may need to set GOOGLE_APPLICATION_CREDENTIALS
});

/**
 * Generate professional hockey goal announcement using OpenAI
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

    const prompt = `You are a professional hockey arena announcer. Create an exciting, energetic goal announcement for the following goal:

Player: ${playerName}
Team: ${teamName} 
Period: ${period}
Time: ${timeRemaining}
Goal Type: ${goalType}
${assistText}
Current Score: ${scoreText}
${statsText}

Write this in the style of a professional hockey announcer - be energetic, clear, and exciting. Include the player name prominently, mention assists if any, and build excitement around the goal. Keep it concise but impactful (2-3 sentences max). Do not include any stage directions or formatting - just the announcement text that would be spoken.

Examples of professional hockey announcements:
- "GOAL! Scored by number 87, Sidney Crosby! Assisted by Malkin and Letang. That's his 15th of the season and gives Pittsburgh a 3-2 lead!"
- "SCORES! What a snipe by Connor McDavid! Unassisted beauty puts Edmonton up 2-1 in the second period!"

Your announcement:`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "You are a professional hockey arena announcer. Create exciting, energetic goal announcements that capture the excitement of live hockey."
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
 * Convert text to speech using Google Cloud TTS with Onyx-like voice
 */
export async function textToSpeech(text, outputPath = null) {
  try {
    // For local development without Google Cloud credentials, 
    // we'll create a simple text response
    if (!process.env.GOOGLE_APPLICATION_CREDENTIALS && process.env.NODE_ENV === 'development') {
      console.log('Google TTS not configured for local development, returning text only');
      return {
        audioPath: null,
        audioData: null,
        text: text
      };
    }

    // Request configuration for realistic male announcer voice
    const request = {
      input: { text },
      voice: {
        languageCode: 'en-US',
        name: 'en-US-Neural2-D', // Deep male voice similar to arena announcers
        ssmlGender: 'MALE',
      },
      audioConfig: {
        audioEncoding: 'MP3',
        speakingRate: 1.1, // Slightly faster for excitement
        pitch: -2.0, // Lower pitch for authority
        volumeGainDb: 2.0, // Boost volume
      },
    };

    const [response] = await ttsClient.synthesizeSpeech(request);
    
    if (!outputPath) {
      // Generate timestamp-based filename
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      outputPath = path.join(__dirname, '..', 'audio-cache', `announcement-${timestamp}.mp3`);
    }

    // Ensure audio-cache directory exists
    const audioDir = path.dirname(outputPath);
    if (!fs.existsSync(audioDir)) {
      fs.mkdirSync(audioDir, { recursive: true });
    }

    // Write audio file
    fs.writeFileSync(outputPath, response.audioContent, 'binary');
    
    return {
      audioPath: outputPath,
      audioData: response.audioContent
    };
  } catch (error) {
    console.error('Error generating speech:', error);
    
    // Fallback: return text without audio
    console.log('Falling back to text-only response');
    return {
      audioPath: null,
      audioData: null,
      text: text,
      error: error.message
    };
  }
}

/**
 * Main function to create complete goal announcement
 */
export async function createGoalAnnouncement(goalData, playerStats = null) {
  try {
    console.log('Generating goal announcement for:', goalData.playerName);
    
    // Generate announcement text
    const announcementText = await generateGoalAnnouncement(goalData, playerStats);
    console.log('Generated announcement:', announcementText);
    
    // Convert to speech
    const audioResult = await textToSpeech(announcementText);
    
    if (audioResult.audioPath) {
      console.log('Generated audio file:', audioResult.audioPath);
    } else {
      console.log('Audio generation skipped or failed, returning text only');
    }
    
    return {
      text: announcementText,
      audioPath: audioResult.audioPath,
      audioData: audioResult.audioData,
      error: audioResult.error
    };
  } catch (error) {
    console.error('Error creating goal announcement:', error);
    throw error;
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
  textToSpeech,
  createGoalAnnouncement
};
