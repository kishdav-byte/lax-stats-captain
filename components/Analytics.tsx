import React, { useMemo, useState, useCallback } from 'react';
import { Game, Player, Stat, StatType, Team } from '../types';
import { analyzePlayerPerformance, PlayerAnalysisData } from '../services/geminiService';

interface AnalyticsProps {
  teams: Team[];
  games: Game[];
  onReturnToDashboard: () => void;
}

type SortKey = 'name' | 'teamName' | 'gamesPlayed' | StatType;
type SortDirection = 'asc' | 'desc';

interface AggregatedStats {
  playerId: string;
  name: string;
  jerseyNumber: string;
  position: string;
  teamName: string;
  teamId: string;
  gamesPlayed: number;
  stats: { [key in StatType]?: number };
}

const AnalysisModal: React.FC<{
    player: AggregatedStats;
    onClose: () => void;
}> = ({ player, onClose }) => {
    const [analysis, setAnalysis] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    const getAnalysis = useCallback(async () => {
        setIsLoading(true);
        setError('');
        try {
            const analysisData: PlayerAnalysisData = {
                name: player.name,
                position: player.position,
                totalGames: player.gamesPlayed,
                stats: player.stats,
            };
            const result = await analyzePlayerPerformance(analysisData);
            setAnalysis(result);
        } catch (e: any) {
            setError(e.message || "An unknown error occurred.");
        } finally {
            setIsLoading(false);
        }
    }, [player]);

    React.useEffect(() => {
        getAnalysis();
    }, [getAnalysis]);
    
    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 p-6 rounded-lg shadow-xl max-w-2xl w-full">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold">AI Analysis for <span className="text-cyan-400">{player.name}</span></h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white text-3xl leading-none">&times;</button>
                </div>
                {isLoading && <p className="text-center animate-pulse">The AI is analyzing the player's performance...</p>}
                {error && <p className="text-red-400 text-center">{error}</p>}
                {analysis && (
                     <div className="prose prose-invert prose-sm max-w-none text-gray-300 bg-gray-900 p-4 rounded-md max-h-96 overflow-y-auto" dangerouslySetInnerHTML={{ __html: analysis.replace(/\n/g, '<br />') }}>
                        {/* The analysis content will be rendered here */}
                    </div>
                )}
                 <div className="mt-4 flex justify-end">
                    <button onClick={onClose} className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-md">Close</button>
                 </div>
            </div>
        </div>
    );
};


const Analytics: React.FC<AnalyticsProps> = ({ teams, games, onReturnToDashboard }) => {
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: SortDirection }>({ key: 'name', direction: 'asc' });
  const [analyzingPlayer, setAnalyzingPlayer] = useState<AggregatedStats | null>(null);

  const aggregatedStats: AggregatedStats[] = useMemo(() => {
    const playerStatsMap: { [playerId: string]: AggregatedStats } = {};

    teams.forEach(team => {
      team.roster.forEach(player => {
        playerStatsMap[player.id] = {
          playerId: player.id,
          name: player.name,
          jerseyNumber: player.jerseyNumber,
          position: player.position,
          teamName: team.name,
          teamId: team.id,
          gamesPlayed: 0,
          stats: {},
        };
      });
    });

    games.forEach(game => {
      if (game.status !== 'finished') return;
      
      const gamePlayerIds = new Set<string>();
      game.stats.forEach(stat => {
        gamePlayerIds.add(stat.playerId);
        if (stat.assistingPlayerId) {
          gamePlayerIds.add(stat.assistingPlayerId);
        }
      });
      
      gamePlayerIds.forEach(playerId => {
        if (playerStatsMap[playerId]) {
          playerStatsMap[playerId].gamesPlayed += 1;
        }
      });

      game.stats.forEach(stat => {
        const playerAgg = playerStatsMap[stat.playerId];
        if (playerAgg) {
          playerAgg.stats[stat.type] = (playerAgg.stats[stat.type] || 0) + 1;
          if (stat.type === StatType.GOAL && stat.assistingPlayerId) {
            const assistPlayerAgg = playerStatsMap[stat.assistingPlayerId];
            if (assistPlayerAgg) {
              assistPlayerAgg.stats[StatType.ASSIST] = (assistPlayerAgg.stats[StatType.ASSIST] || 0) + 1;
            }
          }
        }
      });
    });

    return Object.values(playerStatsMap);
  }, [teams, games]);
  
  const sortedPlayers = useMemo(() => {
    let sortablePlayers = [...aggregatedStats];
    if (sortConfig.key) {
        sortablePlayers.sort((a, b) => {
            const aVal = sortConfig.key in StatType ? (a.stats[sortConfig.key as StatType] || 0) : a[sortConfig.key as 'name' | 'teamName' | 'gamesPlayed'];
            const bVal = sortConfig.key in StatType ? (b.stats[sortConfig.key as StatType] || 0) : b[sortConfig.key as 'name' | 'teamName' | 'gamesPlayed'];

            if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
    }
    return sortablePlayers;
  }, [aggregatedStats, sortConfig]);

  const requestSort = (key: SortKey) => {
    let direction: SortDirection = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
        direction = 'desc';
    }
    setSortConfig({ key, direction });
  };
  
  const statColumns: { key: StatType, label: string }[] = [
    StatType.GOAL, StatType.ASSIST, StatType.SHOT, StatType.GROUND_BALL,
    StatType.TURNOVER, StatType.CAUSED_TURNOVER, StatType.SAVE, StatType.FACEOFF_WIN
  ].map(key => ({ key, label: key }));


  return (
    <>
    {analyzingPlayer && <AnalysisModal player={analyzingPlayer} onClose={() => setAnalyzingPlayer(null)} />}
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-cyan-400">Player Analytics</h1>
        <button onClick={onReturnToDashboard} className="bg-gray-600 hover:bg-gray-500 text-white font-semibold py-2 px-4 rounded-lg transition-colors">
          Return to Dashboard
        </button>
      </div>

      <div className="bg-gray-800 p-4 rounded-lg shadow-lg">
        <p className="text-gray-400 mb-4 text-sm">
          This table aggregates player statistics across all completed games. Click on any column header to sort. Use the AI analysis to get coaching insights on a player's performance.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px] text-sm text-left">
            <thead className="bg-gray-700 text-xs uppercase tracking-wider">
              <tr>
                {[{key: 'name', label: 'Player'}, {key: 'teamName', label: 'Team'}, {key: 'gamesPlayed', label: 'Games'}].map(({key, label}) => (
                  <th key={key} className="p-2 cursor-pointer" onClick={() => requestSort(key as SortKey)}>
                    {label} {sortConfig.key === key ? (sortConfig.direction === 'asc' ? '▲' : '▼') : ''}
                  </th>
                ))}
                {statColumns.map(({ key, label }) => (
                  <th key={key} className="p-2 text-center cursor-pointer" onClick={() => requestSort(key)}>
                    {label.substring(0, 3)} {sortConfig.key === key ? (sortConfig.direction === 'asc' ? '▲' : '▼') : ''}
                  </th>
                ))}
                <th className="p-2 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedPlayers.map(player => (
                <tr key={player.playerId} className="border-b border-gray-700 hover:bg-gray-600">
                  <td className="p-2 font-bold">{player.name} <span className="text-cyan-400 text-xs">#{player.jerseyNumber}</span></td>
                  <td className="p-2 text-gray-400">{player.teamName}</td>
                  <td className="p-2 text-center text-gray-400">{player.gamesPlayed}</td>
                  {statColumns.map(({ key }) => (
                    <td key={key} className="p-2 text-center">{player.stats[key] || 0}</td>
                  ))}
                  <td className="p-2 text-center">
                    <button onClick={() => setAnalyzingPlayer(player)} className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-1 px-3 rounded-md text-xs transition-colors">
                        Analyze with AI
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {sortedPlayers.length === 0 && <p className="text-center text-gray-500 py-8">No player stats available. Complete a game to see data here.</p>}
        </div>
      </div>
    </div>
    </>
  );
};

export default Analytics;