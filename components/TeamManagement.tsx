
import React, { useState } from 'react';
import { Team, Player, AccessRequest, User, RequestStatus, DrillAssignment, DrillType, DrillStatus, Role } from '../types';
import { generateRosterFromText } from '../services/geminiService';

interface ImportRosterModalProps {
  team: Team;
  onClose: () => void;
  onRosterImport: (roster: Player[]) => void;
}

const ImportRosterModal: React.FC<ImportRosterModalProps> = ({ team, onClose, onRosterImport }) => {
  const [pastedContent, setPastedContent] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedRoster, setGeneratedRoster] = useState<Omit<Player, 'id'>[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError(null);
    setGeneratedRoster(null);
    try {
      const roster = await generateRosterFromText(pastedContent);
      setGeneratedRoster(roster);
    } catch (e: any) {
      setError(e.message || "An unknown error occurred.");
    } finally {
      setIsGenerating(false);
    }
  };
  
  const handleConfirmImport = () => {
    if (generatedRoster) {
        const newRosterWithIds: Player[] = generatedRoster.map((player, index) => ({
            ...player,
            id: `player_${Date.now()}_${index}`
        }));
        onRosterImport(newRosterWithIds);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 p-6 rounded-lg shadow-xl max-w-2xl w-full">
        <h2 className="text-2xl font-bold mb-4">Import Roster for <span className="text-cyan-400">{team.name}</span></h2>
        <p className="text-gray-400 mb-4 text-sm">Copy the roster from the team's website and paste it below. The AI will attempt to extract player names, numbers, and positions.</p>
        
        <textarea
          value={pastedContent}
          onChange={(e) => setPastedContent(e.target.value)}
          placeholder="Paste roster text here..."
          className="w-full h-32 bg-gray-900 text-white rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-cyan-500"
          disabled={isGenerating}
        />

        <div className="mt-4 flex justify-end space-x-2">
            <button onClick={onClose} disabled={isGenerating} className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-md transition-colors">Cancel</button>
            <button onClick={handleGenerate} disabled={isGenerating || !pastedContent.trim()} className="bg-cyan-500 hover:bg-cyan-600 text-white font-bold py-2 px-4 rounded-md transition-colors disabled:bg-gray-500">
                {isGenerating ? 'Generating...' : 'Generate Roster'}
            </button>
        </div>

        {error && <p className="text-red-400 mt-4 text-center">{error}</p>}
        
        {generatedRoster && (
            <div className="mt-4 border-t border-gray-700 pt-4">
                <h3 className="text-lg font-semibold mb-2">Generated Roster Preview ({generatedRoster.length} players found)</h3>
                <div className="max-h-48 overflow-y-auto bg-gray-900 rounded-md p-2 space-y-1">
                    {generatedRoster.map((p, i) => (
                        <div key={i} className="flex justify-between items-center text-sm p-1 rounded">
                             <span className="font-bold text-cyan-400 w-12">#{p.jerseyNumber}</span>
                             <span className="flex-grow">{p.name}</span>
                             <span className="text-xs bg-gray-700 px-2 py-1 rounded-full">{p.position}</span>
                        </div>
                    ))}
                </div>
                <div className="mt-4 text-center">
                    <button onClick={handleConfirmImport} className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded-md transition-colors">
                        Add {generatedRoster.length} Players to Team
                    </button>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};

interface AssignDrillModalProps {
    player: Player;
    onClose: () => void;
    onAssign: (drillType: DrillType, notes: string) => void;
}

const AssignDrillModal: React.FC<AssignDrillModalProps> = ({ player, onClose, onAssign }) => {
    const [drillType, setDrillType] = useState<DrillType>(DrillType.FACE_OFF);
    const [notes, setNotes] = useState('');

    const handleSubmit = () => {
        if (notes.trim()) {
            onAssign(drillType, notes);
        } else {
            alert("Please provide some notes or goals for the drill.");
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 p-6 rounded-lg shadow-xl max-w-md w-full space-y-4">
                <h2 className="text-2xl font-bold">Assign Drill to <span className="text-cyan-400">{player.name}</span></h2>
                <div>
                    <label className="block text-sm font-medium mb-1">Drill Type</label>
                    <select
                        value={drillType}
                        onChange={e => setDrillType(e.target.value as DrillType)}
                        className="w-full bg-gray-700 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    >
                        {Object.values(DrillType).map(type => <option key={type} value={type}>{type}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1">Notes / Goals</label>
                    <textarea
                        value={notes}
                        onChange={e => setNotes(e.target.value)}
                        placeholder="e.g., 'Complete 20 reps' or 'Work on shot placement top-left.'"
                        rows={3}
                        className="w-full bg-gray-700 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    />
                </div>
                <div className="flex justify-end space-x-2 pt-4">
                    <button onClick={onClose} className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-md">Cancel</button>
                    <button onClick={handleSubmit} className="bg-cyan-500 hover:bg-cyan-600 text-white font-bold py-2 px-4 rounded-md">Assign Drill</button>
                </div>
            </div>
        </div>
    );
};


interface TeamManagementProps {
  teams: Team[];
  onAddTeam: (teamName: string) => void;
  onUpdateTeam: (team: Team) => void;
  onDeleteTeam: (teamId: string) => void;
  onReturnToDashboard: (view: 'dashboard') => void;
  accessRequests: AccessRequest[];
  users: User[];
  onUpdateRequestStatus: (requestId: string, newStatus: RequestStatus) => void;
  drillAssignments: DrillAssignment[];
  onAddDrillAssignment: (playerId: string, drillType: DrillType, notes: string) => void;
  currentUser: User;
}

const lacrossePositions = ['Attack', 'Midfield', 'Defense', 'Goalie', 'LSM', 'Face Off Specialist'];

const TeamManagement: React.FC<TeamManagementProps> = ({ teams, onAddTeam, onUpdateTeam, onDeleteTeam, onReturnToDashboard, accessRequests, users, onUpdateRequestStatus, drillAssignments, onAddDrillAssignment, currentUser }) => {
  const [newTeamName, setNewTeamName] = useState('');
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [newPlayerNumber, setNewPlayerNumber] = useState('');
  const [newPlayerPosition, setNewPlayerPosition] = useState('');
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isAssignDrillModalOpen, setIsAssignDrillModalOpen] = useState(false);
  const [playerToAssign, setPlayerToAssign] = useState<Player | null>(null);

  const pendingRequestsForTeam = selectedTeam
    ? accessRequests.filter(
        (req) => req.teamId === selectedTeam.id && req.status === RequestStatus.PENDING
      )
    : [];

  const handleAddTeam = () => {
    if (newTeamName.trim()) {
      onAddTeam(newTeamName.trim());
      setNewTeamName('');
    }
  };

  const handleAddPlayer = () => {
    if (selectedTeam && newPlayerName.trim() && newPlayerNumber.trim() && newPlayerPosition) {
      const newPlayer: Player = {
        id: `player_${Date.now()}`,
        name: newPlayerName.trim(),
        jerseyNumber: newPlayerNumber.trim(),
        position: newPlayerPosition.trim()
      };
      const updatedTeam = {
        ...selectedTeam,
        roster: [...selectedTeam.roster, newPlayer]
      };
      onUpdateTeam(updatedTeam);
      setSelectedTeam(updatedTeam);
      setNewPlayerName('');
      setNewPlayerNumber('');
      setNewPlayerPosition('');
    }
  };

  const handleDeletePlayer = (playerId: string) => {
    if(selectedTeam){
      const updatedRoster = selectedTeam.roster.filter(p => p.id !== playerId);
      const updatedTeam = {...selectedTeam, roster: updatedRoster};
      onUpdateTeam(updatedTeam);
      setSelectedTeam(updatedTeam);
    }
  };

  const handleRosterImport = (newRoster: Player[]) => {
    if (selectedTeam) {
        const updatedTeam = {
            ...selectedTeam,
            roster: newRoster,
        };
        onUpdateTeam(updatedTeam);
        setSelectedTeam(updatedTeam);
        setIsImportModalOpen(false);
    }
  };
  
  const handleOpenAssignDrillModal = (player: Player) => {
    setPlayerToAssign(player);
    setIsAssignDrillModalOpen(true);
  };

  const handleAssignDrill = (drillType: DrillType, notes: string) => {
    if (playerToAssign && playerToAssign.userId) {
        onAddDrillAssignment(playerToAssign.userId, drillType, notes);
    }
    setIsAssignDrillModalOpen(false);
    setPlayerToAssign(null);
  };


  return (
    <>
    {isImportModalOpen && selectedTeam && (
      <ImportRosterModal 
        team={selectedTeam}
        onClose={() => setIsImportModalOpen(false)}
        onRosterImport={handleRosterImport}
      />
    )}
    {isAssignDrillModalOpen && playerToAssign && (
      <AssignDrillModal 
        player={playerToAssign}
        onClose={() => setIsAssignDrillModalOpen(false)}
        onAssign={handleAssignDrill}
      />
    )}
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-cyan-400">Team Management</h1>
        <button onClick={() => onReturnToDashboard('dashboard')} className="bg-gray-600 hover:bg-gray-500 text-white font-semibold py-2 px-4 rounded-lg transition-colors">
          Return to Main Menu
        </button>
      </div>
      <div className="bg-gray-800 p-4 rounded-lg shadow-lg">
        <h2 className="text-xl font-semibold mb-2">Create New Team</h2>
        <div className="flex space-x-2">
          <input
            type="text"
            value={newTeamName}
            onChange={(e) => setNewTeamName(e.target.value)}
            placeholder="Enter team name"
            className="flex-grow bg-gray-700 text-white rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-500"
          />
          <button onClick={handleAddTeam} className="bg-cyan-500 hover:bg-cyan-600 text-white font-bold py-2 px-4 rounded-md transition-colors">
            Add Team
          </button>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-1 bg-gray-800 p-4 rounded-lg shadow-lg">
          <h2 className="text-xl font-semibold mb-2">Your Teams</h2>
          <ul className="space-y-2">
            {teams.map(team => (
              <li key={team.id}
                  onClick={() => setSelectedTeam(team)}
                  className={`p-2 rounded-md cursor-pointer transition-colors ${selectedTeam?.id === team.id ? 'bg-cyan-600' : 'bg-gray-700 hover:bg-gray-600'}`}>
                {team.name}
              </li>
            ))}
          </ul>
        </div>

        <div className="md:col-span-2 bg-gray-800 p-4 rounded-lg shadow-lg">
          {selectedTeam ? (
            <div>
              <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
                 <h2 className="text-2xl font-bold">{selectedTeam.name} - Roster</h2>
                 <div className="flex space-x-2">
                    <button onClick={() => setIsImportModalOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-1 px-3 rounded-md text-sm transition-colors">Import Roster from Web</button>
                    <button onClick={() => {onDeleteTeam(selectedTeam.id); setSelectedTeam(null);}} className="bg-red-600 hover:bg-red-700 text-white font-bold py-1 px-3 rounded-md text-sm transition-colors">Delete Team</button>
                 </div>
              </div>

              {pendingRequestsForTeam.length > 0 && (
                <div className="mb-6 bg-gray-700 p-4 rounded-lg border border-cyan-500">
                  <h3 className="text-lg font-semibold text-cyan-400 mb-2">Pending Roster Requests</h3>
                  <ul className="space-y-2">
                    {pendingRequestsForTeam.map(req => {
                      const requestingUser = users.find(u => u.id === req.requestingUserId);
                      if (!requestingUser) return null;
                      return (
                        <li key={req.id} className="bg-gray-800 p-2 rounded-md flex justify-between items-center">
                          <div>
                            <p className="font-bold">{requestingUser.username}</p>
                            <p className="text-sm text-gray-400">
                              Wants to join as #{req.playerJersey} ({req.playerPosition})
                            </p>
                          </div>
                          <div className="flex space-x-2">
                            <button onClick={() => onUpdateRequestStatus(req.id, RequestStatus.APPROVED)} className="bg-green-500 hover:bg-green-600 text-white font-bold py-1 px-3 rounded-md text-sm transition-colors">Approve</button>
                            <button onClick={() => onUpdateRequestStatus(req.id, RequestStatus.DENIED)} className="bg-red-600 hover:bg-red-700 text-white font-bold py-1 px-3 rounded-md text-sm transition-colors">Deny</button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

              <div className="mb-4 space-y-2">
                <h3 className="text-lg font-semibold">Add New Player</h3>
                <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                  <input type="text" value={newPlayerName} onChange={(e) => setNewPlayerName(e.target.value)} placeholder="Player Name" className="flex-grow bg-gray-700 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-500" />
                  <input type="text" value={newPlayerNumber} onChange={(e) => setNewPlayerNumber(e.target.value)} placeholder="Jersey #" className="w-24 bg-gray-700 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-500" />
                  <select
                    value={newPlayerPosition}
                    onChange={(e) => setNewPlayerPosition(e.target.value)}
                    className="w-48 bg-gray-700 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  >
                    <option value="">Select Position</option>
                    {lacrossePositions.map(pos => <option key={pos} value={pos}>{pos}</option>)}
                  </select>
                  <button onClick={handleAddPlayer} className="bg-cyan-500 hover:bg-cyan-600 text-white font-bold py-2 px-4 rounded-md transition-colors">Add Player</button>
                </div>
              </div>
              
              <ul className="space-y-2">
                {selectedTeam.roster.map(player => {
                  const playerAssignments = player.userId ? drillAssignments.filter(d => d.playerId === player.userId && d.status === DrillStatus.ASSIGNED) : [];
                  const isCoachOfTeam = currentUser.role === Role.COACH && currentUser.teamIds?.includes(selectedTeam.id);
                  const canAssign = currentUser.role === Role.ADMIN || isCoachOfTeam;
                  return (
                    <li key={player.id} className="bg-gray-700 p-2 rounded-md">
                      <div className="flex justify-between items-center">
                        <div>
                          <span className="font-bold text-cyan-400">#{player.jerseyNumber}</span> 
                          <span className="ml-2">{player.name}</span>
                          <span className="ml-2 text-xs text-gray-400 bg-gray-600 px-2 py-1 rounded-full">{player.position}</span>
                          {!player.userId && <span className="ml-2 text-xs text-yellow-400 bg-gray-600 px-2 py-1 rounded-full">Manual Add</span>}
                        </div>
                        <div className="flex items-center space-x-2">
                          {player.userId && canAssign &&
                            <button onClick={() => handleOpenAssignDrillModal(player)} className="text-cyan-400 hover:text-cyan-300 text-xs font-semibold">Assign Drill</button>
                          }
                          <button onClick={() => handleDeletePlayer(player.id)} className="text-red-400 hover:text-red-300 text-xs">Remove</button>
                        </div>
                      </div>
                       {playerAssignments.length > 0 && (
                          <div className="mt-2 pl-4 border-l-2 border-gray-600 text-xs space-y-1">
                              <p className="font-bold text-gray-400">Assigned Drills:</p>
                              {playerAssignments.map(drill => (
                                  <div key={drill.id} className="text-gray-300">{drill.drillType}: <span className="italic">"{drill.notes}"</span></div>
                              ))}
                          </div>
                      )}
                    </li>
                  )
                })}
                {selectedTeam.roster.length === 0 && <p className="text-gray-500">No players on this roster yet. Try importing one!</p>}
              </ul>

            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
                <p className="text-gray-500">Select a team to view its roster.</p>
            </div>
          )}
        </div>
      </div>
    </div>
    </>
  );
};

export default TeamManagement;