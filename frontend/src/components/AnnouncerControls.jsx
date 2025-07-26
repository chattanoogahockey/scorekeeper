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
   * Fetch latest goal from the API and announce it.
   */
  const announceLatestGoal = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: goal } = await axios.get('/api/lastGoal', { params: { gameId } });
      if (!goal) {
        setError('No goal recorded yet');
        return;
      }
      const assists = goal.assists && goal.assists.length > 0 ? `, assisted by ${goal.assists.join(' and ')}` : '';
      const text = `Goal scored by ${goal.scorer} for the ${goal.scoringTeam}${assists}. It was a ${goal.goalType.toLowerCase()} on a ${goal.shotType.toLowerCase()}.`;
      await playTTS(text);
    } catch (err) {
      console.error(err);
      setError('Failed to announce goal');
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

  /**
   * Announces start of given period.
   */
  const handleStartPeriod = async (period) => {
    const text = `Start of period ${period}.`;
    await announceMessage(text);
  };

  /**
   * Announces end of game with final score computed from last events.
   */
  const announceEndGame = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch all events to compute scores
      const { data: events } = await axios.get('/api/events', { params: { gameId } });
      let homeGoals = 0;
      let awayGoals = 0;
      events.forEach((ev) => {
        if (ev.scoringTeam) {
          if (ev.scoringTeam === selectedGame.homeTeam) homeGoals++;
          if (ev.scoringTeam === selectedGame.awayTeam) awayGoals++;
        }
      });
      const text = `That concludes the game. Final score, ${selectedGame.awayTeam} ${awayGoals}, ${selectedGame.homeTeam} ${homeGoals}.`;
      await playTTS(text);
    } catch (err) {
      console.error(err);
      setError('Failed to announce end of game');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="border rounded shadow p-4">
      <h4 className="text-xl font-semibold mb-2">Announcer Controls</h4>
      {error && <p className="text-red-500 mb-2">{error}</p>}
      <div className="space-y-2">
        <button
          onClick={announceLatestGoal}
          disabled={loading}
          className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Announce Latest Goal
        </button>
        <button
          onClick={announceLatestPenalty}
          disabled={loading}
          className="w-full px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
        >
          Announce Latest Penalty
        </button>
        <div className="grid grid-cols-2 gap-2">
          {[1, 2, 3, 'OT'].map((p) => (
            <button
              key={p}
              onClick={() => handleStartPeriod(p)}
              disabled={loading}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
            >
              Start Period {p}
            </button>
          ))}
        </div>
        <button
          onClick={announceEndGame}
          disabled={loading}
          className="w-full px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
        >
          End Game Announcement
        </button>
      </div>
      {message && (
        <p className="text-sm mt-3 italic text-gray-600">Latest announcement: {message}</p>
      )}
    </div>
  );
}