import React, { useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GameContext } from '../contexts/game-context.jsx';
import { dashboardService } from '../services/dashboardService.js';

import DJPanel from '../components/dj-panel.jsx';

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

  // Fetch events when game is selected and after user actions
  useEffect(() => {
    if (!selectedGame) return;

    const fetchEvents = async () => {
      try {
        const data = await dashboardService.fetchEvents(selectedGame.id);
        setEvents(data);
      } catch (err) {
        console.error('Failed to fetch events', err);
        setEventsError('Error loading events');
      }
    };
    
    fetchEvents();
    
    // Event-driven updates only - no polling
    // Data will be updated when user submits goals/penalties
  }, [selectedGame]);

  // Goal form state
  const [goalForm, setGoalForm] = useState({
    period: '',
    team: '',
    player: '',
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

  // Function to refresh events after user actions
  const refreshEvents = async () => {
    if (!selectedGame) return;
    try {
      const events = await dashboardService.fetchEvents(selectedGame.id);
      setEvents(events);
    } catch (err) {
      console.error('Failed to refresh events', err);
    }
  };

  const handleGoalSubmit = async (e) => {
    e.preventDefault();
    // Validate required fields
  const required = ['period', 'team', 'player', 'time', 'shotType', 'goalType'];
    for (const field of required) {
      if (!goalForm[field]) {
        setGoalError(`Missing required field: ${field}`);
        return;
      }
    }
    setGoalSubmitting(true);
    setGoalError(null);
    try {
      await dashboardService.submitGoal({
        gameId: selectedGame.id,
        period: goalForm.period,
        team: goalForm.team,
        player: goalForm.player,
        assist: [goalForm.assist1, goalForm.assist2].filter(Boolean)[0] || null, // backend currently supports single assist
        time: goalForm.time,
        shotType: goalForm.shotType,
        goalType: goalForm.goalType,
      });
      // Reset form
      setGoalForm({
        period: '',
        team: '',
        player: '',
        assist1: '',
        assist2: '',
        time: '',
        shotType: '',
        goalType: '',
      });
      // Immediately refresh events after successful submission
      await refreshEvents();
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
      await dashboardService.submitPenalty({
        gameId: selectedGame.id,
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
      // Immediately refresh events after successful submission
      await refreshEvents();
    } catch (err) {
      console.error('Failed to submit penalty', err);
      setPenaltyError('Failed to submit penalty. Please try again.');
    } finally {
      setPenaltySubmitting(false);
    }
  };

  if (!selectedGame) return null;

  return (
    <main className="p-4 max-w-5xl mx-auto" role="main">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-center">
          Game Dashboard: {selectedGame.awayTeam} vs {selectedGame.homeTeam}
        </h1>
      </header>

      {/* Scorekeeper Section */}
      <section className="bg-white rounded-lg shadow-md p-6 mb-8" aria-labelledby="scorekeeper-section">
        <h2 id="scorekeeper-section" className="text-2xl font-bold mb-4">Scorekeeper</h2>
        <div className="grid gap-8 md:grid-cols-2">
          {/* Goal Form */}
          <div className="border rounded shadow p-4">
            <h3 className="text-xl font-semibold mb-2">Record Goal</h3>
            {goalError && (
              <div className="text-red-500 mb-1" role="alert" aria-live="assertive">
                {goalError}
              </div>
            )}
            <form onSubmit={handleGoalSubmit} className="space-y-2" noValidate>
              <fieldset className="flex flex-col">
                <label htmlFor="goal-period" className="font-medium">Period</label>
                <select
                  id="goal-period"
                  value={goalForm.period}
                  onChange={(e) => setGoalForm({ ...goalForm, period: e.target.value })}
                  className="border rounded p-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                  aria-describedby="goal-period-description"
                >
                  <option value="">Select Period</option>
                  <option value="1">1</option>
                  <option value="2">2</option>
                  <option value="3">3</option>
                  <option value="OT">OT</option>
                </select>
                <div id="goal-period-description" className="sr-only">
                  Select the period in which the goal was scored
                </div>
              </fieldset>

              <fieldset className="flex flex-col">
                <label htmlFor="goal-team" className="font-medium">Team</label>
                <select
                  id="goal-team"
                  value={goalForm.team}
                  onChange={(e) => {
                    setGoalForm({ ...goalForm, team: e.target.value, player: '', assist1: '', assist2: '' });
                  }}
                  className="border rounded p-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                  aria-describedby="goal-team-description"
                >
                  <option value="">Select Team</option>
                  <option value={selectedGame.awayTeam}>{selectedGame.awayTeam}</option>
                  <option value={selectedGame.homeTeam}>{selectedGame.homeTeam}</option>
                </select>
                <div id="goal-team-description" className="sr-only">
                  Select the team that scored the goal
                </div>
              </fieldset>

              {goalForm.team && (
                <>
                  <fieldset className="flex flex-col">
                    <label htmlFor="goal-player" className="font-medium">Player</label>
                    <select
                      id="goal-player"
                      value={goalForm.player}
                      onChange={(e) => setGoalForm({ ...goalForm, player: e.target.value })}
                      className="border rounded p-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                      aria-describedby="goal-player-description"
                    >
                      <option value="">Select Player</option>
                      {getPlayersForTeam(goalForm.team).map((p) => (
                        <option key={p.name} value={p.name}>{p.name}</option>
                      ))}
                    </select>
                    <div id="goal-player-description" className="sr-only">
                      Select the player who scored the goal
                    </div>
                  </fieldset>

                  <fieldset className="flex flex-col">
                    <label htmlFor="goal-assist1" className="font-medium">Assist 1 (optional)</label>
                    <select
                      id="goal-assist1"
                      value={goalForm.assist1}
                      onChange={(e) => setGoalForm({ ...goalForm, assist1: e.target.value })}
                      className="border rounded p-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      aria-describedby="goal-assist1-description"
                    >
                      <option value="">None</option>
                      {getPlayersForTeam(goalForm.team).map((p) => (
                        <option key={p.name} value={p.name}>{p.name}</option>
                      ))}
                    </select>
                    <div id="goal-assist1-description" className="sr-only">
                      Select the first assist on the goal
                    </div>
                  </fieldset>

                  <fieldset className="flex flex-col">
                    <label htmlFor="goal-assist2" className="font-medium">Assist 2 (optional)</label>
                    <select
                      id="goal-assist2"
                      value={goalForm.assist2}
                      onChange={(e) => setGoalForm({ ...goalForm, assist2: e.target.value })}
                      className="border rounded p-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      aria-describedby="goal-assist2-description"
                    >
                      <option value="">None</option>
                      {getPlayersForTeam(goalForm.team).map((p) => (
                        <option key={p.name} value={p.name}>{p.name}</option>
                      ))}
                    </select>
                    <div id="goal-assist2-description" className="sr-only">
                      Select the second assist on the goal
                    </div>
                  </fieldset>
                </>
              )}

              <fieldset className="flex flex-col">
                <label htmlFor="goal-time" className="font-medium">Time (mm:ss)</label>
                <input
                  id="goal-time"
                  type="text"
                  value={goalForm.time}
                  onChange={(e) => setGoalForm({ ...goalForm, time: e.target.value })}
                  className="border rounded p-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="00:00"
                  required
                  aria-describedby="goal-time-description"
                  pattern="[0-9]{1,2}:[0-9]{2}"
                />
                <div id="goal-time-description" className="sr-only">
                  Enter the time remaining when the goal was scored in MM:SS format
                </div>
              </fieldset>

              <fieldset className="flex flex-col">
                <label htmlFor="goal-shot-type" className="font-medium">Shot Type</label>
                <select
                  id="goal-shot-type"
                  value={goalForm.shotType}
                  onChange={(e) => setGoalForm({ ...goalForm, shotType: e.target.value })}
                  className="border rounded p-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                  aria-describedby="goal-shot-type-description"
                >
                  <option value="">Select Shot Type</option>
                  <option value="Wrist Shot">Wrist Shot</option>
                  <option value="Slap Shot">Slap Shot</option>
                  <option value="Backhand">Backhand</option>
                  <option value="Tip-In">Tip-In</option>
                  <option value="Wraparound">Wraparound</option>
                  <option value="Other">Other</option>
                </select>
                <div id="goal-shot-type-description" className="sr-only">
                  Select the type of shot used to score the goal
                </div>
              </fieldset>

              <fieldset className="flex flex-col">
                <label htmlFor="goal-type" className="font-medium">Goal Type</label>
                <select
                  id="goal-type"
                  value={goalForm.goalType}
                  onChange={(e) => setGoalForm({ ...goalForm, goalType: e.target.value })}
                  className="border rounded p-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                  aria-describedby="goal-type-description"
                >
                  <option value="">Select Goal Type</option>
                  <option value="Regular">Regular</option>
                  <option value="Breakaway">Breakaway</option>
                  <option value="Power Play">Power Play</option>
                  <option value="Short-Handed">Short-Handed</option>
                  <option value="Empty Net">Empty Net</option>
                  <option value="Penalty Shot">Penalty Shot</option>
                </select>
                <div id="goal-type-description" className="sr-only">
                  Select the circumstances under which the goal was scored
                </div>
              </fieldset>

              <button
                type="submit"
                disabled={goalSubmitting}
                className="px-4 py-2 rounded bg-green-600 text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50"
                aria-describedby="goal-submit-description"
              >
                {goalSubmitting ? 'Submitting...' : 'Record Goal'}
              </button>
              <div id="goal-submit-description" className="sr-only">
                Submit the goal information to record it in the game
              </div>
            </form>
          </div>
          {/* Penalty Form */}
          <div className="border rounded shadow p-4">
            <h3 className="text-xl font-semibold mb-2">Record Penalty</h3>
            {penaltyError && (
              <div className="text-red-500 mb-1" role="alert" aria-live="assertive">
                {penaltyError}
              </div>
            )}
            <form onSubmit={handlePenaltySubmit} className="space-y-2" noValidate>
              <fieldset className="flex flex-col">
                <label htmlFor="penalty-period" className="font-medium">Period</label>
                <select
                  id="penalty-period"
                  value={penaltyForm.period}
                  onChange={(e) => setPenaltyForm({ ...penaltyForm, period: e.target.value })}
                  className="border rounded p-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                  aria-describedby="penalty-period-description"
                >
                  <option value="">Select Period</option>
                  <option value="1">1</option>
                  <option value="2">2</option>
                  <option value="3">3</option>
                  <option value="OT">OT</option>
                </select>
                <div id="penalty-period-description" className="sr-only">
                  Select the period in which the penalty occurred
                </div>
              </fieldset>

              <fieldset className="flex flex-col">
                <label htmlFor="penalty-team" className="font-medium">Team</label>
                <select
                  id="penalty-team"
                  value={penaltyForm.team}
                  onChange={(e) => setPenaltyForm({ ...penaltyForm, team: e.target.value, penalizedPlayer: '' })}
                  className="border rounded p-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                  aria-describedby="penalty-team-description"
                >
                  <option value="">Select Team</option>
                  <option value={selectedGame.awayTeam}>{selectedGame.awayTeam}</option>
                  <option value={selectedGame.homeTeam}>{selectedGame.homeTeam}</option>
                </select>
                <div id="penalty-team-description" className="sr-only">
                  Select the team that committed the penalty
                </div>
              </fieldset>

              {penaltyForm.team && (
                <fieldset className="flex flex-col">
                  <label htmlFor="penalty-player" className="font-medium">Player</label>
                  <select
                    id="penalty-player"
                    value={penaltyForm.penalizedPlayer}
                    onChange={(e) => setPenaltyForm({ ...penaltyForm, penalizedPlayer: e.target.value })}
                    className="border rounded p-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                    aria-describedby="penalty-player-description"
                  >
                    <option value="">Select Player</option>
                    {getPlayersForTeam(penaltyForm.team).map((p) => (
                      <option key={p.name} value={p.name}>{p.name}</option>
                    ))}
                  </select>
                  <div id="penalty-player-description" className="sr-only">
                    Select the player who received the penalty
                  </div>
                </fieldset>
              )}

              <fieldset className="flex flex-col">
                <label htmlFor="penalty-type" className="font-medium">Penalty Type</label>
                <select
                  id="penalty-type"
                  value={penaltyForm.penaltyType}
                  onChange={(e) => setPenaltyForm({ ...penaltyForm, penaltyType: e.target.value })}
                  className="border rounded p-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                  aria-describedby="penalty-type-description"
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
                <div id="penalty-type-description" className="sr-only">
                  Select the type of penalty committed
                </div>
              </fieldset>

              <fieldset className="flex flex-col">
                <label htmlFor="penalty-length" className="font-medium">Length (minutes)</label>
                <select
                  id="penalty-length"
                  value={penaltyForm.length}
                  onChange={(e) => setPenaltyForm({ ...penaltyForm, length: e.target.value })}
                  className="border rounded p-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                  aria-describedby="penalty-length-description"
                >
                  <option value="">Select Length</option>
                  <option value="2">2</option>
                  <option value="4">4</option>
                  <option value="5">5</option>
                  <option value="10">10</option>
                </select>
                <div id="penalty-length-description" className="sr-only">
                  Select the duration of the penalty in minutes
                </div>
              </fieldset>

              <fieldset className="flex flex-col">
                <label htmlFor="penalty-time" className="font-medium">Time (mm:ss)</label>
                <input
                  id="penalty-time"
                  type="text"
                  value={penaltyForm.time}
                  onChange={(e) => setPenaltyForm({ ...penaltyForm, time: e.target.value })}
                  className="border rounded p-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="00:00"
                  required
                  aria-describedby="penalty-time-description"
                  pattern="[0-9]{1,2}:[0-9]{2}"
                />
                <div id="penalty-time-description" className="sr-only">
                  Enter the time when the penalty occurred in MM:SS format
                </div>
              </fieldset>

              <button
                type="submit"
                disabled={penaltySubmitting}
                className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50"
                aria-describedby="penalty-submit-description"
              >
                {penaltySubmitting ? 'Submitting...' : 'Record Penalty'}
              </button>
              <div id="penalty-submit-description" className="sr-only">
                Submit the penalty information to record it in the game
              </div>
            </form>
          </div>
        </div>
      </section>

      {/* DJ controls */}
      <section className="mt-8" aria-labelledby="dj-controls-section">
        <h2 id="dj-controls-section" className="sr-only">DJ Controls</h2>
        <DJPanel />
      </section>

      {/* Live event feed */}
      <section className="mt-8" aria-labelledby="event-feed-section">
        <h2 id="event-feed-section" className="text-2xl font-semibold mb-2">Live Event Feed</h2>
        {eventsError && (
          <div className="text-red-500" role="alert" aria-live="assertive">
            {eventsError}
          </div>
        )}
        <ul className="space-y-2" role="log" aria-live="polite" aria-label="Live game events">
          {events.map((event) => (
            <li key={event.id} className="border rounded p-2 bg-white shadow">
              {event.eventType === 'goal' ? (
                <article>
                  <p><span className="font-semibold">Goal</span> by {event.playerName || event.scorer} for {event.teamName || event.scoringTeam}</p>
                  <p className="text-sm text-gray-600">
                    Assists: {(event.assistedBy || event.assists || []).length > 0 ? (event.assistedBy || event.assists).join(', ') : 'None'} | Shot: {event.shotType} | Type: {event.goalType}
                  </p>
                  <p className="text-sm text-gray-500">Time: {event.timeRemaining || event.time}, Period: {event.period}</p>
                </article>
              ) : (
                <article>
                  <p><span className="font-semibold">Penalty</span> on {event.playerName || event.penalizedPlayer} ({event.teamName || event.penalizedTeam || event.team})</p>
                  <p className="text-sm text-gray-600">
                    Type: {event.penaltyType}, Length: {event.length || event.penaltyLength} minutes
                  </p>
                  <p className="text-sm text-gray-500">Time: {event.timeRemaining || event.time}, Period: {event.period}</p>
                </article>
              )}
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}