
import React, { useState } from 'react';
import { Game, Team } from '../types';

interface ScheduleProps {
  teams: Team[];
  games: Game[];
  onAddGame: (homeTeamId: string, awayTeamInfo: { id?: string; name?: string }, scheduledTime: string) => void;
  onStartGame: (gameId: string) => void;
  onDeleteGame: (gameId: string) => void;
  onReturnToDashboard: (view: 'dashboard') => void;
  onViewReport: (game: Game) => void;
}

const Schedule: React.FC<ScheduleProps> = ({ teams, games, onAddGame, onStartGame, onDeleteGame, onReturnToDashboard, onViewReport }) => {
  const [homeTeamId, setHomeTeamId] = useState('');
  const [awayTeamName, setAwayTeamName] = useState('');
  const [gameDate, setGameDate] = useState('');

  const handleAddGame = () => {
    const trimmedAwayName = awayTeamName.trim();
    const homeTeam = teams.find(t => t.id === homeTeamId);

    if (homeTeam && trimmedAwayName && gameDate) {
      if (homeTeam.name.toLowerCase() === trimmedAwayName.toLowerCase()) {
        alert("Home and Away teams cannot be the same.");
        return;
      }
      
      const existingAwayTeam = teams.find(t => t.name.toLowerCase() === trimmedAwayName.toLowerCase());
      const awayTeamInfo = existingAwayTeam ? { id: existingAwayTeam.id } : { name: trimmedAwayName };

      onAddGame(homeTeamId, awayTeamInfo, gameDate);
      setHomeTeamId('');
      setAwayTeamName('');
      setGameDate('');
    } else {
        alert("Please fill out all fields to schedule a game.");
    }
  };

  const scheduledGames = games.filter(g => g.status === 'scheduled').sort((a,b) => new Date(a.scheduledTime).getTime() - new Date(b.scheduledTime).getTime());
  const finishedGames = games.filter(g => g.status === 'finished').sort((a,b) => new Date(b.scheduledTime).getTime() - new Date(a.scheduledTime).getTime());


  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-cyan-400">Game Schedule</h1>
        <button onClick={() => onReturnToDashboard('dashboard')} className="bg-gray-600 hover:bg-gray-500 text-white font-semibold py-2 px-4 rounded-lg transition-colors">
          Return to Main Menu
        </button>
      </div>
      
      {teams.length > 0 ? (
        <div className="bg-gray-800 p-4 rounded-lg shadow-lg">
          <h2 className="text-xl font-semibold mb-4">Schedule a New Game</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div className="flex flex-col">
              <label htmlFor="homeTeam" className="text-sm font-medium mb-1">Home Team</label>
              <select id="homeTeam" value={homeTeamId} onChange={e => setHomeTeamId(e.target.value)} className="bg-gray-700 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-500">
                <option value="">Select Home Team</option>
                {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            
            <div className="flex flex-col">
               <label htmlFor="awayTeam" className="text-sm font-medium mb-1">Away Team</label>
                <input 
                    id="awayTeam"
                    type="text" 
                    value={awayTeamName} 
                    onChange={e => setAwayTeamName(e.target.value)} 
                    placeholder="Enter or Select Opponent" 
                    className="bg-gray-700 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-500 w-full"
                    list="teams-list"
                />
                <datalist id="teams-list">
                    {teams.filter(t => t.id !== homeTeamId).map(t => <option key={t.id} value={t.name} />)}
                </datalist>
            </div>

            <div className="flex flex-col">
              <label htmlFor="gameDate" className="text-sm font-medium mb-1">Date and Time</label>
              <input type="datetime-local" id="gameDate" value={gameDate} onChange={e => setGameDate(e.target.value)} className="bg-gray-700 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-500" />
            </div>
          </div>
          <button onClick={handleAddGame} className="mt-4 bg-cyan-500 hover:bg-cyan-600 text-white font-bold py-2 px-4 rounded-md transition-colors w-full md:w-auto">
            Add Game to Schedule
          </button>
        </div>
      ) : (
        <p className="text-gray-400">You need to create at least one team to schedule a game.</p>
      )}

      <div className="bg-gray-800 p-4 rounded-lg shadow-lg">
        <h2 className="text-xl font-semibold mb-2">Upcoming Games</h2>
        <ul className="space-y-2">
          {scheduledGames.map(game => (
            <li key={game.id} className="bg-gray-700 p-3 rounded-md flex flex-col sm:flex-row justify-between sm:items-center">
              <div>
                <p className="font-bold">{game.homeTeam.name} vs {game.awayTeam.name}</p>
                <p className="text-sm text-gray-400">{new Date(game.scheduledTime).toLocaleString()}</p>
              </div>
              <div className="flex space-x-2 mt-2 sm:mt-0">
                <button onClick={() => onStartGame(game.id)} className="bg-green-500 hover:bg-green-600 text-white font-bold py-1 px-3 rounded-md text-sm transition-colors">Start</button>
                <button onClick={() => onDeleteGame(game.id)} className="bg-red-600 hover:bg-red-700 text-white font-bold py-1 px-3 rounded-md text-sm transition-colors">Delete</button>
              </div>
            </li>
          ))}
          {scheduledGames.length === 0 && <p className="text-gray-500">No upcoming games.</p>}
        </ul>
      </div>

      <div className="bg-gray-800 p-4 rounded-lg shadow-lg">
        <h2 className="text-xl font-semibold mb-2">Completed Games</h2>
        <ul className="space-y-2">
          {finishedGames.map(game => (
            <li key={game.id} className="bg-gray-700 p-3 rounded-md flex flex-col sm:flex-row justify-between sm:items-center">
              <div>
                <p className="font-bold">{game.homeTeam.name} vs {game.awayTeam.name}</p>
                <p className="text-lg text-gray-300">{game.score.home} - {game.score.away}</p>
                <p className="text-sm text-gray-400">{new Date(game.scheduledTime).toLocaleDateString()}</p>
              </div>
              <div className="flex space-x-2 mt-2 sm:mt-0">
                <button onClick={() => onViewReport(game)} className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-1 px-3 rounded-md text-sm transition-colors">Report</button>
              </div>
            </li>
          ))}
          {finishedGames.length === 0 && <p className="text-gray-500">No completed games.</p>}
        </ul>
      </div>
    </div>
  );
};

export default Schedule;