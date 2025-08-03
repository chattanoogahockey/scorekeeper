import React, { useState, useContext } from 'react';
import axios from 'axios';
import { GameContext } from '../contexts/GameContext.jsx';

/**
 * AnnouncerControls provides buttons for the scorekeeper to trigger Google
 * Text-to-Speech announcements based on the latest goal or penalty or
 * generic game messages. It fetches data from the backend and plays
 * synthesized speech via audio.
 */
export default function AnnouncerControls({ gameId }) {
  const { selectedGame, selectedGameId } = useContext(GameContext);
  const [goalLoading, setGoalLoading] = useState(false);
  const [penaltyLoading, setPenaltyLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState(null);

  // Use gameId prop if provided, otherwise use context
  const currentGameId = gameId || selectedGameId;

  /**
   * Use browser text-to-speech to speak the announcement text
   */
  const speakText = (text) => {
    if ('speechSynthesis' in window) {
      // Cancel any ongoing speech
      speechSynthesis.cancel();
      
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9; // Slightly slower for clarity
      utterance.pitch = 1.0;
      utterance.volume = 0.8;
      
      utterance.onstart = () => {
        setMessage('🔊 Playing AI announcement...');
      };
      
      utterance.onend = () => {
        setMessage('');
      };
      
      utterance.onerror = (event) => {
        console.error('Speech synthesis error:', event);
        setError('Text-to-speech failed');
        setMessage('');
      };
      
      speechSynthesis.speak(utterance);
    } else {
      setError('Text-to-speech not supported in this browser');
      setTimeout(() => setMessage(''), 8000); // Just show text
    }
  };

  /**
   * Announce the latest goal using AI-generated announcement
   * Or generate scoreless commentary if no goals yet
   */
  const announceLatestGoal = async () => {
    if (!currentGameId) {
      setError('No game selected. Please select a game first.');
      return;
    }

    setGoalLoading(true);
    setError(null);
    setMessage('Generating goal announcement...');
    
    try {
      const apiUrl = import.meta.env.DEV 
        ? '/api/goals/announce-last' 
        : `${import.meta.env.VITE_API_BASE_URL}/api/goals/announce-last`;
      
      const response = await axios.post(apiUrl, { gameId: currentGameId });
      
      if (response.data.success) {
        const { announcement, scoreless } = response.data;
        
        if (scoreless) {
          setMessage(`Scoreless Commentary: "${announcement.text}"`);
        } else {
          setMessage(`Goal Announcement: "${announcement.text}"`);
        }
        
        // Play the generated audio if available, otherwise use browser TTS
        if (announcement.audioPath) {
          const audioUrl = import.meta.env.DEV 
            ? `/api/audio/${announcement.audioPath}` 
            : `${import.meta.env.VITE_API_BASE_URL}/api/audio/${announcement.audioPath}`;
          
          const audio = new Audio(audioUrl);
          
          audio.onloadeddata = () => {
            setMessage(scoreless ? 'Playing scoreless commentary...' : 'Playing goal announcement...');
          };
          
          audio.onended = () => {
            setMessage('');
          };
          
          audio.onerror = () => {
            setError('Failed to play announcement audio, falling back to text-to-speech');
            // Fallback to browser TTS
            speakText(announcement.text);
          };
          
          await audio.play();
        } else {
          // No server audio available, use browser text-to-speech
          speakText(announcement.text);
        }
      }
    } catch (err) {
      console.error('Error announcing latest goal:', err);
      
      // Handle fallback when announcer service isn't available
      if (err.response?.status === 503 && err.response?.data?.fallback) {
        setError('AI announcer not available in current deployment');
        setMessage('Using fallback: Goal announcement service temporarily unavailable');
      } else {
        setError(err.response?.data?.error || 'Failed to generate announcement');
      }
      setMessage('');
    } finally {
      setGoalLoading(false);
    }
  };

  /**
   * Announce the latest penalty using AI-generated announcement
   */
  const announceLatestPenalty = async () => {
    if (!currentGameId) {
      setError('No game selected. Please select a game first.');
      return;
    }

    setPenaltyLoading(true);
    setError(null);
    setMessage('Generating penalty announcement...');
    
    try {
      const apiUrl = import.meta.env.DEV 
        ? '/api/penalties/announce-last' 
        : `${import.meta.env.VITE_API_BASE_URL}/api/penalties/announce-last`;
      
      const response = await axios.post(apiUrl, { gameId: currentGameId });
      
      if (response.data.success) {
        const { announcement } = response.data;
        setMessage(`Penalty Announcement: "${announcement.text}"`);
        
        // Play the generated audio if available, otherwise use browser TTS
        if (announcement.audioPath) {
          const audioUrl = import.meta.env.DEV 
            ? `/api/audio/${announcement.audioPath}` 
            : `${import.meta.env.VITE_API_BASE_URL}/api/audio/${announcement.audioPath}`;
          
          const audio = new Audio(audioUrl);
          
          audio.onloadeddata = () => {
            setMessage('Playing penalty announcement...');
          };
          
          audio.onended = () => {
            setMessage('');
          };
          
          audio.onerror = () => {
            setError('Failed to play announcement audio, falling back to text-to-speech');
            // Fallback to browser TTS
            speakText(announcement.text);
          };
          
          await audio.play();
        } else {
          // No server audio available, use browser text-to-speech
          speakText(announcement.text);
        }
      }
    } catch (err) {
      console.error('Error announcing latest penalty:', err);
      
      // Handle fallback when announcer service isn't available
      if (err.response?.status === 503 && err.response?.data?.fallback) {
        setError('AI penalty announcer not available in current deployment');
        setMessage('Using fallback: Penalty announcement service temporarily unavailable');
      } else if (err.response?.status === 404) {
        setError('No penalties recorded yet for this game');
      } else {
        setError(err.response?.data?.error || 'Failed to generate penalty announcement');
      }
      setMessage('');
    } finally {
      setPenaltyLoading(false);
    }
  };

  return (
    <div className="border rounded shadow p-4">
      <h4 className="text-xl font-semibold mb-2">Announcer Controls</h4>
      {!currentGameId && (
        <p className="text-yellow-600 mb-2 text-sm">⚠️ No game selected. Please select a game to use announcer features.</p>
      )}
      {error && <p className="text-red-500 mb-2">{error}</p>}
      <div className="space-y-2">
        <button
          onClick={announceLatestGoal}
          disabled={goalLoading || !currentGameId}
          className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400"
        >
          {goalLoading ? 'Generating...' : 'AI Commentary (Goal/Scoreless)'}
        </button>
        <button
          onClick={announceLatestPenalty}
          disabled={penaltyLoading || !currentGameId}
          className="w-full px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:bg-gray-400"
        >
          {penaltyLoading ? 'Generating...' : 'AI Penalty Announcement'}
        </button>
      </div>
      {message && (
        <p className="text-sm mt-3 italic text-gray-600">Latest announcement: {message}</p>
      )}
    </div>
  );
}