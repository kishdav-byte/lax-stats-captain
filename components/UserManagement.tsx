
import React, { useState, useEffect } from 'react';
import { User, Role, Team, Player } from '../types';

interface EditUserModalProps {
    user: User;
    teams: Team[];
    onSave: (user: User) => void;
    onClose: () => void;
}

const EditUserModal: React.FC<EditUserModalProps> = ({ user, teams, onSave, onClose }) => {
    const [username, setUsername] = useState(user.username);
    const [email, setEmail] = useState(user.email);
    const [role, setRole] = useState(user.role);
    const [teamIds, setTeamIds] = useState(user.teamIds || []);
    const [followedTeamIds, setFollowedTeamIds] = useState(user.followedTeamIds || []);
    const [followedPlayerIds, setFollowedPlayerIds] = useState(user.followedPlayerIds || []);
    const [password, setPassword] = useState('');

    const allPlayers = teams.flatMap(t => t.roster);

    useEffect(() => {
        setUsername(user.username);
        setEmail(user.email);
        setRole(user.role);
        setTeamIds(user.teamIds || []);
        setFollowedTeamIds(user.followedTeamIds || []);
        setFollowedPlayerIds(user.followedPlayerIds || []);
        setPassword('');
    }, [user]);
    
    const isCoachOrPlayer = role === Role.COACH || role === Role.PLAYER;

    const handleTeamSelection = (selectedTeamId: string) => {
        setTeamIds(prev => 
            prev.includes(selectedTeamId) 
                ? prev.filter(id => id !== selectedTeamId)
                : [...prev, selectedTeamId]
        );
    };

    const handleRemoveFollowedTeam = (teamIdToRemove: string) => {
        setFollowedTeamIds(prev => prev.filter(id => id !== teamIdToRemove));
    };

    const handleRemoveFollowedPlayer = (playerIdToRemove: string) => {
        setFollowedPlayerIds(prev => prev.filter(id => id !== playerIdToRemove));
    };

    const handleSave = () => {
        const updatedUser: User = { 
            ...user, 
            username,
            email,
            role, 
            teamIds: isCoachOrPlayer ? teamIds : undefined,
            followedTeamIds: role === Role.PARENT ? followedTeamIds : undefined,
            followedPlayerIds: role === Role.PARENT ? followedPlayerIds : undefined,
        };
        if (password.trim()) {
            updatedUser.password = password.trim();
        }
        onSave(updatedUser);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 p-6 rounded-lg shadow-xl max-w-lg w-full space-y-4">
                <h2 className="text-2xl font-bold">Edit User: <span className="text-cyan-400">{user.username}</span></h2>
                <div>
                    <label className="block text-sm font-medium mb-1">Username</label>
                    <input
                        type="text"
                        value={username}
                        onChange={e => setUsername(e.target.value)}
                        className="w-full bg-gray-700 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    />
                </div>
                 <div>
                    <label className="block text-sm font-medium mb-1">Email</label>
                    <input
                        type="email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        className="w-full bg-gray-700 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1">Role</label>
                    <select
                        value={role}
                        onChange={e => setRole(e.target.value as Role)}
                        className="w-full bg-gray-700 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    >
                        {Object.values(Role).map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                </div>
                {isCoachOrPlayer && (
                     <div>
                        <label className="block text-sm font-medium mb-1">Associated Teams (Coach/Player)</label>
                        <div className="max-h-32 overflow-y-auto space-y-2 bg-gray-900 p-3 rounded-md border border-gray-700">
                            {teams.map(t => (
                                <label key={t.id} className="flex items-center space-x-3 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={teamIds.includes(t.id)}
                                        onChange={() => handleTeamSelection(t.id)}
                                        className="h-5 w-5 rounded bg-gray-700 border-gray-600 text-cyan-500 focus:ring-cyan-600 focus:ring-2"
                                    />
                                    <span className="text-gray-300">{t.name}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                )}
                <div>
                    <label className="block text-sm font-medium mb-1">Reset Password</label>
                    <input
                        type="password"
                        placeholder="Leave blank to keep current password"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        className="w-full bg-gray-700 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    />
                </div>
                 {user.role === Role.PARENT && (
                    <div className="space-y-2 border-t border-gray-700 pt-4 mt-4">
                        <h3 className="text-lg font-semibold text-cyan-400">Follow Management</h3>
                        <div>
                            <label className="block text-sm font-medium mb-1">Followed Teams</label>
                            <div className="max-h-24 overflow-y-auto bg-gray-900 p-2 rounded-md space-y-1">
                                {followedTeamIds.length > 0 ? followedTeamIds.map(id => {
                                    const team = teams.find(t => t.id === id);
                                    return (
                                        <div key={id} className="flex justify-between items-center bg-gray-700 p-1 rounded">
                                            <span>{team?.name || 'Unknown Team'}</span>
                                            <button onClick={() => handleRemoveFollowedTeam(id)} className="text-red-400 hover:text-red-300 text-xs">Remove</button>
                                        </div>
                                    );
                                }) : <p className="text-gray-500 text-sm">Not following any teams.</p>}
                            </div>
                        </div>
                         <div>
                            <label className="block text-sm font-medium mb-1">Followed Players</label>
                             <div className="max-h-24 overflow-y-auto bg-gray-900 p-2 rounded-md space-y-1">
                                {followedPlayerIds.length > 0 ? followedPlayerIds.map(id => {
                                    const player = allPlayers.find(p => p.id === id);
                                    return (
                                        <div key={id} className="flex justify-between items-center bg-gray-700 p-1 rounded">
                                            <span>{player ? `#${player.jerseyNumber} ${player.name}` : 'Unknown Player'}</span>
                                            <button onClick={() => handleRemoveFollowedPlayer(id)} className="text-red-400 hover:text-red-300 text-xs">Remove</button>
                                        </div>
                                    );
                                }) : <p className="text-gray-500 text-sm">Not following any players.</p>}
                            </div>
                        </div>
                    </div>
                )}
                <div className="flex justify-end space-x-2 pt-4">
                    <button onClick={onClose} className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-md">Cancel</button>
                    <button onClick={handleSave} className="bg-cyan-500 hover:bg-cyan-600 text-white font-bold py-2 px-4 rounded-md">Save Changes</button>
                </div>
            </div>
        </div>
    );
};

interface UserManagementProps {
    users: User[];
    teams: Team[];
    onInviteUser: (user: Omit<User, 'id' | 'email' | 'teamIds' | 'status'>) => void;
    onDeleteUser: (userId: string) => void;
    onUpdateUser: (user: User) => void;
    onReturnToDashboard: (view: 'dashboard') => void;
}

const UserManagement: React.FC<UserManagementProps> = ({ users, teams, onInviteUser, onDeleteUser, onUpdateUser, onReturnToDashboard }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState<Role>(Role.FAN);

    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);

    const handleInvite = (e: React.FormEvent) => {
        e.preventDefault();
        if (username.trim() && password.trim()) {
            onInviteUser({
                username,
                password,
                role,
            });
            setUsername('');
            setPassword('');
            setRole(Role.FAN);
        } else {
            alert("Please provide a username and password.");
        }
    };

    const handleOpenEditModal = (user: User) => {
        setEditingUser(user);
        setIsEditModalOpen(true);
    };

    const handleCloseEditModal = () => {
        setIsEditModalOpen(false);
        setEditingUser(null);
    };

    const handleSaveUser = (user: User) => {
        onUpdateUser(user);
        handleCloseEditModal();
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-cyan-400">User Management</h1>
                <button onClick={() => onReturnToDashboard('dashboard')} className="bg-gray-600 hover:bg-gray-500 text-white font-semibold py-2 px-4 rounded-lg transition-colors">
                  Return to Main Menu
                </button>
            </div>

            <form onSubmit={handleInvite} className="bg-gray-800 p-4 rounded-lg shadow-lg space-y-4">
                <h2 className="text-xl font-semibold">Invite New User</h2>
                <p className="text-sm text-gray-400">Invite a new user here. You can assign them to teams after they've been created by clicking 'Edit'.</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <input
                        type="text"
                        placeholder="Username"
                        value={username}
                        onChange={e => setUsername(e.target.value)}
                        className="bg-gray-700 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                        required
                    />
                    <input
                        type="password"
                        placeholder="Temporary Password"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        className="bg-gray-700 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                        required
                    />
                    <select
                        value={role}
                        onChange={e => setRole(e.target.value as Role)}
                        className="bg-gray-700 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    >
                        {Object.values(Role).map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                </div>
                <button type="submit" className="w-full md:w-auto bg-cyan-500 hover:bg-cyan-600 text-white font-bold py-2 px-4 rounded-md transition-colors">
                    Invite User
                </button>
            </form>

            <div className="bg-gray-800 p-4 rounded-lg shadow-lg">
                <h2 className="text-xl font-semibold mb-2">Current Users</h2>
                <div className="overflow-x-auto">
                    <table className="min-w-full">
                        <thead className="bg-gray-700">
                            <tr>
                                <th className="text-left p-3">Username</th>
                                <th className="text-left p-3">Role</th>
                                <th className="text-left p-3">Status</th>
                                <th className="text-left p-3">Associated Teams</th>
                                <th className="text-left p-3">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map(user => (
                                <tr key={user.id} className={`border-b border-gray-700 hover:bg-gray-600 ${user.status === 'blocked' ? 'bg-red-900/50 text-gray-500' : ''}`}>
                                    <td className="p-3">{user.username}</td>
                                    <td className="p-3">{user.role}</td>
                                    <td className="p-3">
                                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${user.status === 'blocked' ? 'bg-red-500 text-white' : 'bg-green-500 text-white'}`}>
                                            {user.status === 'blocked' ? 'Blocked' : 'Active'}
                                        </span>
                                    </td>
                                    <td className="p-3 text-gray-400">
                                        {user.teamIds && user.teamIds.length > 0
                                            ? user.teamIds
                                                .map(id => teams.find(t => t.id === id)?.name)
                                                .filter(Boolean)
                                                .join(', ')
                                            : 'N/A'}
                                    </td>
                                    <td className="p-3">
                                        {user.role !== Role.ADMIN && (
                                            <div className="flex space-x-2">
                                                <button 
                                                  onClick={() => handleOpenEditModal(user)}
                                                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-1 px-3 rounded-md text-sm transition-colors"
                                                >
                                                    Edit
                                                </button>
                                                <button 
                                                    onClick={() => onUpdateUser({ ...user, status: user.status === 'blocked' ? 'active' : 'blocked' })}
                                                    className={`font-bold py-1 px-3 rounded-md text-sm transition-colors ${user.status === 'blocked' ? 'bg-yellow-500 hover:bg-yellow-600 text-black' : 'bg-gray-600 hover:bg-gray-500 text-white'}`}
                                                >
                                                    {user.status === 'blocked' ? 'Unblock' : 'Block'}
                                                </button>
                                                <button 
                                                  onClick={() => onDeleteUser(user.id)}
                                                  className="bg-red-600 hover:bg-red-700 text-white font-bold py-1 px-3 rounded-md text-sm transition-colors"
                                                >
                                                    Delete
                                                </button>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {isEditModalOpen && editingUser && (
                <EditUserModal 
                    user={editingUser}
                    teams={teams}
                    onSave={handleSaveUser}
                    onClose={handleCloseEditModal}
                />
            )}
        </div>
    );
};

export default UserManagement;