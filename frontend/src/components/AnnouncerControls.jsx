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
  const { selectedGame } = useContext(GameContext);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState(null);

  /**
   * Announce the latest goal using AI-generated announcement
   */
  const announceLatestGoal = async () => {
    setLoading(true);
    setError(null);
    setMessage('Generating announcement...');
    
    try {
      const apiUrl = import.meta.env.DEV 
        ? '/api/goals/announce-last' 
        : `${import.meta.env.VITE_API_BASE_URL}/api/goals/announce-last`;
      
      const response = await axios.post(apiUrl, { gameId });
      
      if (response.data.success) {
        const { announcement } = response.data;
        setMessage(`Generated: "${announcement.text}"`);
        
        // Play the generated audio if available
        if (announcement.audioPath) {
          const audioUrl = import.meta.env.DEV 
            ? `/api/audio/${announcement.audioPath}` 
            : `${import.meta.env.VITE_API_BASE_URL}/api/audio/${announcement.audioPath}`;
          
          const audio = new Audio(audioUrl);
          
          audio.onloadeddata = () => {
            setMessage('Playing announcement...');
          };
          
          audio.onended = () => {
            setMessage('');
          };
          
          audio.onerror = () => {
            setError('Failed to play announcement audio');
            setMessage('');
          };
          
          await audio.play();
        } else {
          // No audio generated, just show the text
          setMessage(`Announcement (text only): "${announcement.text}"`);
          setTimeout(() => setMessage(''), 5000); // Clear after 5 seconds
        }
      }
    } catch (err) {
      console.error('Error announcing latest goal:', err);
      setError(err.response?.data?.error || 'Failed to announce latest goal');
      setMessage('');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Fetch latest penalty from the API and announce it.
   */
  const announceLatestPenalty = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: penalty } = await axios.get('/api/lastPenalty', { params: { gameId } });
      if (!penalty) {
        setError('No penalty recorded yet');
        return;
      }
      const text = `Penalty on ${penalty.penalizedPlayer} of the ${penalty.team} for ${penalty.penaltyType}. ${penalty.length} minutes.`;
      await playTTS(text);
    } catch (err) {
      console.error(err);
      setError('Failed to announce penalty');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Announce generic message like start of period or end of game.
   * @param {string} text
   */
  const announceMessage = async (text) => {
    setLoading(true);
    setError(null);
    try {
      await playTTS(text);
    } catch (err) {
      console.error(err);
      setError('Failed to announce');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Plays TTS for given text by requesting the backend and creating audio element.
   * @param {string} text
   */
  const playTTS = async (text) => {
    setMessage(text);
    const { data } = await axios.get('/api/tts', { params: { text } });
    const audio = new Audio(data.url);
    await audio.play();
  };

  return (
    <div className="border rounded shadow p-4">
      <h4 className="text-xl font-semibold mb-2">Announcer Controls</h4>
      {error && <p className="text-red-500 mb-2">{error}</p>}
      <div className="space-y-2">
        <button
          onClick={announceLatestGoal}
          disabled={loading}
          className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400"
        >
          {loading ? 'Generating...' : 'Announce Latest Goal'}
        </button>
        <button
          onClick={announceLatestPenalty}
          disabled={loading}
          className="w-full px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
        >
          Announce Latest Penalty
        </button>
      </div>
      {message && (
        <p className="text-sm mt-3 italic text-gray-600">Latest announcement: {message}</p>
      )}
    </div>
  );
}