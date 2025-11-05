
import React from 'react';
import { AccessRequest, Role, Team, User, RequestStatus } from '../types';

interface NotificationsProps {
    currentUser: User;
    requests: AccessRequest[];
    teams: Team[];
    users: User[];
    onUpdateRequestStatus: (requestId: string, newStatus: RequestStatus) => void;
}

const Notifications: React.FC<NotificationsProps> = ({ currentUser, requests, teams, users, onUpdateRequestStatus }) => {
    const { role, teamIds } = currentUser;

    const relevantRequests = requests.filter(req => {
        if (req.status !== RequestStatus.PENDING) return false;

        // Admins see all pending requests.
        if (role === Role.ADMIN) return true;
        // Coaches see requests for their teams.
        if (role === Role.COACH && teamIds?.includes(req.teamId)) return true;
        
        return false;
    });

    if (relevantRequests.length === 0) {
        return null;
    }
    
    const canTakeAction = role === Role.ADMIN || role === Role.COACH;

    return (
        <div className="bg-gray-800 border-l-4 border-cyan-400 p-4 rounded-r-lg shadow-lg mb-6">
            <h3 className="text-xl font-bold mb-2 text-cyan-400">Pending Requests</h3>
            <div className="space-y-3 max-h-60 overflow-y-auto">
                {relevantRequests.map(req => {
                    const requestingUser = users.find(u => u.id === req.requestingUserId);
                    const team = teams.find(t => t.id === req.teamId);

                    if (!requestingUser || !team) return null;
                    
                    const notificationText = (
                        <>
                            Player <span className="font-bold">{requestingUser.username}</span> is requesting to join team <span className="font-bold">{team.name}</span> as #{req.playerJersey} ({req.playerPosition}).
                        </>
                    );

                    return (
                        <div key={req.id} className="bg-gray-700 p-3 rounded-md flex flex-col sm:flex-row justify-between sm:items-center">
                            <div>
                                <p>
                                   {notificationText}
                                </p>
                            </div>
                            {canTakeAction && (
                                <div className="flex space-x-2 mt-2 sm:mt-0 flex-shrink-0">
                                    <button
                                        onClick={() => onUpdateRequestStatus(req.id, RequestStatus.APPROVED)}
                                        className="bg-green-500 hover:bg-green-600 text-white font-bold py-1 px-3 rounded-md text-sm transition-colors"
                                    >
                                        Approve
                                    </button>
                                    <button
                                        onClick={() => onUpdateRequestStatus(req.id, RequestStatus.DENIED)}
                                        className="bg-red-600 hover:bg-red-700 text-white font-bold py-1 px-3 rounded-md text-sm transition-colors"
                                    >
                                        Deny
                                    </button>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default Notifications;