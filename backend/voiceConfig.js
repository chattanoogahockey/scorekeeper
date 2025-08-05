import { getSettingsContainer } from './cosmosClient.js';

/**
 * Voice configuration helper functions for production use
 */

// Default voice configuration
const DEFAULT_VOICES = {
  male: 'en-US-Studio-Q',    // Studio-Q is male
  female: 'en-US-Studio-O'   // Studio-O is female  
};

/**
 * Get voice configuration from settings container
 */
export async function getVoiceConfig() {
  try {
    const container = getSettingsContainer();
    const { resources: configs } = await container.items
      .query({
        query: "SELECT * FROM c WHERE c.type = 'voice-config'",
        parameters: []
      })
      .fetchAll();
    
    if (configs.length > 0) {
      return configs[0];
    }
    
    // Return default configuration if none exists
    return {
      id: 'voice-config',
      type: 'voice-config',
      maleVoice: DEFAULT_VOICES.male,
      femaleVoice: DEFAULT_VOICES.female,
      lastUpdated: new Date().toISOString()
    };
  } catch (error) {
    console.warn('⚠️ Could not fetch voice config, using defaults:', error.message);
    return {
      id: 'voice-config',
      type: 'voice-config',
      maleVoice: DEFAULT_VOICES.male,
      femaleVoice: DEFAULT_VOICES.female,
      lastUpdated: new Date().toISOString()
    };
  }
}

/**
 * Update voice configuration in settings container
 */
export async function updateVoiceConfig(maleVoice, femaleVoice) {
  try {
    const container = getSettingsContainer();
    
    const voiceConfig = {
      id: 'voice-config',
      type: 'voice-config',
      maleVoice: maleVoice || DEFAULT_VOICES.male,
      femaleVoice: femaleVoice || DEFAULT_VOICES.female,
      lastUpdated: new Date().toISOString()
    };
    
    await container.items.upsert(voiceConfig);
    return voiceConfig;
  } catch (error) {
    console.error('❌ Failed to update voice config:', error);
    throw error;
  }
}

/**
 * Get voice for announcement based on gender preference
 */
export async function getVoiceForGender(voiceGender) {
  try {
    const config = await getVoiceConfig();
    
    if (voiceGender === 'male' && config.maleVoice) {
      return config.maleVoice;
    } else if (voiceGender === 'female' && config.femaleVoice) {
      return config.femaleVoice;
    }
    
    // Fallback to defaults
    return DEFAULT_VOICES[voiceGender] || DEFAULT_VOICES.male;
  } catch (error) {
    console.warn('⚠️ Error getting voice for gender, using default:', error.message);
    return DEFAULT_VOICES[voiceGender] || DEFAULT_VOICES.male;
  }
}
