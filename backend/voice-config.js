import { getSettingsContainer, getGamesContainer } from './cosmosClient.js';

/**
 * Voice configuration helper functions for production use
 * This is the SINGLE source of truth for all announcer voices
 */

// Default voice configuration
const DEFAULT_VOICES = {
  male: 'en-US-Studio-Q',    // Studio-Q is male
  female: 'en-US-Studio-O'   // Studio-O is female  
};

/**
 * UNIFIED voice configuration getter - used by ALL announcer types
 * This function queries the SAME database source that individual buttons use
 */
export async function getAnnouncerVoices() {
  try {
    // Use the SAME source as individual announcer buttons: gamesContainer with ID 'voiceConfig'
    const gamesContainer = getGamesContainer();
    const { resources: configs } = await gamesContainer.items
      .query({
        query: "SELECT * FROM c WHERE c.id = 'voiceConfig'",
        parameters: []
      })
      .fetchAll();
    
    let maleVoice = DEFAULT_VOICES.male;
    let femaleVoice = DEFAULT_VOICES.female;
    
    if (configs.length > 0) {
      const voiceConfig = configs[0];
      maleVoice = voiceConfig.maleVoice || DEFAULT_VOICES.male;
      femaleVoice = voiceConfig.femaleVoice || DEFAULT_VOICES.female;

    } else {

    }
    
    return {
      provider: 'google',
      maleVoice,
      femaleVoice,
      settings: {
        rate: 1.0,
        pitch: 0.0,
        volume: 1.0
      }
    };
  } catch (error) {
    console.warn('⚠️ Could not fetch voice config, using defaults:', error.message);
    return {
      provider: 'google',
      maleVoice: DEFAULT_VOICES.male,
      femaleVoice: DEFAULT_VOICES.female,
      settings: {
        rate: 1.0,
        pitch: 0.0,
        volume: 1.0
      }
    };
  }
}





/**
 * Get voice for announcement based on gender preference
 * Uses the unified voice configuration
 */
export async function getVoiceForGender(voiceGender) {
  try {
    const config = await getAnnouncerVoices();
    
    if (voiceGender === 'male') {
      return config.maleVoice;
    } else if (voiceGender === 'female') {
      return config.femaleVoice;
    }
    
    // Fallback to male as default
    return config.maleVoice;
  } catch (error) {
    console.warn('⚠️ Error getting voice for gender, using default:', error.message);
    return DEFAULT_VOICES[voiceGender] || DEFAULT_VOICES.male;
  }
}

/**
 * Browser TTS fallback voice configuration for dual announcer mode
 * Centralizes voice selection logic previously scattered in frontend components
 */
const FALLBACK_VOICE_CONFIG = {
  male: {
    preferredNames: ['Daniel', 'David', 'Alex'],
    settings: {
      rate: 0.95,
      pitch: 0.65,
      volume: 1.0
    }
  },
  female: {
    preferredNames: ['Samantha', 'Karen', 'Moira'],
    settings: {
      rate: 1.0,
      pitch: 1.1,
      volume: 1.0
    }
  }
};

/**
 * Get fallback browser TTS voice configuration for dual announcer mode
 * @param {string} speaker - 'male' or 'female'
 * @param {SpeechSynthesisVoice[]} availableVoices - Available browser voices
 * @returns {object} Voice configuration with selected voice and settings
 */
export function getFallbackVoice(speaker, availableVoices = []) {
  const config = FALLBACK_VOICE_CONFIG[speaker];
  if (!config) {
    throw new Error(`Invalid speaker type: ${speaker}. Must be 'male' or 'female'.`);
  }

  let selectedVoice = null;

  // Find preferred voice from available voices
  if (availableVoices && availableVoices.length > 0) {
    const matchingVoices = availableVoices.filter(voice => 
      voice.lang.startsWith('en') && 
      config.preferredNames.some(name => voice.name.includes(name))
    );
    
    if (matchingVoices.length > 0) {
      selectedVoice = matchingVoices[0];
    }
  }

  return {
    voice: selectedVoice,
    settings: { ...config.settings },
    preferredNames: [...config.preferredNames]
  };
}

/**
 * Logging function for TTS usage tracking
 */
export function logTtsUse({ where, provider, voice, rate, pitch, style }) {
  console.info(`[TTS] ${where}: provider=${provider} voice=${voice} rate=${rate} pitch=${pitch || 0} style=${style || 'none'}`);
}

/**
 * Validate that a voice exists in the Google Cloud TTS catalog
 * This prevents silent fallback to robotic voices
 */
export async function validateVoice(ttsClient, voiceName) {
  if (!ttsClient) {
    console.warn('⚠️ TTS client not available, cannot validate voice');
    return false;
  }
  
  try {
    // List available voices from Google Cloud TTS
    const [result] = await ttsClient.listVoices({
      languageCode: 'en-US'
    });
    
    const availableVoices = result.voices || [];
    const voiceExists = availableVoices.some(voice => voice.name === voiceName);
    
    if (!voiceExists) {
      console.error(`❌ Voice '${voiceName}' not found in Google Cloud TTS catalog`);
      console.log(`Available Studio voices: ${availableVoices.filter(v => v.name.includes('Studio')).map(v => v.name).join(', ')}`);
    }
    
    return voiceExists;
  } catch (error) {
    console.warn('⚠️ Could not validate voice availability:', error.message);
    return true; // Assume valid if we can't check
  }
}
