import React from 'react';
import { Game } from '../types';
import { View } from '../services/storageService';

interface DashboardProps {
  games: Game[];
  onStartGame: (gameId: string) => void;
  onViewChange: (view: View) => void;
  activeGameId: string | null;
  onViewReport: (game: Game) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ games, onStartGame, onViewChange, activeGameId, onViewReport }) => {
  const upcomingGames = games.filter(g => g.status === 'scheduled').sort((a, b) => new Date(a.scheduledTime).getTime() - new Date(b.scheduledTime).getTime());
  const finishedGames = games.filter(g => g.status === 'finished').sort((a, b) => new Date(b.scheduledTime).getTime() - new Date(a.scheduledTime).getTime());
  const activeGame = games.find(g => g.id === activeGameId);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-cyan-400">Dashboard</h1>
        <p className="text-gray-400 mt-1">Welcome to your lacrosse management hub.</p>
      </div>

      {activeGame && (
        <div className="bg-green-800 border-2 border-green-500 p-6 rounded-lg shadow-xl text-center">
            <h2 className="text-2xl font-semibold text-white animate-pulse">Live Game in Progress!</h2>
            <p className="text-gray-300 mt-2">{activeGame.homeTeam.name} vs {activeGame.awayTeam.name}</p>
            <button 
                onClick={() => onViewChange('game')} 
                className="mt-4 bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-6 rounded-lg text-lg transition-colors"
            >
                Resume Game
            </button>
        </div>
      )}
      
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-gray-800 p-6 rounded-lg shadow-xl hover:shadow-cyan-500/20 transition-shadow duration-300 cursor-pointer" onClick={() => onViewChange('teams')}>
          <h2 className="text-2xl font-semibold">Manage Teams</h2>
          <p className="text-gray-400 mt-2">Create your team, add players, and set your roster.</p>
        </div>
        <div className="bg-gray-800 p-6 rounded-lg shadow-xl hover:shadow-cyan-500/20 transition-shadow duration-300 cursor-pointer" onClick={() => onViewChange('schedule')}>
          <h2 className="text-2xl font-semibold">Schedule Season</h2>
          <p className="text-gray-400 mt-2">Set up your game schedule for the entire season.</p>
        </div>
      </div>
      
      <div>
        <h2 className="text-2xl font-semibold border-b-2 border-gray-700 pb-2 mb-4">Upcoming Games</h2>
        {upcomingGames.length > 0 ? (
          <div className="space-y-4">
            {upcomingGames.slice(0, 3).map(game => (
              <div key={game.id} className="bg-gray-800 p-4 rounded-lg flex items-center justify-between">
                <div>
                  <p className="font-bold text-lg">{game.homeTeam.name} vs {game.awayTeam.name}</p>
                  <p className="text-sm text-gray-400">{new Date(game.scheduledTime).toLocaleString()}</p>
                </div>
                <button onClick={() => onStartGame(game.id)} className="bg-cyan-500 hover:bg-cyan-600 text-white font-bold py-2 px-4 rounded-lg transition-colors">
                  Start Game
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500">No upcoming games scheduled.</p>
        )}
      </div>
      
       <div>
        <h2 className="text-2xl font-semibold border-b-2 border-gray-700 pb-2 mb-4">Recent Games</h2>
        {finishedGames.length > 0 ? (
          <div className="space-y-4">
            {finishedGames.slice(0, 3).map(game => (
              <div key={game.id} className="bg-gray-800 p-4 rounded-lg flex items-center justify-between">
                <div>
                  <p className="font-bold text-lg">{game.homeTeam.name} vs {game.awayTeam.name}</p>
                   <p className="text-lg text-gray-300">{game.score.home} - {game.score.away}</p>
                  <p className="text-sm text-gray-400">{new Date(game.scheduledTime).toLocaleDateString()}</p>
                </div>
                <button 
                  onClick={() => onViewReport(game)} 
                  className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-lg transition-colors"
                >
                  View Report
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500">No completed games yet.</p>
        )}
      </div>

    </div>
  );
};

export default Dashboard;