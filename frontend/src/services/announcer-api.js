// frontend/src/services/announcerApi.js
import axios from 'axios';

/**
 * Centralized API calls for announcer functionality
 * Reduces duplication and ensures consistent parameter handling
 */

export async function announce(type, gameId, selectedVoice) {
  // In production on Azure, frontend and backend are on the same domain, so use relative URLs
  const apiBase = '';
  const endpointMap = {
    goal: '/api/goals/announce-last',
    penalty: '/api/penalties/announce-last',
    random: '/api/randomCommentary'
  };
  
  if (!endpointMap[type]) {
    throw new Error(`Invalid announcement type: ${type}`);
  }
  
  const mode = selectedVoice === 'dual' ? 'dual' : 'single';
  
  const response = await axios.post(`${apiBase}${endpointMap[type]}`, {
    gameId,
    voiceGender: selectedVoice,
    announcerMode: mode
  });
  
  return response.data;
}

/**
 * Enhanced error handling for announcer API calls
 */
export function handleAnnouncerError(error, context = 'announcement') {
  if (error.response?.status === 503) {
    throw new Error('Announcer service temporarily unavailable');
  } else if (error.response?.status === 400) {
    throw new Error('Invalid announcement request');
  } else if (error.response?.data?.error) {
    throw new Error(error.response.data.error);
  } else {
    throw new Error(`Failed to generate ${context}`);
  }
}
