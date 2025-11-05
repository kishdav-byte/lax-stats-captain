
import React, { useState } from 'react';
import { Game, Team, User, ParentInvitation, DrillAssignment, DrillStatus } from '../types.ts';

const lacrossePositions = ['Attack', 'Midfield', 'Defense', 'Goalie', 'LSM', 'Face Off Specialist'];

interface JoinTeamModalProps {
    team: Team;
    onClose: () => void;
    onSubmit: (teamId: string, jersey: string, position: string) => void;
}

const JoinTeamModal: React.FC<JoinTeamModalProps> = ({ team, onClose, onSubmit }) => {
    const [jersey, setJersey] = useState('');
    const [position, setPosition] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (jersey.trim() && position) {
            onSubmit(team.id, jersey.trim(), position);
            onClose();
        } else {
            alert("Please provide a jersey number and select a position.");
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            <form onSubmit={handleSubmit} className="bg-gray-800 p-6 rounded-lg shadow-xl max-w-md w-full space-y-4">
                <h2 className="text-2xl font-bold">Request to Join <span className="text-cyan-400">{team.name}</span></h2>
                <div>
                    <label htmlFor="jersey" className="block text-sm font-medium mb-1">Desired Jersey #</label>
                    <input
                        type="text"
                        id="jersey"
                        value={jersey}
                        onChange={e => setJersey(e.target.value)}
                        className="w-full bg-gray-700 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                        required
                    />
                </div>
                <div>
                    <label htmlFor="position" className="block text-sm font-medium mb-1">Primary Position</label>
                     <select
                        id="position"
                        value={position}
                        onChange={(e) => setPosition(e.target.value)}
                        className="w-full bg-gray-700 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                        required
                    >
                        <option value="">Select Position</option>
                        {lacrossePositions.map(pos => <option key={pos} value={pos}>{pos}</option>)}
                    </select>
                </div>
                 <div className="flex justify-end space-x-2 pt-4">
                    <button type="button" onClick={onClose} className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-md">Cancel</button>
                    <button type="submit" className="bg-cyan-500 hover:bg-cyan-600 text-white font-bold py-2 px-4 rounded-md">Submit Request</button>
                </div>
            </form>
        </div>
    );
};


interface PlayerDashboardProps {
  currentUser: User;
  teams: Team[];
  games: Game[];
  onJoinRequest: (teamId: string, playerJersey: string, playerPosition: string) => void;
  onInviteParent: (parentEmail: string) => { success: boolean, error?: string };
  invitations: ParentInvitation[];
  drillAssignments: DrillAssignment[];
  onStartDrill: (assignment: DrillAssignment) => void;
}

const PlayerDashboard: React.FC<PlayerDashboardProps> = ({ currentUser, teams, games, onJoinRequest, onInviteParent, invitations, drillAssignments, onStartDrill }) => {
  const myTeams = teams.filter(t => currentUser.teamIds?.includes(t.id));

  const isSampleTeamTheOnlyTeam = teams.length === 1 && teams[0].id === 'sample_team_id';
  const otherTeams = teams.filter(t => {
      // Player is not on this team
      if (!currentUser.teamIds?.includes(t.id)) {
          // If it's the sample team, only show it if it's the ONLY team in existence.
          if (t.id === 'sample_team_id') {
              return isSampleTeamTheOnlyTeam;
          }
          // Otherwise, show any other team.
          return true;
      }
      // Player is on this team, so don't show it in "other teams".
      return false;
  });

  const myTeamIds = myTeams.map(t => t.id);
  const myGames = games.filter(g => myTeamIds.includes(g.homeTeam.id) || myTeamIds.includes(g.awayTeam.id));
  const upcomingGames = myGames.filter(g => g.status === 'scheduled').sort((a, b) => new Date(a.scheduledTime).getTime() - new Date(b.scheduledTime).getTime());
  const finishedGames = myGames.filter(g => g.status === 'finished').sort((a, b) => new Date(b.scheduledTime).getTime() - new Date(a.scheduledTime).getTime());

  const myInvitations = invitations.filter(inv => inv.invitingPlayerId === currentUser.id);
  const myAssignedDrills = drillAssignments.filter(d => d.playerId === currentUser.id && d.status === DrillStatus.ASSIGNED);


  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [parentEmail, setParentEmail] = useState('');

  const handleOpenJoinModal = (team: Team) => {
    setSelectedTeam(team);
    setIsJoinModalOpen(true);
  };
  
  const handleInviteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (parentEmail.trim()) {
        const result = onInviteParent(parentEmail.trim());
        if (result.success) {
            setParentEmail('');
            alert("Invitation sent! Share the code with your parent.");
        } else {
            alert(`Error: ${result.error}`);
        }
    }
  };

  return (
    <>
    {isJoinModalOpen && selectedTeam && (
        <JoinTeamModal
            team={selectedTeam}
            onClose={() => setIsJoinModalOpen(false)}
            onSubmit={onJoinRequest}
        />
    )}
    <div className="space-y-8">
        <div>
            <h1 className="text-3xl font-bold text-cyan-400">Player Dashboard</h1>
            <p className="text-gray-400 mt-1">Welcome, {currentUser.username}. Here's your lacrosse hub.</p>
        </div>
        
        <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
            <h2 className="text-2xl font-bold text-cyan-400 border-b border-gray-700 pb-2 mb-4">My Teams</h2>
            {myTeams.length > 0 ? (
                <div className="space-y-6">
                {myTeams.map(team => (
                    <div key={team.id} className="bg-gray-900 p-4 rounded-md">
                         <h3 className="text-xl font-semibold mb-2">{team.name}</h3>
                         <div className="grid md:grid-cols-2 gap-4">
                            <div>
                                <h4 className="font-bold mb-1">Roster</h4>
                                <ul className="space-y-1 max-h-48 overflow-y-auto text-sm">
                                    {team.roster.map(p => (
                                        <li key={p.id} className="flex justify-between p-1 bg-gray-800 rounded">
                                            <span><span className="font-bold text-cyan-400">#{p.jerseyNumber}</span> {p.name}</span>
                                            <span className="text-gray-400">{p.position}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                         </div>
                    </div>
                ))}
                </div>
            ) : (
                <p className="text-gray-500">You are not yet on a team. Find a team to join below.</p>
            )}
        </div>

        <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
            <h2 className="text-2xl font-bold text-cyan-400 border-b border-gray-700 pb-2 mb-4">My Assigned Drills</h2>
            {myAssignedDrills.length > 0 ? (
                <ul className="space-y-3">
                    {myAssignedDrills.map(drill => (
                        <li key={drill.id} className="bg-gray-700 p-3 rounded-md flex flex-col sm:flex-row justify-between sm:items-center">
                            <div>
                                <p className="font-bold text-lg">{drill.drillType}</p>
                                <p className="text-sm text-gray-300 italic">Notes: "{drill.notes}"</p>
                            </div>
                            <button 
                                onClick={() => onStartDrill(drill)}
                                className="mt-2 sm:mt-0 bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-md transition-colors"
                            >
                                Start Drill
                            </button>
                        </li>
                    ))}
                </ul>
            ) : (
                <p className="text-gray-500">You have no new drills assigned. Great job!</p>
            )}
        </div>

        <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
            <h2 className="text-2xl font-bold text-cyan-400 border-b border-gray-700 pb-2 mb-4">Invite Family</h2>
            {myTeams.length > 0 ? (
                <>
                <form onSubmit={handleInviteSubmit} className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2 mb-4">
                     <input
                        type="email"
                        value={parentEmail}
                        onChange={e => setParentEmail(e.target.value)}
                        placeholder="Enter parent's email address"
                        className="flex-grow bg-gray-700 text-white rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                        required
                    />
                    <button type="submit" className="bg-cyan-500 hover:bg-cyan-600 text-white font-bold py-2 px-4 rounded-md transition-colors">
                        Send Invite
                    </button>
                </form>
                 {myInvitations.length > 0 && (
                    <div>
                        <h3 className="font-semibold mb-2">Sent Invitations</h3>
                        <ul className="space-y-2 max-h-40 overflow-y-auto">
                           {myInvitations.map(inv => (
                               <li key={inv.id} className="bg-gray-700 p-2 rounded-md text-sm flex justify-between items-center">
                                   <div>
                                     <span>To: <span className="font-semibold">{inv.parentEmail}</span></span>
                                     <br/>
                                     <span className="text-gray-400">Code: <span className="font-mono text-cyan-400">{inv.invitationCode}</span></span>
                                   </div>
                                   <span className={`px-2 py-1 text-xs rounded-full ${inv.status === 'pending' ? 'bg-yellow-500 text-black' : 'bg-green-500 text-white'}`}>
                                    {inv.status}
                                   </span>
                               </li>
                           ))}
                        </ul>
                    </div>
                )}
                </>
            ) : (
                <p className="text-gray-500">You must be on a team before you can invite family members.</p>
            )}
        </div>

        <div className="grid md:grid-cols-2 gap-6">
            <div>
                <h2 className="text-2xl font-semibold border-b-2 border-gray-700 pb-2 mb-4">Upcoming Games</h2>
                {upcomingGames.length > 0 ? (
                <div className="space-y-4">
                    {upcomingGames.map(game => (
                    <div key={game.id} className="bg-gray-800 p-4 rounded-lg">
                        <div>
                        <p className="font-bold text-lg">{game.homeTeam.name} vs {game.awayTeam.name}</p>
                        <p className="text-sm text-gray-400">{new Date(game.scheduledTime).toLocaleString()}</p>
                        </div>
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
                    {finishedGames.map(game => (
                    <div key={game.id} className="bg-gray-800 p-4 rounded-lg">
                        <div>
                        <p className="font-bold text-lg">{game.homeTeam.name} vs {game.awayTeam.name}</p>
                        <p className="text-lg text-gray-300">{game.score.home} - {game.score.away}</p>
                        <p className="text-sm text-gray-400">{new Date(game.scheduledTime).toLocaleDateString()}</p>
                        </div>
                    </div>
                    ))}
                </div>
                ) : (
                <p className="text-gray-500">No completed games yet.</p>
                )}
            </div>
        </div>

        <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
             <h2 className="text-2xl font-bold text-cyan-400 border-b border-gray-700 pb-2 mb-4">Join another Team</h2>
             {otherTeams.length > 0 ? (
                <ul className="space-y-2">
                    {otherTeams.map(team => (
                        <li key={team.id} className="bg-gray-700 p-3 rounded-md flex justify-between items-center">
                            <span className="font-semibold">{team.name}</span>
                            <button onClick={() => handleOpenJoinModal(team)} className="bg-cyan-500 hover:bg-cyan-600 text-white font-bold py-1 px-3 rounded-md text-sm transition-colors">
                                Request to Join
                            </button>
                        </li>
                    ))}
                </ul>
             ) : (
                <p className="text-gray-500">There are no other teams available to join right now.</p>
             )}
        </div>
    </div>
    </>
  );
};

export default PlayerDashboard;
