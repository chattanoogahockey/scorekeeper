import React, { useEffect, useState, useContext } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { GameContext } from '../contexts/GameContext.jsx';

export default function LeagueGameSelection() {
  const navigate = useNavigate();
  const { setSelectedLeague, setSelectedGame, reset, setRosters } = useContext(GameContext);
  const [leagues, setLeagues] = useState([]);
  const [games, setGames] = useState([]);
  const [loadingGames, setLoadingGames] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Reset context when visiting selection page
    reset();
    axios.get('/api/leagues')
      .then((res) => setLeagues(res.data))
      .catch((err) => console.error('Failed to load leagues', err));
  }, []);

  const handleLeagueSelect = async (league) => {
    setSelectedLeague(league.id);
    setGames([]);
    setLoadingGames(true);
    setError(null);
    try {
      const res = await axios.get('/api/games', { params: { league: league.name || league.id } });
      setGames(res.data);
    } catch (err) {
      console.error(err);
      setError('Failed to load games');
    } finally {
      setLoadingGames(false);
    }
  };

  const handleGameSelect = async (game) => {
    setSelectedGame(game);
    try {
      // Load rosters for game using gameId from your data structure
      const res = await axios.get('/api/rosters', { params: { gameId: game.gameId } });
      setRosters(res.data || []);
    } catch (err) {
      console.error('Failed to load rosters', err);
    }
    navigate('/roster');
  };

  return (
    <div className="min-h-screen flex flex-col items-center p-4">
      <h1 className="text-3xl font-bold mb-4">Select League & Game</h1>
      <div className="mb-6 flex space-x-4">
        {leagues.map((league) => (
          <button
            key={league.id}
            onClick={() => handleLeagueSelect(league)}
            className="px-4 py-2 rounded bg-blue-500 text-white hover:bg-blue-600 focus:outline-none"
          >
            {league.name}
          </button>
        ))}
      </div>
      {loadingGames && <p>Loading games...</p>}
      {error && <p className="text-red-500">{error}</p>}
      <div className="grid md:grid-cols-2 gap-4 w-full max-w-3xl">
        {games.map((game) => (
          <div
            key={game.gameId}
            className="border rounded shadow p-4 cursor-pointer hover:bg-gray-100"
            onClick={() => handleGameSelect(game)}
          >
            <p className="font-semibold">
              {game.awayTeam || game.awayTeamId} vs {game.homeTeam || game.homeTeamId}
            </p>
            <p className="text-sm text-gray-600">
              {new Date(game.gameDate).toLocaleString()}
            </p>
            <p className="text-sm text-gray-500">
              Status: {game.status}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}