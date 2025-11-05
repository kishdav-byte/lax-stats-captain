
import React, { useState } from 'react';
import { Game, Team, User } from '../types';

interface ParentDashboardProps {
  currentUser: User;
  teams: Team[];
  games: Game[];
  onUpdateUser: (user: User) => void;
  onAcceptInvitation: (invitationCode: string) => void;
}

const formatTime = (seconds: number) => {
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    return `${min}:${sec < 10 ? '0' : ''}${sec}`;
};

// --- Live Game Viewer Component ---
const LiveGameViewer: React.FC<{ game: Game }> = ({ game }) => {
    const [clock, setClock] = React.useState(game.gameClock);
    const gameStatusRef = React.useRef(game.status);

    React.useEffect(() => {
        setClock(game.gameClock);
        gameStatusRef.current = game.status;
    }, [game.gameClock, game.status]);

    React.useEffect(() => {
        let timer: number;
        if (gameStatusRef.current === 'live' && clock > 0) {
            timer = window.setInterval(() => {
                setClock(prev => Math.max(0, prev - 1));
            }, 1000);
        }
        return () => clearInterval(timer);
    }, [clock]);

    const allPlayers = [...game.homeTeam.roster, ...game.awayTeam.roster];
    const gameLog = [...game.stats]
        .sort((a, b) => b.timestamp - a.timestamp)
        .map(stat => {
            const player = allPlayers.find(p => p.id === stat.playerId);
            const team = stat.teamId === game.homeTeam.id ? game.homeTeam : game.awayTeam;
            if (!player) return null;
            let text = `${team.name}: #${player.jerseyNumber} ${player.name} - ${stat.type}`;
            if (stat.type === 'Goal' && stat.assistingPlayerId) {
                const assistPlayer = allPlayers.find(p => p.id === stat.assistingPlayerId);
                if (assistPlayer) text += ` (Assist #${assistPlayer.jerseyNumber} ${assistPlayer.name})`;
            }
            return { id: stat.id, text, timestamp: stat.timestamp };
        })
        .filter(Boolean);
    
    const tickerText = gameLog.slice(0, 15).map(log => log!.text).join('  •  ');

    return (
        <div className="bg-green-800 border-2 border-green-500 p-6 rounded-lg shadow-xl mb-8">
            <h2 className="text-2xl font-semibold text-white animate-pulse text-center mb-4">Live Game in Progress!</h2>
            
            <div className="bg-gray-800 p-4 rounded-lg shadow-inner">
                <div className="flex justify-between items-center text-center">
                    <div className="w-1/3">
                        <h3 className="text-xl md:text-2xl font-bold truncate">{game.homeTeam.name}</h3>
                        <p className="text-4xl md:text-5xl font-mono">{game.score.home}</p>
                    </div>
                    <div className="w-1/3">
                        <p className="text-5xl md:text-6xl font-mono font-bold text-cyan-400">{formatTime(clock)}</p>
                        <p className="text-xl md:text-2xl">Period {game.currentPeriod}</p>
                    </div>
                    <div className="w-1/3">
                        <h3 className="text-xl md:text-2xl font-bold truncate">{game.awayTeam.name}</h3>
                        <p className="text-4xl md:text-5xl font-mono">{game.score.away}</p>
                    </div>
                </div>
            </div>

            {gameLog.length > 0 ? (
                <div className="relative w-full bg-gray-900 mt-4 rounded-md overflow-hidden p-2">
                    <div className="ticker-move">
                        <p className="text-lg font-semibold text-gray-300">{tickerText}</p>
                    </div>
                </div>
            ) : (
                <div className="bg-gray-900 rounded-md p-3 text-center mt-4">
                    <p className="text-gray-500">Waiting for game events...</p>
                </div>
            )}
        </div>
    );
};


const ParentDashboard: React.FC<ParentDashboardProps> = ({ currentUser, teams, games, onUpdateUser, onAcceptInvitation }) => {
    const followedTeamIds = currentUser.followedTeamIds || [];
    const followedPlayerIds = currentUser.followedPlayerIds || [];
    const [invitationCode, setInvitationCode] = useState('');

    const followedTeams = teams.filter(t => followedTeamIds.includes(t.id));

    const liveGames = games.filter(g => g.status === 'live' && (followedTeamIds.includes(g.homeTeam.id) || followedTeamIds.includes(g.awayTeam.id)));

    const handleUnfollowTeam = (teamId: string) => {
        const newFollowedTeams = followedTeamIds.filter(id => id !== teamId);
        // Also unfollow all players from that team
        const teamPlayerIds = teams.find(t => t.id === teamId)?.roster.map(p => p.id) || [];
        const newFollowedPlayers = followedPlayerIds.filter(id => !teamPlayerIds.includes(id));
        onUpdateUser({ ...currentUser, followedTeamIds: newFollowedTeams, followedPlayerIds: newFollowedPlayers });
    };

    const handleTogglePlayerFollow = (playerId: string) => {
        const isFollowing = followedPlayerIds.includes(playerId);
        const newFollowedPlayers = isFollowing
            ? followedPlayerIds.filter(id => id !== playerId)
            : [...followedPlayerIds, playerId];
        onUpdateUser({ ...currentUser, followedPlayerIds: newFollowedPlayers });
    };
    
    const handleAcceptInviteSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (invitationCode.trim()) {
            onAcceptInvitation(invitationCode.trim());
            setInvitationCode('');
        }
    };

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-cyan-400">Parent Dashboard</h1>
                <p className="text-gray-400 mt-1">Welcome, {currentUser.username}. Follow your favorite teams and players.</p>
            </div>
            
            {liveGames.map(game => (
                <LiveGameViewer key={game.id} game={game} />
            ))}

             <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
                <h2 className="text-2xl font-bold text-cyan-400 border-b border-gray-700 pb-2 mb-4">Accept an Invitation</h2>
                <form onSubmit={handleAcceptInviteSubmit} className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                    <input
                        type="text"
                        value={invitationCode}
                        onChange={(e) => setInvitationCode(e.target.value)}
                        placeholder="Enter invitation code from a player"
                        className="flex-grow bg-gray-700 text-white rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    />
                    <button type="submit" className="bg-cyan-500 hover:bg-cyan-600 text-white font-bold py-2 px-4 rounded-md transition-colors">
                        Accept Invite
                    </button>
                </form>
            </div>

            <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
                <h2 className="text-2xl font-bold text-cyan-400 border-b border-gray-700 pb-2 mb-4">My Followed Teams</h2>
                {followedTeams.length > 0 ? (
                    <div className="space-y-6">
                        {followedTeams.map(team => {
                            const teamGames = games.filter(g => g.homeTeam.id === team.id || g.awayTeam.id === team.id);
                            const upcomingGames = teamGames.filter(g => g.status === 'scheduled').sort((a, b) => new Date(a.scheduledTime).getTime() - new Date(b.scheduledTime).getTime());
                            
                            return (
                                <div key={team.id} className="bg-gray-900 p-4 rounded-lg">
                                    <div className="flex justify-between items-center mb-4">
                                        <h3 className="text-xl font-bold">{team.name}</h3>
                                        <button onClick={() => handleUnfollowTeam(team.id)} className="bg-red-600 hover:bg-red-700 text-white font-semibold py-1 px-3 rounded-md text-sm">Unfollow Team</button>
                                    </div>
                                    <div className="grid md:grid-cols-2 gap-6">
                                        <div>
                                            <h4 className="font-semibold mb-2">Upcoming Games</h4>
                                            {upcomingGames.length > 0 ? (
                                                <div className="space-y-2">
                                                    {upcomingGames.slice(0, 5).map(game => (
                                                        <div key={game.id} className="bg-gray-800 p-2 rounded-md">
                                                            <p className="font-semibold text-sm">{game.homeTeam.name} vs {game.awayTeam.name}</p>
                                                            <p className="text-xs text-gray-400">{new Date(game.scheduledTime).toLocaleString()}</p>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <p className="text-gray-500 text-sm">No upcoming games.</p>
                                            )}
                                        </div>
                                        <div>
                                            <h4 className="font-semibold mb-2">Roster</h4>
                                            <ul className="space-y-2 max-h-60 overflow-y-auto">
                                                {team.roster.map(player => {
                                                    const isFollowingPlayer = followedPlayerIds.includes(player.id);
                                                    return (
                                                        <li key={player.id} className="bg-gray-800 p-2 rounded-md flex items-center justify-between">
                                                            <div>
                                                                <span className="font-bold text-cyan-400">#{player.jerseyNumber}</span> 
                                                                <span className="ml-2">{player.name}</span>
                                                            </div>
                                                            <button 
                                                                onClick={() => handleTogglePlayerFollow(player.id)}
                                                                className={`py-1 px-2 text-xs rounded-md font-semibold ${isFollowingPlayer ? 'bg-yellow-500 text-black hover:bg-yellow-600' : 'bg-gray-600 hover:bg-gray-500 text-white'}`}
                                                            >
                                                                {isFollowingPlayer ? 'Unfollow' : 'Follow'}
                                                            </button>
                                                        </li>
                                                    );
                                                })}
                                                {team.roster.length === 0 && <p className="text-gray-500 text-sm">No players on roster.</p>}
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <p className="text-gray-500">You are not following any teams yet. Accept an invitation to get started.</p>
                )}
            </div>
        </div>
    );
};

export default ParentDashboard;