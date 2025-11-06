
import React, { useState, useCallback, useEffect } from 'react';
import { Team, Game, Player, Stat, StatType, User, Role, AccessRequest, RequestStatus, ParentInvitation, InvitationStatus, DrillAssignment, DrillType, DrillStatus, SoundEffects, SoundEffectName, Feedback, FeedbackType, FeedbackStatus } from './types';
import TeamManagement from './components/TeamManagement';
import Schedule from './components/Schedule';
import GameTracker from './components/GameTracker';
import Dashboard from './components/Dashboard';
import FaceOffTrainer from './components/FaceOffTrainer';
import Login from './components/Login';
import UserManagement from './components/UserManagement';
import ParentDashboard from './components/ParentDashboard';
import PlayerDashboard from './components/PlayerDashboard';
import Notifications from './components/Notifications';
import DevSupport from './components/DevSupport';
import TrainingMenu from './components/TrainingMenu';
import ShootingDrill from './components/ShootingDrill';
import SoundEffectsManager from './components/SoundEffectsManager';
import FeedbackComponent from './components/Feedback';
import ApiKeyManager from './components/ApiKeyManager';
import GameReport from './components/GameReport';
import Analytics from './components/Analytics';
import PlayerProfile from './components/PlayerProfile';
import * as storageService from './services/storageService';
import { AppDatabase } from './services/storageService';
import * as apiKeyService from './services/apiKeyService';

// By loading the entire database state once at the top-level, we prevent
// multiple, redundant reads from localStorage during the initial render
// cycle, improving startup performance and consistency.
const initialDb = storageService.loadDatabase();

// This function safely determines the initial active game ID without causing
// side effects during component initialization. It now includes defensive
// checks to prevent crashes from malformed data.
const getInitialActiveGameId = (): string | null => {
    // Defensively ensure games is an array to prevent crashes if loaded data is malformed.
    const games = initialDb.games || [];
    const { activeGameId } = initialDb;
    if (activeGameId && games.some(g => g.id === activeGameId)) {
        return activeGameId;
    }
    return null;
};


const App: React.FC = () => {
  const [teams, setTeams] = useState<Team[]>(initialDb.teams);
  const [games, setGames] = useState<Game[]>(initialDb.games);
  const [currentView, setCurrentView] = useState<storageService.View>(initialDb.currentView);
  const [activeGameId, setActiveGameId] = useState<string | null>(getInitialActiveGameId);
  const [users, setUsers] = useState<User[]>(initialDb.users);
  const [currentUser, setCurrentUser] = useState<User | null>(initialDb.currentUser);
  const [accessRequests, setAccessRequests] = useState<AccessRequest[]>(initialDb.accessRequests);
  const [parentInvitations, setParentInvitations] = useState<ParentInvitation[]>(initialDb.parentInvitations);
  const [drillAssignments, setDrillAssignments] = useState<DrillAssignment[]>(initialDb.drillAssignments);
  const [soundEffects, setSoundEffects] = useState<SoundEffects>(initialDb.soundEffects);
  const [feedback, setFeedback] = useState<Feedback[]>(initialDb.feedback);
  const [activeDrillAssignment, setActiveDrillAssignment] = useState<DrillAssignment | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isApiKeySet, setIsApiKeySet] = useState(false);
  const [isLoadingApiKey, setIsLoadingApiKey] = useState(true);
  const [gameForReport, setGameForReport] = useState<Game | null>(null);
  const [viewingPlayer, setViewingPlayer] = useState<{ player: Player; team: Team } | null>(null);
  
  const [loginError, setLoginError] = useState('');

  useEffect(() => {
    const checkApiKey = async () => {
      const keyIsAvailable = await apiKeyService.initializeApiKey();
      setIsApiKeySet(keyIsAvailable);
      setIsLoadingApiKey(false);
    };
    checkApiKey();
  }, []);

  // Seed default admin and other users if no users exist
  useEffect(() => {
    // This seeding logic runs only if the user list in storage is empty.
    if (users.length === 0) {
      // 1. Create Users
      const adminUser: User = {
        id: `user_${Date.now()}_admin`,
        username: 'admin',
        email: 'kishdav@gmail.com',
        password: 'Ki$h', // In a real app, this should be hashed.
        role: Role.ADMIN,
        status: 'active',
      };
      const playerUser: User = {
        id: `user_${Date.now()}_player`,
        username: 'Player',
        email: 'player@example.com',
        password: '1234',
        role: Role.PLAYER,
        status: 'active',
      };
       const parentUser: User = {
        id: `user_${Date.now()}_parent`,
        username: 'Parent',
        email: 'parent@example.com',
        password: '1234',
        role: Role.PARENT,
        status: 'active',
      };
       const coachUser: User = {
        id: `user_${Date.now()}_coach`,
        username: 'Coach',
        email: 'coach@example.com',
        password: '1234',
        role: Role.COACH,
        status: 'active',
      };

      // 2. Create the Player for the Roster, linking them to their user account
      const samplePlayerOnRoster: Player = {
        id: `player_${Date.now()}_sample`,
        name: playerUser.username,
        jerseyNumber: '13',
        position: 'Midfield',
        userId: playerUser.id,
      };

      // 3. Create the Sample Team and add the player to its roster
      const sampleTeam: Team = {
        id: 'sample_team_id',
        name: 'Sample Team',
        roster: [samplePlayerOnRoster],
      };

      // 4. Associate users with the new sample team and player
      playerUser.teamIds = [sampleTeam.id];
      coachUser.teamIds = [sampleTeam.id];
      parentUser.followedTeamIds = [sampleTeam.id];
      parentUser.followedPlayerIds = [samplePlayerOnRoster.id];
      
      // 5. Set state for users and teams
      setUsers([adminUser, playerUser, parentUser, coachUser]);
      setTeams([sampleTeam]);
    }
  }, []); // Empty dependency array ensures this runs only once on initial load.

  // This single effect replaces all individual save effects. It creates a
  // snapshot of the current state and saves it to storage in one atomic
  // operation. This prevents race conditions and improves performance by
  // drastically reducing writes to localStorage, which was causing the app to crash.
  useEffect(() => {
    const db: AppDatabase = {
      teams,
      games,
      currentView,
      activeGameId,
      users,
      currentUser,
      accessRequests,
      parentInvitations,
      drillAssignments,
      soundEffects,
      feedback,
    };
    
    // We prevent saving an invalid state where the game view is active
    // but there is no active game ID. This can happen briefly during
    // navigation away from a finished game.
    if (db.currentView === 'game' && !db.activeGameId) {
        return;
    }

    storageService.saveDatabase(db);
  }, [
    teams,
    games,
    currentView,
    activeGameId,
    users,
    currentUser,
    accessRequests,
    parentInvitations,
    drillAssignments,
    soundEffects,
    feedback,
  ]);

  useEffect(() => {
     if (currentUser?.role === Role.PLAYER && currentView === 'dashboard') {
        setCurrentView('playerDashboard');
    } else if (currentUser?.role !== Role.PLAYER && currentView === 'playerDashboard') {
        setCurrentView('dashboard');
    }
  }, [currentUser, currentView]);


  useEffect(() => {
    if (currentView === 'game' && !activeGameId) {
        const defaultView = currentUser?.role === Role.PLAYER ? 'playerDashboard' : 'dashboard';
        setCurrentView(defaultView);
    }
  }, [currentView, activeGameId, currentUser]);

  useEffect(() => {
    // Redirect if we are on the report page without a game selected (e.g., on refresh)
    if (currentView === 'gameReport' && !gameForReport) {
      const defaultView = currentUser?.role === Role.PLAYER ? 'playerDashboard' : 'dashboard';
      setCurrentView(defaultView);
    }
  }, [currentView, gameForReport, currentUser]);

  useEffect(() => {
    if (!currentUser) return;

    const role = currentUser.role;
    let isViewValidForRole = true;

    switch (currentView) {
      case 'users':
      case 'soundEffects':
      case 'devSupport':
      case 'analytics':
        if (role !== Role.ADMIN && role !== Role.COACH) isViewValidForRole = false;
        break;
      case 'parentDashboard':
        if (role !== Role.PARENT) isViewValidForRole = false;
        break;
      case 'playerDashboard':
        if (role !== Role.PLAYER) isViewValidForRole = false;
        break;
    }

    if (!isViewValidForRole) {
      // This user is on a view they shouldn't be on. Redirect them to their default dashboard.
      let defaultView: storageService.View = 'dashboard';
      if (role === Role.PLAYER) defaultView = 'playerDashboard';
      if (role === Role.PARENT) defaultView = 'parentDashboard';
      setCurrentView(defaultView);
    }
  }, [currentView, currentUser]);
  
  const handleLogin = (username: string, password: string): void => {
      const user = users.find(u => u.username.toLowerCase() === username.toLowerCase() && u.password === password);
      if (user) {
          if (user.status === 'blocked') {
            setLoginError('This account has been blocked.');
            return;
          }
          setCurrentUser(user);
          setLoginError('');
           if (user.role === Role.PLAYER) {
              setCurrentView('playerDashboard');
          } else if (user.role === Role.PARENT) {
              setCurrentView('parentDashboard');
          } else {
              setCurrentView('dashboard');
          }
      } else {
          setLoginError('Invalid username or password.');
      }
  };
  
  const handleAcceptInvitation = useCallback((invitationCode: string, userToUpdate: User): { success: boolean, error?: string, updatedUser?: User } => {
    const invitation = parentInvitations.find(inv => inv.invitationCode.toLowerCase() === invitationCode.toLowerCase() && inv.status === InvitationStatus.PENDING);
    if (!invitation) {
        return { success: false, error: "Invalid or expired invitation code." };
    }
    if (invitation.parentEmail.toLowerCase() !== userToUpdate.email.toLowerCase()) {
        return { success: false, error: "This invitation is for a different email address." };
    }

    const team = teams.find(t => t.id === invitation.teamId);
    const player = users.find(u => u.id === invitation.invitingPlayerId);
    if (!team || !player) {
         return { success: false, error: "The team or player associated with this invite no longer exists." };
    }
     const playerOnRoster = team?.roster.find(p => p.userId === player?.id);

    if (!playerOnRoster) {
      return { success: false, error: "The player associated with this invite is no longer on the team roster." };
    }

    const updatedFollowedTeams = [...(userToUpdate.followedTeamIds || [])];
    if (!updatedFollowedTeams.includes(team.id)) {
        updatedFollowedTeams.push(team.id);
    }
    
    const updatedFollowedPlayers = [...(userToUpdate.followedPlayerIds || [])];
    if (!updatedFollowedPlayers.includes(playerOnRoster.id)) {
        updatedFollowedPlayers.push(playerOnRoster.id);
    }
    
    const finalUpdatedUser = {
        ...userToUpdate,
        followedTeamIds: updatedFollowedTeams,
        followedPlayerIds: updatedFollowedPlayers,
    };
    
    setParentInvitations(parentInvitations.map(inv => inv.id === invitation.id ? {...inv, status: InvitationStatus.ACCEPTED} : inv));
    
    return { success: true, updatedUser: finalUpdatedUser };

  }, [parentInvitations, teams, users]);

  const handleRegister = (username: string, email: string, password: string, role: Role, invitationCode?: string): { success: boolean, error?: string } => {
    if (users.some(u => u.username.toLowerCase() === username.toLowerCase())) {
        return { success: false, error: 'Username is already taken.' };
    }
    if (users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
        return { success: false, error: 'An account with this email already exists.' };
    }

    let newUser: User = {
        id: `user_${Date.now()}`,
        username,
        email,
        password,
        role: role,
        status: 'active',
    };
    
    let postRegistrationMessage = '';

    if (role === Role.PARENT && invitationCode) {
        const result = handleAcceptInvitation(invitationCode, newUser);
        if (result.success && result.updatedUser) {
            newUser = result.updatedUser;
            postRegistrationMessage = "Invitation accepted! You are now following the team and player.";
        } else {
            return { success: false, error: result.error || "Failed to accept invitation." };
        }
    }

    const newUsersList = [...users, newUser];
    setUsers(newUsersList);
    setCurrentUser(newUser);

    if (postRegistrationMessage) {
        setTimeout(() => alert(postRegistrationMessage), 100);
    }
    
    return { success: true };
  };
  
  const handlePasswordResetRequest = (email: string): void => {
    if (email.toLowerCase() === 'kishdav@gmail.com') {
        alert(`Admin Password Reminder: The password is "Ki$h".`);
        return;
    }
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (user) {
        // In a real app, you would send an email. For this demo, we'll alert the password.
        alert(`Password reset for ${user.username}: Your password is "${user.password}". Please login and change it immediately.`);
    }
    // We don't give feedback if the email doesn't exist to prevent user enumeration attacks.
    // A generic message will be shown in the UI.
  };

  const handleLogout = () => {
      setCurrentUser(null);
      setCurrentView('dashboard'); // Reset to a safe view
  };

  const handleInviteUser = (newUser: Omit<User, 'id' | 'email'>) => {
    const userWithId = { ...newUser, id: `user_${Date.now()}`, email: `${newUser.username.toLowerCase()}@example.com`, status: 'active' as const };
    setUsers([...users, userWithId]);
  };

  const handleDeleteUser = (userId: string) => {
    if (currentUser && currentUser.id === userId) {
      alert("You cannot delete your own account.");
      return;
    }
    setUsers(users.filter(u => u.id !== userId));
  };

  const handleUpdateUser = (updatedUser: User) => {
    setUsers(users.map(u => u.id === updatedUser.id ? updatedUser : u));
    if (currentUser && currentUser.id === updatedUser.id) {
        setCurrentUser(updatedUser);
    }
  };

  const handleAddTeam = (teamName: string) => {
    const newTeam: Team = { id: `team_${Date.now()}`, name: teamName, roster: [] };
    
    let currentTeams = [...teams];
    const sampleTeam = currentTeams.find(t => t.id === 'sample_team_id');
    const isFirstRealTeam = sampleTeam && currentTeams.length === 1;

    let finalTeams = [...currentTeams, newTeam];
    
    // If this is the first "real" team being added, we need to clean up all sample team associations.
    if (isFirstRealTeam && sampleTeam) {
        const sampleTeamPlayerIds = sampleTeam.roster.map(p => p.id);
        
        // Find users associated with the sample team and remove all associations
        const updatedUsers = users.map(user => {
            const newUser = {...user};
            let hasChanged = false;

            if (newUser.teamIds?.includes('sample_team_id')) {
                newUser.teamIds = newUser.teamIds.filter(id => id !== 'sample_team_id');
                hasChanged = true;
            }
            if (newUser.followedTeamIds?.includes('sample_team_id')) {
                newUser.followedTeamIds = newUser.followedTeamIds.filter(id => id !== 'sample_team_id');
                hasChanged = true;
            }
            if (newUser.followedPlayerIds) {
                const originalLength = newUser.followedPlayerIds.length;
                newUser.followedPlayerIds = newUser.followedPlayerIds.filter(id => !sampleTeamPlayerIds.includes(id));
                if (originalLength !== newUser.followedPlayerIds.length) {
                    hasChanged = true;
                }
            }
            
            return hasChanged ? newUser : user;
        });
        setUsers(updatedUsers);

        // Clear the sample team's roster
        finalTeams = finalTeams.map(team => 
            team.id === 'sample_team_id' ? { ...team, roster: [] } : team
        );
    }
    
    setTeams(finalTeams);
  };


  const handleUpdateTeam = (updatedTeam: Team) => {
    setTeams(teams.map(t => t.id === updatedTeam.id ? updatedTeam : t));
  };
  
  const handleDeleteTeam = (teamId: string) => {
    setTeams(teams.filter(t => t.id !== teamId));
    setGames(games.filter(g => g.homeTeam.id !== teamId && g.awayTeam.id !== teamId));
  };

  const handleAddGame = (homeTeamId: string, awayTeamInfo: { id?: string; name?: string }, scheduledTime: string) => {
    const homeTeam = teams.find(t => t.id === homeTeamId);
    let awayTeam: Team | undefined;

    if (awayTeamInfo.id) {
      awayTeam = teams.find(t => t.id === awayTeamInfo.id);
    } else if (awayTeamInfo.name) {
      const newOpponentTeam: Team = { id: `team_${Date.now()}`, name: awayTeamInfo.name, roster: [] };
      setTeams(prevTeams => [...prevTeams, newOpponentTeam]);
      awayTeam = newOpponentTeam;
    }

    if (homeTeam && awayTeam) {
      const newGame: Game = {
        id: `game_${Date.now()}`,
        homeTeam,
        awayTeam,
        scheduledTime,
        status: 'scheduled',
        score: { home: 0, away: 0 },
        stats: [],
        penalties: [],
        currentPeriod: 1,
        gameClock: 720,
      };
      setGames([...games, newGame]);
    }
  };

  const handleUpdateGame = (updatedGame: Game) => {
    setGames(games.map(g => g.id === updatedGame.id ? updatedGame : g));
    
    // If the game being updated is the active one and it's now finished,
    // clear the activeGameId. This will trigger the useEffect to navigate away.
    if (updatedGame.id === activeGameId && updatedGame.status === 'finished') {
        // We set a brief timeout to allow the user to see the "Game Over" screen
        // and its options before being navigated away.
        // This is a UX improvement over instant navigation.
        setTimeout(() => {
            // Check if the user hasn't already navigated to the report screen
            if (currentView === 'game') {
                setActiveGameId(null);
            }
        }, 4000); // 4-second delay
    }
  };
  
  const handleReturnToDashboardFromGame = () => {
    setActiveGameId(null);
    const defaultView = currentUser?.role === Role.PLAYER ? 'playerDashboard' : 'dashboard';
    setCurrentView(defaultView);
  };

  const handleDeleteGame = (gameId: string) => {
    setGames(games.filter(g => g.id !== gameId));
  };

  const startGame = (gameId: string) => {
    const game = games.find(g => g.id === gameId);
    if(game){
      handleUpdateGame({...game, status: 'live'});
      setActiveGameId(gameId);
      setCurrentView('game');
    }
  };
  
  const handlePlayerJoinRequest = (teamId: string, playerJersey: string, playerPosition: string) => {
    if (!currentUser || currentUser.role !== Role.PLAYER) return;
    const newRequest: AccessRequest = {
      id: `req_${Date.now()}`,
      requestingUserId: currentUser.id,
      teamId,
      playerName: currentUser.username,
      playerJersey,
      playerPosition,
      status: RequestStatus.PENDING,
    };
    setAccessRequests([...accessRequests, newRequest]);
  };
  
  const handleInviteParent = (parentEmail: string): { success: boolean, error?: string } => {
    if (!currentUser || currentUser.role !== Role.PLAYER || !currentUser.teamIds || currentUser.teamIds.length === 0) {
        return { success: false, error: "You must be a player on a team to send invites." };
    }
    const currentTeamId = currentUser.teamIds[0]; // Assuming player is on one team for simplicity
    
    const newInvitation: ParentInvitation = {
        id: `inv_${Date.now()}`,
        invitingPlayerId: currentUser.id,
        teamId: currentTeamId,
        parentEmail,
        invitationCode: `LAX${Date.now().toString().slice(-6)}`,
        status: InvitationStatus.PENDING,
    };
    setParentInvitations([...parentInvitations, newInvitation]);
    return { success: true };
  };

  const handleUpdateRequestStatus = (requestId: string, newStatus: RequestStatus) => {
    const request = accessRequests.find(r => r.id === requestId);
    if (!request) return;

    if (newStatus === RequestStatus.APPROVED) {
      const requestingUser = users.find(u => u.id === request.requestingUserId);
      if (requestingUser) {
        // Add team to user's associations
        const updatedTeamIds = [...(requestingUser.teamIds || [])];
        if (!updatedTeamIds.includes(request.teamId)) {
          updatedTeamIds.push(request.teamId);
        }
        handleUpdateUser({ ...requestingUser, teamIds: updatedTeamIds });

        // If it was a player join request, add them to the roster
        if (requestingUser.role === Role.PLAYER) {
          const teamToUpdate = teams.find(t => t.id === request.teamId);
          if (teamToUpdate) {
            const newPlayer: Player = {
              id: `player_${Date.now()}_${requestingUser.id}`,
              name: requestingUser.username,
              jerseyNumber: request.playerJersey,
              position: request.playerPosition || 'N/A',
              userId: requestingUser.id, // Link the roster player to the user account
            };
            const updatedRoster = [...teamToUpdate.roster, newPlayer];
            handleUpdateTeam({ ...teamToUpdate, roster: updatedRoster });
          }
        }
      }
    }
    
    setAccessRequests(accessRequests.map(r => r.id === requestId ? { ...r, status: newStatus } : r));
  };
  
  const handleAddDrillAssignment = (playerId: string, drillType: DrillType, notes: string) => {
    if (!currentUser) return;
    const newAssignment: DrillAssignment = {
        id: `drill_${Date.now()}`,
        assigningCoachId: currentUser.id,
        playerId,
        drillType,
        notes,
        status: DrillStatus.ASSIGNED,
        assignedDate: new Date().toISOString(),
    };
    setDrillAssignments([...drillAssignments, newAssignment]);
  };

  const handleUpdateDrillAssignment = (assignmentId: string, status: DrillStatus, results?: any) => {
    setDrillAssignments(prev => prev.map(assignment => {
        if (assignment.id === assignmentId) {
            return {
                ...assignment,
                status,
                results,
                completedDate: new Date().toISOString()
            };
        }
        return assignment;
    }));
    setActiveDrillAssignment(null); // Clear the active assignment
    // Return to the player's dashboard after completion
    setCurrentView(currentUser?.role === Role.PLAYER ? 'playerDashboard' : 'dashboard');
  };

  const handleStartAssignedDrill = (assignment: DrillAssignment) => {
    setActiveDrillAssignment(assignment);
    if (assignment.drillType === DrillType.FACE_OFF) {
        setCurrentView('faceOffTrainer');
    } else if (assignment.drillType === DrillType.SHOOTING) {
        setCurrentView('shootingDrill');
    }
  };

  const handleUpdateSoundEffect = (name: SoundEffectName, data: string | undefined) => {
    setSoundEffects(prev => ({
        ...prev,
        [name]: data,
    }));
  };
  
  const handleAddFeedback = (type: FeedbackType, message: string) => {
    if (!currentUser) return;
    const newFeedback: Feedback = {
      id: `feedback_${Date.now()}`,
      userId: currentUser.id,
      username: currentUser.username,
      userRole: currentUser.role,
      type,
      message,
      timestamp: new Date().toISOString(),
      status: FeedbackStatus.NEW,
    };
    setFeedback([...feedback, newFeedback]);
    alert("Thank you! Your feedback has been submitted.");
    
    let returnView: storageService.View = 'dashboard';
    if (currentUser.role === Role.PLAYER) returnView = 'playerDashboard';
    if (currentUser.role === Role.PARENT) returnView = 'parentDashboard';
    setCurrentView(returnView);
  };
  
  const handleUpdateFeedbackStatus = (feedbackId: string, status: FeedbackStatus) => {
    setFeedback(feedback.map(f => f.id === feedbackId ? { ...f, status } : f));
  };

  const handleResetApiKey = async () => {
    setIsLoadingApiKey(true);
    await apiKeyService.clearApiKey();
    setIsApiKeySet(false);
    setIsLoadingApiKey(false);
  };
  
  const handleViewReport = (game: Game) => {
    setGameForReport(game);
    setCurrentView('gameReport');
  };

  const handleViewPlayerProfile = (player: Player, team: Team) => {
    setViewingPlayer({ player, team });
    setCurrentView('playerProfile');
  };

  const activeGame = games.find(g => g.id === activeGameId);

  if (isLoadingApiKey) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">Loading...</div>;
  }
  
  if (!isApiKeySet) {
    return <ApiKeyManager onApiKeySet={() => {
      setIsApiKeySet(true);
      // Re-initialize the API key in the service after it's set
      apiKeyService.initializeApiKey();
    }} />;
  }
  
  if (!currentUser) {
    return <Login 
      onLogin={handleLogin} 
      onRegister={handleRegister}
      onPasswordResetRequest={handlePasswordResetRequest}
      error={loginError}
      onResetApiKey={handleResetApiKey}
    />;
  }
  
  const renderContent = () => {
    switch (currentView) {
      case 'teams':
        return <TeamManagement 
          teams={teams} 
          onAddTeam={handleAddTeam} 
          onUpdateTeam={handleUpdateTeam} 
          onDeleteTeam={handleDeleteTeam} 
          onReturnToDashboard={() => setCurrentView('dashboard')}
          accessRequests={accessRequests}
          users={users}
          onUpdateRequestStatus={handleUpdateRequestStatus}
          drillAssignments={drillAssignments}
          onAddDrillAssignment={handleAddDrillAssignment}
          currentUser={currentUser}
          onViewPlayerProfile={handleViewPlayerProfile}
        />;
      case 'schedule':
        return <Schedule teams={teams} games={games} onAddGame={handleAddGame} onStartGame={startGame} onDeleteGame={handleDeleteGame} onReturnToDashboard={() => setCurrentView('dashboard')} onViewReport={handleViewReport}/>;
      case 'game':
        if (activeGame) return <GameTracker game={activeGame} onUpdateGame={handleUpdateGame} onReturnToDashboard={handleReturnToDashboardFromGame} currentUser={currentUser} onViewReport={handleViewReport} />;
        return null;
      case 'gameReport':
        return gameForReport ? (
          <GameReport game={gameForReport} onClose={() => {
              setGameForReport(null);
              const defaultView = currentUser?.role === Role.PLAYER ? 'playerDashboard' : 'dashboard';
              setCurrentView(defaultView);
          }}/>
        ) : null;
      case 'analytics':
        return <Analytics teams={teams} games={games} onReturnToDashboard={() => setCurrentView('dashboard')} />;
      case 'playerProfile':
        return viewingPlayer ? (
          <PlayerProfile
            player={viewingPlayer.player}
            team={viewingPlayer.team}
            games={games}
            onClose={() => {
              setViewingPlayer(null);
              setCurrentView('teams'); // Go back to the teams view
            }}
          />
        ) : null;
      case 'trainingMenu':
        return <TrainingMenu onViewChange={setCurrentView} />;
      case 'faceOffTrainer':
        return <FaceOffTrainer
          onReturnToDashboard={() => {
            setActiveDrillAssignment(null); // Clear assignment if they leave early
            setCurrentView(activeDrillAssignment ? 'playerDashboard' : 'trainingMenu');
          }}
          activeAssignment={activeDrillAssignment}
          onCompleteAssignment={handleUpdateDrillAssignment}
          soundEffects={soundEffects}
        />;
      case 'shootingDrill':
        return <ShootingDrill
          onReturnToDashboard={() => {
            setActiveDrillAssignment(null); // Clear assignment if they leave early
            setCurrentView(activeDrillAssignment ? 'playerDashboard' : 'trainingMenu');
          }}
          activeAssignment={activeDrillAssignment}
          onCompleteAssignment={handleUpdateDrillAssignment}
          soundEffects={soundEffects}
        />;
      case 'users':
        if (currentUser.role === Role.ADMIN || currentUser.role === Role.COACH) {
            return <UserManagement users={users} teams={teams} onInviteUser={handleInviteUser} onDeleteUser={handleDeleteUser} onUpdateUser={handleUpdateUser} onReturnToDashboard={() => setCurrentView('dashboard')} />;
        }
        return null; // Fallback for non-admins, handled by useEffect
      case 'soundEffects':
        if (currentUser.role === Role.ADMIN || currentUser.role === Role.COACH) {
          return <SoundEffectsManager
            soundEffects={soundEffects}
            onUpdateSoundEffect={handleUpdateSoundEffect}
            onReturnToDashboard={() => setCurrentView('dashboard')}
          />;
        }
        return null; // Fallback for non-admins, handled by useEffect
      case 'feedback':
        return <FeedbackComponent
          currentUser={currentUser}
          feedbackList={feedback}
          onAddFeedback={handleAddFeedback}
          onUpdateFeedbackStatus={handleUpdateFeedbackStatus}
          onReturnToDashboard={() => {
            const defaultView = currentUser?.role === Role.PLAYER ? 'playerDashboard' : (currentUser?.role === Role.PARENT ? 'parentDashboard' : 'dashboard');
            setCurrentView(defaultView);
          }}
        />
      case 'devSupport':
        if (currentUser.role === Role.ADMIN || currentUser.role === Role.COACH) {
          return <DevSupport onReturnToDashboard={() => setCurrentView('dashboard')} />;
        }
        return null; // Fallback for non-admins, handled by useEffect
      case 'parentDashboard':
          if (currentUser.role === Role.PARENT) {
            return <ParentDashboard
                currentUser={currentUser}
                teams={teams}
                games={games}
                onUpdateUser={handleUpdateUser}
                onAcceptInvitation={(code) => {
                    const result = handleAcceptInvitation(code, currentUser);
                    if (result.success && result.updatedUser) {
                        handleUpdateUser(result.updatedUser);
                        alert("Invitation accepted successfully!");
                    } else {
                        alert(`Error: ${result.error}`);
                    }
                }}
            />
          }
          return null;
      case 'playerDashboard':
         if (currentUser.role === Role.PLAYER) {
          return <PlayerDashboard 
            currentUser={currentUser}
            teams={teams}
            games={games}
            onJoinRequest={handlePlayerJoinRequest}
            onInviteParent={handleInviteParent}
            invitations={parentInvitations}
            drillAssignments={drillAssignments}
            onStartDrill={handleStartAssignedDrill}
          />
         }
         return null;
      case 'dashboard':
      default:
        return <Dashboard games={games} onStartGame={startGame} onViewChange={setCurrentView} activeGameId={activeGameId} onViewReport={handleViewReport} />;
    }
  };

  const isTrainingView = ['trainingMenu', 'faceOffTrainer', 'shootingDrill'].includes(currentView);
  
  let allNavItems: { view: storageService.View; label: string }[] = [];

  if (currentUser.role === Role.ADMIN) {
    allNavItems = [
      { view: 'dashboard', label: 'Dashboard' },
      { view: 'teams', label: 'Teams' },
      { view: 'schedule', label: 'Schedule' },
      { view: 'analytics', label: 'Analytics' },
      { view: 'trainingMenu', label: 'Training' },
      { view: 'users', label: 'Users' },
      { view: 'feedback', label: 'Feedback' },
      { view: 'soundEffects', label: 'Sound FX' },
      { view: 'devSupport', label: 'Dev Support' },
    ];
  } else if (currentUser.role === Role.COACH) {
     allNavItems = [
      { view: 'dashboard', label: 'Dashboard' },
      { view: 'teams', label: 'Teams' },
      { view: 'schedule', label: 'Schedule' },
      { view: 'analytics', label: 'Analytics' },
      { view: 'trainingMenu', label: 'Training' },
      { view: 'feedback', label: 'Feedback' },
    ];
  } else if (currentUser.role === Role.PLAYER) {
      allNavItems = [
        { view: 'playerDashboard', label: 'Dashboard' },
        { view: 'trainingMenu', label: 'Training' },
        { view: 'feedback', label: 'Feedback' },
      ];
  } else if (currentUser.role === Role.PARENT) {
      allNavItems = [
        { view: 'parentDashboard', label: 'Dashboard' },
        { view: 'feedback', label: 'Feedback' },
      ];
  } else { // FAN, etc.
      allNavItems = [
        { view: 'dashboard', label: 'Dashboard' },
      ];
  }


  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 font-sans">
      <nav className="bg-gray-800 shadow-lg sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <span className="font-bold text-xl text-cyan-400">LAX Keeper AI</span>
            </div>
            <div className="hidden md:flex items-center space-x-4">
              {allNavItems.map(item => {
                  const isActive = item.view === 'trainingMenu' ? isTrainingView : currentView === item.view;
                  let className = `px-3 py-2 rounded-md text-sm font-medium `;
                  if (item.view === 'devSupport') {
                      className += isActive ? 'bg-yellow-600 text-white' : 'text-yellow-400 hover:bg-gray-700 hover:text-white';
                  } else {
                      className += isActive ? 'bg-gray-900 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white';
                  }
                  return (
                      <button key={item.view} onClick={() => setCurrentView(item.view)} className={className}>
                          {item.label}
                      </button>
                  );
              })}
            </div>
            <div className="hidden md:flex items-center">
              <span className="text-gray-300 text-sm mr-4">Welcome, {currentUser.username} ({currentUser.role})</span>
              <button onClick={handleLogout} className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2 px-4 rounded-md text-sm transition-colors">Logout</button>
            </div>
             {/* Mobile Menu Button */}
            <div className="-mr-2 flex md:hidden">
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                type="button"
                className="bg-gray-800 inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-white hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-white"
                aria-controls="mobile-menu"
                aria-expanded={isMenuOpen}
              >
                <span className="sr-only">Open main menu</span>
                {/* Hamburger icon */}
                <svg className={!isMenuOpen ? 'block h-6 w-6' : 'hidden h-6 w-6'} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
                {/* Close icon */}
                <svg className={isMenuOpen ? 'block h-6 w-6' : 'hidden h-6 w-6'} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>
        {/* Mobile Menu Dropdown */}
        {isMenuOpen && (
            <div className="md:hidden" id="mobile-menu">
                <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
                    {allNavItems.map(item => {
                        const isActive = item.view === 'trainingMenu' ? isTrainingView : currentView === item.view;
                        let className = `block w-full text-left px-3 py-2 rounded-md text-base font-medium `;
                        if (item.view === 'devSupport') {
                            className += isActive ? 'bg-yellow-600 text-white' : 'text-yellow-400 hover:bg-gray-700 hover:text-white';
                        } else {
                            className += isActive ? 'bg-gray-900 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white';
                        }
                        return (
                            <button key={item.view} onClick={() => { setCurrentView(item.view); setIsMenuOpen(false); }} className={className}>
                                {item.label}
                            </button>
                        );
                    })}
                </div>
                {/* Mobile User Info & Logout */}
                <div className="pt-4 pb-3 border-t border-gray-700">
                    <div className="flex items-center px-5">
                        <div>
                            <div className="text-base font-medium leading-none text-white">{currentUser.username}</div>
                            <div className="text-sm font-medium leading-none text-gray-400">{currentUser.role}</div>
                        </div>
                    </div>
                    <div className="mt-3 px-2 space-y-1">
                        <button
                            onClick={() => { handleLogout(); setIsMenuOpen(false); }}
                            className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-gray-300 hover:bg-gray-700 hover:text-white"
                        >
                            Logout
                        </button>
                    </div>
                </div>
            </div>
        )}
      </nav>
      <main>
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          {currentView !== 'game' && currentView !== 'playerProfile' && <Notifications 
            currentUser={currentUser} 
            requests={accessRequests} 
            teams={teams}
            users={users}
            onUpdateRequestStatus={handleUpdateRequestStatus}
          /> }
          {renderContent()}
        </div>
      </main>
    </div>
  );
}

export default App;