import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Game, StatType, Stat, Player, Team, Penalty, PenaltyType, User, Role } from '../types';
import { generateGameSummary } from '../services/geminiService';

interface GameTrackerProps {
  game: Game;
  onUpdateGame: (game: Game) => void;
  onReturnToDashboard: () => void;
  currentUser: User;
  onViewReport: (game: Game) => void;
}

const STAT_DEFINITIONS: { key: StatType, label: string }[] = [
    { key: StatType.GOAL, label: 'G' },
    { key: StatType.ASSIST, label: 'A' },
    { key: StatType.SHOT, label: 'SHT' },
    { key: StatType.GROUND_BALL, label: 'GB' },
    { key: StatType.TURNOVER, label: 'TO' },
    { key: StatType.CAUSED_TURNOVER, label: 'CT' },
    { key: StatType.SAVE, label: 'SV' },
    { key: StatType.FACEOFF_WIN, label: 'FOW' },
    { key: StatType.FACEOFF_LOSS, label: 'FOL' }
];


const StatsTable: React.FC<{ team: Team, playerStats: { [playerId: string]: { [key in StatType]?: number } } }> = ({ team, playerStats }) => {
    
    const teamTotals = STAT_DEFINITIONS.reduce((acc, statDef) => {
        acc[statDef.key] = team.roster.reduce((sum, player) => sum + (playerStats[player.id]?.[statDef.key] || 0), 0);
        return acc;
    }, {} as { [key in StatType]?: number });

    const totalGoals = teamTotals[StatType.GOAL] || 0;
    const totalAssists = teamTotals[StatType.ASSIST] || 0;

    return (
        <div className="bg-gray-800 p-4 rounded-lg shadow-lg">
            <h3 className="text-xl font-bold mb-2 text-cyan-400">{team.name} - Final Stats</h3>
            <div className="overflow-x-auto">
                <table className="w-full min-w-[700px] text-sm text-left">
                    <thead className="bg-gray-700 text-xs uppercase tracking-wider">
                        <tr>
                            <th className="p-2">#</th>
                            <th className="p-2">Player</th>
                            <th className="p-2">Pos</th>
                            <th className="p-2 text-center">G</th>
                            <th className="p-2 text-center">A</th>
                            <th className="p-2 text-center">P</th>
                            {STAT_DEFINITIONS.filter(s => s.key !== StatType.GOAL && s.key !== StatType.ASSIST).map(s => (
                                <th key={s.key} className="p-2 text-center">{s.label}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {team.roster.map(player => {
                            const stats = playerStats[player.id] || {};
                            const goals = stats[StatType.GOAL] || 0;
                            const assists = stats[StatType.ASSIST] || 0;
                            const points = goals + assists;
                            return (
                                <tr key={player.id} className="border-b border-gray-700 hover:bg-gray-600">
                                    <td className="p-2 font-bold text-cyan-400">{player.jerseyNumber}</td>
                                    <td className="p-2">{player.name}</td>
                                    <td className="p-2 text-gray-400">{player.position}</td>
                                    <td className="p-2 text-center">{goals}</td>
                                    <td className="p-2 text-center">{assists}</td>
                                    <td className="p-2 text-center font-bold">{points}</td>
                                    {STAT_DEFINITIONS.filter(s => s.key !== StatType.GOAL && s.key !== StatType.ASSIST).map(s => (
                                       <td key={s.key} className="p-2 text-center">{(stats[s.key] || 0)}</td> 
                                    ))}
                                </tr>
                            );
                        })}
                    </tbody>
                    <tfoot className="bg-gray-700 font-bold">
                        <tr>
                            <td colSpan={3} className="p-2 text-right">Team Totals</td>
                            <td className="p-2 text-center">{totalGoals}</td>
                            <td className="p-2 text-center">{totalAssists}</td>
                            <td className="p-2 text-center">{totalGoals + totalAssists}</td>
                            {STAT_DEFINITIONS.filter(s => s.key !== StatType.GOAL && s.key !== StatType.ASSIST).map(s => (
                                <td key={s.key} className="p-2 text-center">{teamTotals[s.key] || 0}</td>
                            ))}
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>
    );
};

const RosterColumn: React.FC<{
  team: Game['homeTeam'];
  onSelectPlayer: (player: Player, teamId: string) => void;
  selectedPlayerId: string | null;
}> = ({ team, onSelectPlayer, selectedPlayerId }) => (
  <div className="space-y-2">
    <h3 className="text-xl font-bold text-center">{team.name}</h3>
    {team.roster.map(player => (
      <div
        key={player.id}
        onClick={() => onSelectPlayer(player, team.id)}
        className={`p-2 rounded-lg flex items-center space-x-4 cursor-pointer transition-all duration-200 ${
          selectedPlayerId === player.id
            ? 'bg-cyan-800 ring-2 ring-cyan-400'
            : 'bg-gray-800 hover:bg-gray-700'
        }`}
      >
        <p className="font-bold text-lg text-cyan-400 w-10 text-center">#{player.jerseyNumber}</p>
        <p className="text-md truncate">{player.name}</p>
      </div>
    ))}
  </div>
);

const StatEntryButton: React.FC<{label: string, onClick: () => void, className?: string}> = ({label, onClick, className}) => (
    <button onClick={onClick} className={`p-3 w-full rounded-lg font-semibold transition-colors text-sm ${className}`}>
        {label}
    </button>
);

const formatTime = (seconds: number) => {
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    return `${min}:${sec < 10 ? '0' : ''}${sec}`;
};

const PenaltyBox: React.FC<{ penalties: Penalty[], clock: number, homeTeam: Team, awayTeam: Team }> = ({ penalties, clock, homeTeam, awayTeam }) => {
  const activePenalties = penalties.filter(p => clock > p.releaseTime).sort((a,b) => a.releaseTime - b.releaseTime);

  const getPlayerInfo = (playerId: string, teamId: string) => {
      const team = teamId === homeTeam.id ? homeTeam : awayTeam;
      const player = team.roster.find(p => p.id === playerId);
      return { teamName: team.name, player };
  };

  if (activePenalties.length === 0) {
    return null; // Don't render if no penalties
  }

  return (
    <div className="my-4 bg-gray-800 p-4 rounded-lg shadow-lg">
      <h3 className="text-xl font-semibold mb-2 text-center text-yellow-400">Penalty Box</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
        {activePenalties.map(penalty => {
          const { teamName, player } = getPlayerInfo(penalty.playerId, penalty.teamId);
          const remainingTime = clock - penalty.releaseTime;
          return (
            <div key={penalty.id} className="bg-gray-700 p-2 rounded-md text-center">
              <p className="font-bold text-lg">{teamName} - #{player?.jerseyNumber} {player?.name}</p>
              <p className="text-sm text-gray-400">{penalty.type} ({penalty.duration}s)</p>
              <p className="font-mono text-2xl font-bold text-yellow-400">{formatTime(remainingTime)}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const PenaltyModal: React.FC<{
    isOpen: boolean;
    player: Player;
    teamName: string;
    onClose: () => void;
    onAddPenalty: (penaltyType: PenaltyType, duration: number) => void;
}> = ({ isOpen, player, teamName, onClose, onAddPenalty }) => {
    const [type, setType] = useState<PenaltyType>(PenaltyType.SLASHING);
    const [duration, setDuration] = useState(30);

    if (!isOpen) return null;

    const handleSubmit = () => {
        onAddPenalty(type, duration);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
            <div className="bg-gray-800 p-6 rounded-lg shadow-xl max-w-md w-full">
                <h2 className="text-2xl font-bold mb-4">Add Penalty</h2>
                <p className="mb-4">For <span className="font-bold text-cyan-400">#{player.jerseyNumber} {player.name}</span> ({teamName})</p>
                
                <div className="mb-4">
                    <label className="block text-sm font-medium mb-1">Penalty Type</label>
                    <select value={type} onChange={e => setType(e.target.value as PenaltyType)} className="w-full bg-gray-700 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-500">
                        {Object.values(PenaltyType).map(ptype => <option key={ptype} value={ptype}>{ptype}</option>)}
                    </select>
                </div>

                <div className="mb-4">
                    <label className="block text-sm font-medium mb-1">Duration</label>
                    <div className="grid grid-cols-5 gap-2">
                        {[30, 60, 90, 120, 180].map(d => (
                             <button key={d} onClick={() => setDuration(d)} className={`py-2 rounded-md ${duration === d ? 'bg-cyan-600' : 'bg-gray-700 hover:bg-gray-600'}`}>
                                {d}s
                            </button>
                        ))}
                    </div>
                </div>

                 <div className="mt-6 flex justify-end space-x-2">
                     <button onClick={onClose} className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-md">Cancel</button>
                     <button onClick={handleSubmit} className="bg-cyan-500 hover:bg-cyan-600 text-white font-bold py-2 px-4 rounded-md">Add Penalty</button>
                </div>
            </div>
        </div>
    );
};


const GameTracker: React.FC<GameTrackerProps> = ({ game, onUpdateGame, onReturnToDashboard, currentUser, onViewReport }) => {
  const [clock, setClock] = useState(game.gameClock);
  const [isClockRunning, setIsClockRunning] = useState(false);
  const [assistModal, setAssistModal] = useState<{ show: boolean, scoringPlayer: Player | null, scoringTeamId: string | null }>({ show: false, scoringPlayer: null, scoringTeamId: null });
  const [isPenaltyModalOpen, setIsPenaltyModalOpen] = useState(false);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [selectedPlayerInfo, setSelectedPlayerInfo] = useState<{ player: Player; teamId: string } | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const playBuzzer = useCallback(() => {
    if (!audioCtxRef.current) {
      try {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      } catch (e) {
        console.error("Web Audio API is not supported in this browser.");
        return;
      }
    }
    const audioCtx = audioCtxRef.current;
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(800, audioCtx.currentTime);
    gainNode.gain.setValueAtTime(0.5, audioCtx.currentTime);
    oscillator.start();
    oscillator.stop(audioCtx.currentTime + 0.8);
  }, []);

  const speak = useCallback((text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.3;
      window.speechSynthesis.speak(utterance);
    }
  }, []);

  useEffect(() => {
    let timer: number;
    if (isClockRunning && clock > 0) {
      timer = window.setInterval(() => {
        setClock(prevClock => {
          const newClock = prevClock - 1;
          if (newClock <= 10 && newClock > 0) {
            speak(String(newClock));
          } else if (newClock === 0) {
            if ('speechSynthesis' in window) {
              window.speechSynthesis.cancel();
            }
            playBuzzer();
          }
          return newClock;
        });
      }, 1000);
    }
    return () => {
      clearInterval(timer);
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [isClockRunning, clock, playBuzzer, speak]);

  useEffect(() => {
    onUpdateGame({ ...game, gameClock: clock });
     // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clock]);
  
  const adjustClock = (seconds: number) => {
    setClock(prev => Math.max(0, prev + seconds));
  };

  const handleStatAdd = useCallback((player: Player, teamId: string, type: StatType, assistingPlayerId?: string) => {
    const newStat: Stat = {
      id: `stat_${Date.now()}`,
      playerId: player.id,
      teamId: teamId,
      type: type,
      timestamp: clock,
      assistingPlayerId
    };

    let newScore = { ...game.score };
    if (type === StatType.GOAL) {
      if (teamId === game.homeTeam.id) newScore.home++;
      else newScore.away++;
    }

    onUpdateGame({ ...game, stats: [...game.stats, newStat], score: newScore });
  }, [game, onUpdateGame, clock]);

  const handleManualScoreChange = (teamType: 'home' | 'away', delta: 1 | -1) => {
    const newScore = { ...game.score };
    newScore[teamType] = Math.max(0, newScore[teamType] + delta);
    onUpdateGame({ ...game, score: newScore });
  };

  const handleStatButtonClick = (type: StatType) => {
    if (selectedPlayerInfo) {
      handleStatAdd(selectedPlayerInfo.player, selectedPlayerInfo.teamId, type);
      setSelectedPlayerInfo(null);
    }
  };
  
  const openAssistModal = () => {
    if (!selectedPlayerInfo) return;
    setIsClockRunning(false);
    setAssistModal({ show: true, scoringPlayer: selectedPlayerInfo.player, scoringTeamId: selectedPlayerInfo.teamId });
  };

  const handleAssistSelection = (assistingPlayer: Player | null) => {
    if(assistModal.scoringPlayer && assistModal.scoringTeamId){
       handleStatAdd(assistModal.scoringPlayer, assistModal.scoringTeamId, StatType.GOAL, assistingPlayer?.id);
    }
    setAssistModal({ show: false, scoringPlayer: null, scoringTeamId: null });
    setSelectedPlayerInfo(null);
  };

  const handleAddPenalty = (penaltyType: PenaltyType, duration: number) => {
    if (!selectedPlayerInfo) return;

    const newPenalty: Penalty = {
        id: `penalty_${Date.now()}`,
        playerId: selectedPlayerInfo.player.id,
        teamId: selectedPlayerInfo.teamId,
        type: penaltyType,
        duration,
        startTime: clock,
        releaseTime: clock - duration,
    };

    onUpdateGame({ ...game, penalties: [...(game.penalties || []), newPenalty] });
    setIsPenaltyModalOpen(false);
    setSelectedPlayerInfo(null);
  };

  const handleEndGame = () => {
    setIsClockRunning(false);
    onUpdateGame({ ...game, status: 'finished', gameClock: 0 });
  };

  const handleGenerateSummary = async () => {
    setIsGeneratingSummary(true);
    const summary = await generateGameSummary(game);
    onUpdateGame({ ...game, aiSummary: summary });
    setIsGeneratingSummary(false);
  };

  const handleReturnToDashboard = () => {
    setIsClockRunning(false); // Pause the clock before leaving
    onReturnToDashboard();
  };
  
  const allPlayers = useMemo(() => [...game.homeTeam.roster, ...game.awayTeam.roster], [game.homeTeam.roster, game.awayTeam.roster]);
  
  const gameLog = useMemo(() => {
    return [...game.stats].sort((a, b) => b.timestamp - a.timestamp).map(stat => {
        const player = allPlayers.find(p => p.id === stat.playerId);
        const team = stat.teamId === game.homeTeam.id ? game.homeTeam : game.awayTeam;
        if (!player) return null;
        let text = `${team.name}: #${player.jerseyNumber} ${player.name} - ${stat.type}`;
        if (stat.type === StatType.GOAL && stat.assistingPlayerId) {
            const assistPlayer = allPlayers.find(p => p.id === stat.assistingPlayerId);
            if (assistPlayer) text += ` (Assist #${assistPlayer.jerseyNumber} ${assistPlayer.name})`;
        }
        return { id: stat.id, text, timestamp: stat.timestamp };
    }).filter(Boolean) as { id: string, text: string, timestamp: number }[];
  }, [game.stats, game.homeTeam, game.awayTeam, allPlayers]);

  const playerStats = useMemo(() => {
    const statsByPlayer: { [playerId: string]: { [key in StatType]?: number } } = {};
    
    [...game.homeTeam.roster, ...game.awayTeam.roster].forEach(p => {
        statsByPlayer[p.id] = {};
    });

    game.stats.forEach(stat => {
        if (!statsByPlayer[stat.playerId]) statsByPlayer[stat.playerId] = {};
        
        statsByPlayer[stat.playerId][stat.type] = (statsByPlayer[stat.playerId][stat.type] || 0) + 1;

        if (stat.type === StatType.GOAL && stat.assistingPlayerId) {
            if (!statsByPlayer[stat.assistingPlayerId]) statsByPlayer[stat.assistingPlayerId] = {};
            statsByPlayer[stat.assistingPlayerId][StatType.ASSIST] = (statsByPlayer[stat.assistingPlayerId][StatType.ASSIST] || 0) + 1;
        }
    });
    return statsByPlayer;
  }, [game.stats, game.homeTeam.roster, game.awayTeam.roster]);

  const isCoachOrAdmin = currentUser.role === Role.ADMIN || currentUser.role === Role.COACH;

  return (
    <div>
        {/* Scoreboard */}
        <div className="bg-gray-800 p-4 rounded-lg shadow-2xl mb-2 sticky top-16 z-10">
            <div className="flex justify-between items-center text-center">
                <div className="w-1/3">
                    <h2 className="text-xl md:text-3xl font-bold truncate">{game.homeTeam.name}</h2>
                    <p className="text-4xl md:text-6xl font-mono">{game.score.home}</p>
                </div>
                <div className="w-1/3">
                    <p className="text-5xl md:text-7xl font-mono font-bold text-cyan-400">{formatTime(clock)}</p>
                    <p className="text-xl md:text-2xl">Period {game.currentPeriod}</p>
                </div>
                <div className="w-1/3">
                    <h2 className="text-xl md:text-3xl font-bold truncate">{game.awayTeam.name}</h2>
                    <p className="text-4xl md:text-6xl font-mono">{game.score.away}</p>
                </div>
            </div>

            {isCoachOrAdmin && game.status !== 'finished' && (
                <div className="flex justify-center items-center space-x-8 mt-3 pt-3 border-t border-gray-700">
                    <div className="flex items-center space-x-2">
                         <span className="font-semibold text-sm">Home Score:</span>
                        <button onClick={() => handleManualScoreChange('home', -1)} className="bg-gray-600 hover:bg-gray-500 rounded-md w-8 h-8 font-bold">-</button>
                        <button onClick={() => handleManualScoreChange('home', 1)} className="bg-gray-600 hover:bg-gray-500 rounded-md w-8 h-8 font-bold">+</button>
                    </div>
                    <div className="flex items-center space-x-2">
                        <span className="font-semibold text-sm">Away Score:</span>
                        <button onClick={() => handleManualScoreChange('away', -1)} className="bg-gray-600 hover:bg-gray-500 rounded-md w-8 h-8 font-bold">-</button>
                        <button onClick={() => handleManualScoreChange('away', 1)} className="bg-gray-600 hover:bg-gray-500 rounded-md w-8 h-8 font-bold">+</button>
                    </div>
                </div>
            )}

            <div className="flex justify-center items-center space-x-2 mt-4 pt-4 border-t border-gray-600 flex-wrap gap-y-2">
                 <button onClick={() => setIsClockRunning(!isClockRunning)} className={`px-4 py-2 rounded-lg font-semibold transition-colors ${isClockRunning ? 'bg-yellow-500 hover:bg-yellow-600' : 'bg-green-500 hover:bg-green-600'}`}>
                    {isClockRunning ? 'Pause Clock' : 'Start Clock'}
                </button>
                <button onClick={() => onUpdateGame({...game, currentPeriod: Math.max(1, game.currentPeriod - 1)})} className="px-3 py-2 bg-gray-600 hover:bg-gray-500 rounded-lg">-</button>
                <span className="mx-2">Period {game.currentPeriod}</span>
                <button onClick={() => onUpdateGame({...game, currentPeriod: game.currentPeriod + 1})} className="px-3 py-2 bg-gray-600 hover:bg-gray-500 rounded-lg">+</button>
                
                <div className="w-px h-6 bg-gray-700 mx-1 hidden sm:block"></div>

                <button onClick={() => setClock(720)} className="px-3 py-2 bg-gray-600 hover:bg-gray-500 rounded-lg">Reset Clock</button>
                <button onClick={() => adjustClock(-10)} className="px-2 py-2 text-sm bg-gray-700 rounded-md hover:bg-gray-600">-10s</button>
                <button onClick={() => adjustClock(10)} className="px-2 py-2 text-sm bg-gray-700 rounded-md hover:bg-gray-600">+10s</button>

                <div className="w-px h-6 bg-gray-700 mx-1 hidden sm:block"></div>
                
                {game.status !== 'finished' && <button onClick={handleEndGame} className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg font-semibold">End Game</button>}
                {game.status !== 'finished' && (
                  <button onClick={handleReturnToDashboard} className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white font-semibold rounded-lg transition-colors">
                    Return to Main Menu
                  </button>
                )}
            </div>
        </div>

        {game.status !== 'finished' && <PenaltyBox penalties={game.penalties || []} clock={clock} homeTeam={game.homeTeam} awayTeam={game.awayTeam} />}

        {game.status !== 'finished' ? (
          <div className="grid md:grid-cols-3 gap-4">
              <RosterColumn team={game.homeTeam} onSelectPlayer={(p, t) => setSelectedPlayerInfo({player: p, teamId: t})} selectedPlayerId={selectedPlayerInfo?.player.id ?? null} />
              
              {/* Stat Entry Panel */}
              <div className="flex flex-col items-center justify-start p-4 bg-gray-900 rounded-lg min-h-[300px]">
                  {selectedPlayerInfo ? (
                      <div className="w-full text-center">
                          <h3 className="text-lg font-bold">Add Stat for:</h3>
                          <p className="text-xl font-bold text-cyan-400 my-1">#{selectedPlayerInfo.player.jerseyNumber} {selectedPlayerInfo.player.name}</p>
                          <p className="text-sm text-gray-400 mb-4">{selectedPlayerInfo.teamId === game.homeTeam.id ? game.homeTeam.name : game.awayTeam.name}</p>
                          <div className="grid grid-cols-2 gap-2 w-full">
                            <StatEntryButton label="Goal" onClick={openAssistModal} className="bg-green-500 hover:bg-green-600"/>
                            <StatEntryButton label="Shot" onClick={() => handleStatButtonClick(StatType.SHOT)} className="bg-blue-500 hover:bg-blue-600"/>
                            <StatEntryButton label="Ground Ball" onClick={() => handleStatButtonClick(StatType.GROUND_BALL)} className="bg-yellow-500 hover:bg-yellow-600 text-gray-900"/>
                            <StatEntryButton label="Turnover" onClick={() => handleStatButtonClick(StatType.TURNOVER)} className="bg-red-500 hover:bg-red-600"/>
                            <StatEntryButton label="Caused TO" onClick={() => handleStatButtonClick(StatType.CAUSED_TURNOVER)} className="bg-purple-500 hover:bg-purple-600"/>
                            <StatEntryButton label="Penalty" onClick={() => setIsPenaltyModalOpen(true)} className="bg-orange-500 hover:bg-orange-600"/>
                            <StatEntryButton label="Faceoff Win" onClick={() => handleStatButtonClick(StatType.FACEOFF_WIN)} className="bg-teal-500 hover:bg-teal-600"/>
                            <StatEntryButton label="Faceoff Loss" onClick={() => handleStatButtonClick(StatType.FACEOFF_LOSS)} className="bg-gray-500 hover:bg-gray-400"/>
                            <StatEntryButton label="Save" onClick={() => handleStatButtonClick(StatType.SAVE)} className="bg-indigo-500 hover:bg-indigo-600"/>
                          </div>
                          <button onClick={() => setSelectedPlayerInfo(null)} className="mt-4 text-xs text-gray-400 hover:text-white">Cancel</button>
                      </div>
                  ) : (
                      <div className="text-center text-gray-500">
                          <p className="text-lg">Select a player from either roster to log a stat.</p>
                      </div>
                  )}
              </div>
              
              <RosterColumn team={game.awayTeam} onSelectPlayer={(p, t) => setSelectedPlayerInfo({player: p, teamId: t})} selectedPlayerId={selectedPlayerInfo?.player.id ?? null} />
          </div>
        ) : (
          // Game Finished View
          <div className="space-y-6">
            <div className="bg-gray-800 p-6 rounded-lg shadow-2xl text-center">
                <h2 className="text-4xl font-bold text-green-400">Game Over</h2>
                <div className="mt-6 flex justify-center gap-4">
                  <button onClick={() => onViewReport(game)} className="bg-cyan-500 hover:bg-cyan-600 text-white font-bold py-3 px-6 rounded-lg text-lg transition-colors">
                      View Final Report
                  </button>
                  <button onClick={handleReturnToDashboard} className="bg-gray-600 hover:bg-gray-500 text-white font-semibold py-3 px-6 rounded-lg transition-colors">
                      Return to Dashboard
                  </button>
                </div>
            </div>

            {game.aiSummary ? (
                <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
                    <h2 className="text-2xl font-bold text-cyan-400 mb-2">AI Game Summary</h2>
                    <p className="text-gray-300 whitespace-pre-wrap">{game.aiSummary}</p>
                </div>
            ) : (
                <div className="bg-gray-800 p-6 rounded-lg shadow-lg text-center">
                    <button onClick={handleGenerateSummary} disabled={isGeneratingSummary} className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-6 rounded-lg text-lg transition-colors disabled:bg-gray-500">
                        {isGeneratingSummary ? 'Generating...' : 'Generate AI Summary & Player of the Game'}
                    </button>
                </div>
            )}
            
            <div className="text-center my-4">
                <h2 className="text-2xl font-semibold mb-4 border-b-2 border-gray-700 pb-2">Final Game Log</h2>
                 <div className="bg-gray-800 p-4 rounded-lg shadow-inner max-h-60 overflow-y-auto text-left text-sm">
                    {gameLog.map(log => (
                        <p key={log.id} className="font-mono border-b border-gray-700 py-1">
                            <span className="text-gray-500 mr-2">[{formatTime(log.timestamp)}]</span> {log.text}
                        </p>
                    ))}
                </div>
            </div>

            <StatsTable team={game.homeTeam} playerStats={playerStats} />
            <StatsTable team={game.awayTeam} playerStats={playerStats} />
          </div>
        )}

        {/* Assist Modal */}
        {assistModal.show && assistModal.scoringPlayer && assistModal.scoringTeamId && (
            <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
                <div className="bg-gray-800 p-6 rounded-lg shadow-xl max-w-lg w-full">
                    <h2 className="text-2xl font-bold mb-4">Assist Selection</h2>
                    <p className="mb-4">Who assisted on the goal by <span className="font-bold text-cyan-400">#{assistModal.scoringPlayer.jerseyNumber} {assistModal.scoringPlayer.name}</span>?</p>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-60 overflow-y-auto">
                        {(assistModal.scoringTeamId === game.homeTeam.id ? game.homeTeam.roster : game.awayTeam.roster)
                            .filter(p => p.id !== assistModal.scoringPlayer!.id)
                            .map(player => (
                                <button key={player.id} onClick={() => handleAssistSelection(player)} className="p-2 bg-gray-700 hover:bg-cyan-600 rounded-md text-left">
                                    <p className="font-bold">#{player.jerseyNumber} {player.name}</p>
                                </button>
                        ))}
                    </div>
                    <div className="mt-4 pt-4 border-t border-gray-700 flex justify-end">
                        <button onClick={() => handleAssistSelection(null)} className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-md">
                            No Assist
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* Penalty Modal */}
        {isPenaltyModalOpen && selectedPlayerInfo && (
            <PenaltyModal 
                isOpen={isPenaltyModalOpen}
                player={selectedPlayerInfo.player}
                teamName={selectedPlayerInfo.teamId === game.homeTeam.id ? game.homeTeam.name : game.awayTeam.name}
                onClose={() => setIsPenaltyModalOpen(false)}
                onAddPenalty={handleAddPenalty}
            />
        )}
    </div>
  );
};

export default GameTracker;