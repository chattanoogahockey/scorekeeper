import React, { useContext, useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { GameContext } from '../contexts/GameContext.jsx';

import AnnouncerControls from '../components/AnnouncerControls.jsx';
import DJPanel from '../components/DJPanel.jsx';

/**
 * Dashboard page allows scorekeepers to record goals and penalties and view live updates.
 */
export default function Dashboard() {
  const { selectedGame, rosters } = useContext(GameContext);
  const navigate = useNavigate();

  // Ensure we have a selected game; otherwise redirect
  useEffect(() => {
    if (!selectedGame) {
      navigate('/');
    }
  }, [selectedGame, navigate]);

  // Event feed state
  const [events, setEvents] = useState([]);
  const [eventsError, setEventsError] = useState(null);

  // Poll events every 10 seconds
  useEffect(() => {
    if (!selectedGame) return;
    const fetchEvents = async () => {
      try {
        const res = await axios.get('/api/events', { params: { gameId: selectedGame.id || selectedGame.gameId } });
        setEvents(res.data);
      } catch (err) {
        console.error('Failed to fetch events', err);
        setEventsError('Error loading events');
      }
    };
    fetchEvents();
    const interval = setInterval(fetchEvents, 10000);
    return () => clearInterval(interval);
  }, [selectedGame]);

  // Goal form state
  const [goalForm, setGoalForm] = useState({
    period: '',
    scoringTeam: '',
    scorer: '',
    assist1: '',
    assist2: '',
    time: '',
    shotType: '',
    goalType: '',
  });
  const [goalSubmitting, setGoalSubmitting] = useState(false);
  const [goalError, setGoalError] = useState(null);

  // Penalty form state
  const [penaltyForm, setPenaltyForm] = useState({
    period: '',
    team: '',
    penalizedPlayer: '',
    penaltyType: '',
    length: '',
    time: '',
  });
  const [penaltySubmitting, setPenaltySubmitting] = useState(false);
  const [penaltyError, setPenaltyError] = useState(null);

  // Helper to get players for a given team name
  const getPlayersForTeam = (teamName) => {
    const roster = rosters.find((r) => r.teamName === teamName);
    return roster ? roster.players : [];
  };

  const handleGoalSubmit = async (e) => {
    e.preventDefault();
    // Validate required fields
    const required = ['period', 'scoringTeam', 'scorer', 'time', 'shotType', 'goalType'];
    for (const field of required) {
      if (!goalForm[field]) {
        setGoalError(`Missing required field: ${field}`);
        return;
      }
    }
    setGoalSubmitting(true);
    setGoalError(null);
    try {
      await axios.post('/api/goals', {
        gameId: selectedGame.id || selectedGame.gameId,
        period: goalForm.period,
        scoringTeam: goalForm.scoringTeam,
        scorer: goalForm.scorer,
        assists: [goalForm.assist1, goalForm.assist2].filter(Boolean),
        time: goalForm.time,
        shotType: goalForm.shotType,
        goalType: goalForm.goalType,
      });
      // Reset form
      setGoalForm({
        period: '',
        scoringTeam: '',
        scorer: '',
        assist1: '',
        assist2: '',
        time: '',
        shotType: '',
        goalType: '',
      });
    } catch (err) {
      console.error('Failed to submit goal', err);
      setGoalError('Failed to submit goal. Please try again.');
    } finally {
      setGoalSubmitting(false);
    }
  };

  const handlePenaltySubmit = async (e) => {
    e.preventDefault();
    const required = ['period', 'team', 'penalizedPlayer', 'penaltyType', 'length', 'time'];
    for (const field of required) {
      if (!penaltyForm[field]) {
        setPenaltyError(`Missing required field: ${field}`);
        return;
      }
    }
    setPenaltySubmitting(true);
    setPenaltyError(null);
    try {
      await axios.post('/api/penalties', {
        gameId: selectedGame.id || selectedGame.gameId,
        period: penaltyForm.period,
        team: penaltyForm.team,
        penalizedPlayer: penaltyForm.penalizedPlayer,
        penaltyType: penaltyForm.penaltyType,
        length: penaltyForm.length,
        time: penaltyForm.time,
      });
      setPenaltyForm({
        period: '',
        team: '',
        penalizedPlayer: '',
        penaltyType: '',
        length: '',
        time: '',
      });
    } catch (err) {
      console.error('Failed to submit penalty', err);
      setPenaltyError('Failed to submit penalty. Please try again.');
    } finally {
      setPenaltySubmitting(false);
    }
  };

  if (!selectedGame) return null;

  return (
    <div className="p-4 max-w-5xl mx-auto">
      <h2 className="text-3xl font-bold mb-4 text-center">
        Game Dashboard: {selectedGame.awayTeam} vs {selectedGame.homeTeam}
      </h2>
      {/* Forms Section */}
      <div className="grid gap-8 md:grid-cols-2">
        {/* Goal Form */}
        <div className="border rounded shadow p-4">
          <h3 className="text-xl font-semibold mb-2">Record Goal</h3>
          {goalError && <p className="text-red-500 mb-1">{goalError}</p>}
          <form onSubmit={handleGoalSubmit} className="space-y-2">
            <div className="flex flex-col">
              <label>Period</label>
              <select
                value={goalForm.period}
                onChange={(e) => setGoalForm({ ...goalForm, period: e.target.value })}
                className="border rounded p-1"
              >
                <option value="">Select Period</option>
                <option value="1">1</option>
                <option value="2">2</option>
                <option value="3">3</option>
                <option value="OT">OT</option>
              </select>
            </div>
            <div className="flex flex-col">
              <label>Scoring Team</label>
              <select
                value={goalForm.scoringTeam}
                onChange={(e) => {
                  setGoalForm({ ...goalForm, scoringTeam: e.target.value, scorer: '', assist1: '', assist2: '' });
                }}
                className="border rounded p-1"
              >
                <option value="">Select Team</option>
                <option value={selectedGame.awayTeam}>{selectedGame.awayTeam}</option>
                <option value={selectedGame.homeTeam}>{selectedGame.homeTeam}</option>
              </select>
            </div>
            {goalForm.scoringTeam && (
              <>
                <div className="flex flex-col">
                  <label>Scorer</label>
                  <select
                    value={goalForm.scorer}
                    onChange={(e) => setGoalForm({ ...goalForm, scorer: e.target.value })}
                    className="border rounded p-1"
                  >
                    <option value="">Select Player</option>
                    {getPlayersForTeam(goalForm.scoringTeam).map((p) => (
                      <option key={p.name} value={p.name}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col">
                  <label>Assist 1 (optional)</label>
                  <select
                    value={goalForm.assist1}
                    onChange={(e) => setGoalForm({ ...goalForm, assist1: e.target.value })}
                    className="border rounded p-1"
                  >
                    <option value="">None</option>
                    {getPlayersForTeam(goalForm.scoringTeam).map((p) => (
                      <option key={p.name} value={p.name}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col">
                  <label>Assist 2 (optional)</label>
                  <select
                    value={goalForm.assist2}
                    onChange={(e) => setGoalForm({ ...goalForm, assist2: e.target.value })}
                    className="border rounded p-1"
                  >
                    <option value="">None</option>
                    {getPlayersForTeam(goalForm.scoringTeam).map((p) => (
                      <option key={p.name} value={p.name}>{p.name}</option>
                    ))}
                  </select>
                </div>
              </>
            )}
            <div className="flex flex-col">
              <label>Time (mm:ss)</label>
              <input
                type="text"
                value={goalForm.time}
                onChange={(e) => setGoalForm({ ...goalForm, time: e.target.value })}
                className="border rounded p-1"
                placeholder="00:00"
              />
            </div>
            <div className="flex flex-col">
              <label>Shot Type</label>
              <select
                value={goalForm.shotType}
                onChange={(e) => setGoalForm({ ...goalForm, shotType: e.target.value })}
                className="border rounded p-1"
              >
                <option value="">Select Shot Type</option>
                <option value="Wrist Shot">Wrist Shot</option>
                <option value="Slap Shot">Slap Shot</option>
                <option value="Backhand">Backhand</option>
                <option value="Tip-In">Tip-In</option>
                <option value="Wraparound">Wraparound</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div className="flex flex-col">
              <label>Goal Type</label>
              <select
                value={goalForm.goalType}
                onChange={(e) => setGoalForm({ ...goalForm, goalType: e.target.value })}
                className="border rounded p-1"
              >
                <option value="">Select Goal Type</option>
                <option value="Regular">Regular</option>
                <option value="Breakaway">Breakaway</option>
                <option value="Power Play">Power Play</option>
                <option value="Short-Handed">Short-Handed</option>
                <option value="Empty Net">Empty Net</option>
                <option value="Penalty Shot">Penalty Shot</option>
              </select>
            </div>
            <button
              type="submit"
              disabled={goalSubmitting}
              className="px-4 py-2 rounded bg-green-600 text-white hover:bg-green-700"
            >
              {goalSubmitting ? 'Submitting...' : 'Record Goal'}
            </button>
          </form>
        </div>
        {/* Penalty Form */}
        <div className="border rounded shadow p-4">
          <h3 className="text-xl font-semibold mb-2">Record Penalty</h3>
          {penaltyError && <p className="text-red-500 mb-1">{penaltyError}</p>}
          <form onSubmit={handlePenaltySubmit} className="space-y-2">
            <div className="flex flex-col">
              <label>Period</label>
              <select
                value={penaltyForm.period}
                onChange={(e) => setPenaltyForm({ ...penaltyForm, period: e.target.value })}
                className="border rounded p-1"
              >
                <option value="">Select Period</option>
                <option value="1">1</option>
                <option value="2">2</option>
                <option value="3">3</option>
                <option value="OT">OT</option>
              </select>
            </div>
            <div className="flex flex-col">
              <label>Team</label>
              <select
                value={penaltyForm.team}
                onChange={(e) => setPenaltyForm({ ...penaltyForm, team: e.target.value, penalizedPlayer: '' })}
                className="border rounded p-1"
              >
                <option value="">Select Team</option>
                <option value={selectedGame.awayTeam}>{selectedGame.awayTeam}</option>
                <option value={selectedGame.homeTeam}>{selectedGame.homeTeam}</option>
              </select>
            </div>
            {penaltyForm.team && (
              <div className="flex flex-col">
                <label>Player</label>
                <select
                  value={penaltyForm.penalizedPlayer}
                  onChange={(e) => setPenaltyForm({ ...penaltyForm, penalizedPlayer: e.target.value })}
                  className="border rounded p-1"
                >
                  <option value="">Select Player</option>
                  {getPlayersForTeam(penaltyForm.team).map((p) => (
                    <option key={p.name} value={p.name}>{p.name}</option>
                  ))}
                </select>
              </div>
            )}
            <div className="flex flex-col">
              <label>Penalty Type</label>
              <select
                value={penaltyForm.penaltyType}
                onChange={(e) => setPenaltyForm({ ...penaltyForm, penaltyType: e.target.value })}
                className="border rounded p-1"
              >
                <option value="">Select Type</option>
                <option value="Tripping">Tripping</option>
                <option value="Hooking">Hooking</option>
                <option value="Slashing">Slashing</option>
                <option value="Interference">Interference</option>
                <option value="Holding">Holding</option>
                <option value="High Sticking">High Sticking</option>
                <option value="Roughing">Roughing</option>
                <option value="Delay of Game">Delay of Game</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div className="flex flex-col">
              <label>Length (minutes)</label>
              <select
                value={penaltyForm.length}
                onChange={(e) => setPenaltyForm({ ...penaltyForm, length: e.target.value })}
                className="border rounded p-1"
              >
                <option value="">Select Length</option>
                <option value="2">2</option>
                <option value="4">4</option>
                <option value="5">5</option>
                <option value="10">10</option>
              </select>
            </div>
            <div className="flex flex-col">
              <label>Time (mm:ss)</label>
              <input
                type="text"
                value={penaltyForm.time}
                onChange={(e) => setPenaltyForm({ ...penaltyForm, time: e.target.value })}
                className="border rounded p-1"
                placeholder="00:00"
              />
            </div>
            <button
              type="submit"
              disabled={penaltySubmitting}
              className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700"
            >
              {penaltySubmitting ? 'Submitting...' : 'Record Penalty'}
            </button>
          </form>
        </div>
      </div>
      {/* Announcer and DJ controls */}
      <div className="grid gap-8 md:grid-cols-2 mt-8">
        <AnnouncerControls gameId={selectedGame.id || selectedGame.gameId} />
        <DJPanel />
      </div>
      {/* Live event feed */}
      <div className="mt-8">
          <h3 className="text-2xl font-semibold mb-2">Live Event Feed</h3>
          {eventsError && <p className="text-red-500">{eventsError}</p>}
          <ul className="space-y-2">
            {events.map((event) => (
              <li key={event.id} className="border rounded p-2 bg-white shadow">
                {event.scorer ? (
                  <div>
                    <p>
                      <span className="font-semibold">Goal</span> by {event.scorer} for {event.scoringTeam}
                    </p>
                    <p className="text-sm text-gray-600">
                      Assists: {event.assists && event.assists.length > 0 ? event.assists.join(', ') : 'None'} |
                      Shot: {event.shotType} | Type: {event.goalType}
                    </p>
                    <p className="text-sm text-gray-500">Time: {event.time}, Period: {event.period}</p>
                  </div>
                ) : (
                  <div>
                    <p>
                      <span className="font-semibold">Penalty</span> on {event.penalizedPlayer} ({event.team})
                    </p>
                    <p className="text-sm text-gray-600">
                      Type: {event.penaltyType}, Length: {event.length} minutes
                    </p>
                    <p className="text-sm text-gray-500">Time: {event.time}, Period: {event.period}</p>
                  </div>
                )}
              </li>
            ))}
          </ul>
      </div>
    </div>
  );
}