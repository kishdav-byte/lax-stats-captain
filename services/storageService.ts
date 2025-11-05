import { Team, Game, User, AccessRequest, ParentInvitation, DrillAssignment, SoundEffects, Feedback } from '../types';

// This service abstracts the data storage. Currently, it uses a single
// database object in localStorage to simulate a real-time, shared backend.
// To move to Firebase, you would replace the logic in these functions
// with calls to Firestore.

const DB_KEY = 'lacrosse_app_db';

export type View = 'dashboard' | 'teams' | 'schedule' | 'game' | 'trainingMenu' | 'faceOffTrainer' | 'shootingDrill' | 'users' | 'devSupport' | 'playerDashboard' | 'parentDashboard' | 'soundEffects' | 'feedback' | 'gameReport' | 'analytics';


export interface AppDatabase {
  teams: Team[];
  games: Game[];
  users: User[];
  currentUser: User | null;
  accessRequests: AccessRequest[];
  parentInvitations: ParentInvitation[];
  drillAssignments: DrillAssignment[];
  soundEffects: SoundEffects;
  feedback: Feedback[];
  currentView: View;
  activeGameId: string | null;
}

const defaultState: AppDatabase = {
  teams: [],
  games: [],
  users: [],
  currentUser: null,
  accessRequests: [],
  parentInvitations: [],
  drillAssignments: [],
  soundEffects: {},
  feedback: [],
  currentView: 'dashboard',
  activeGameId: null,
};

// --- Core DB Functions ---

/**
 * Loads the entire database state from localStorage. This version includes
 * robust data sanitization to prevent crashes from malformed or outdated
 * data structures in storage.
 * @returns {AppDatabase} The complete, sanitized application database state.
 */
export function loadDatabase(): AppDatabase {
  try {
    const savedDataString = localStorage.getItem(DB_KEY);
    if (!savedDataString) {
      return defaultState;
    }

    const savedData = JSON.parse(savedDataString);
    
    // Handle cases where saved data is not an object (e.g., JSON.parse('null'))
    if (typeof savedData !== 'object' || savedData === null) {
        throw new Error("Saved data is not a valid object.");
    }

    // Helper for deep sanitization: filters out invalid entries from arrays
    const sanitizeArray = <T>(arr: any[] | undefined, defaultArr: T[]): T[] => {
        if (!Array.isArray(arr)) {
            return defaultArr;
        }
        // Filter out any entries that are not truthy objects. This handles null, undefined, strings, numbers, etc.
        return arr.filter(item => typeof item === 'object' && item !== null) as T[];
    };
    
    const sanitizedDb: AppDatabase = {
      teams: sanitizeArray(savedData.teams, defaultState.teams),
      games: sanitizeArray(savedData.games, defaultState.games),
      users: sanitizeArray(savedData.users, defaultState.users),
      currentUser: savedData.currentUser !== undefined ? savedData.currentUser : defaultState.currentUser,
      accessRequests: sanitizeArray(savedData.accessRequests, defaultState.accessRequests),
      parentInvitations: sanitizeArray(savedData.parentInvitations, defaultState.parentInvitations),
      drillAssignments: sanitizeArray(savedData.drillAssignments, defaultState.drillAssignments),
      soundEffects: typeof savedData.soundEffects === 'object' && savedData.soundEffects !== null ? savedData.soundEffects : defaultState.soundEffects,
      feedback: sanitizeArray(savedData.feedback, defaultState.feedback),
      currentView: typeof savedData.currentView === 'string' ? savedData.currentView : defaultState.currentView,
      activeGameId: savedData.activeGameId !== undefined ? savedData.activeGameId : defaultState.activeGameId,
    };

    return sanitizedDb;
    
  } catch (e) {
    console.error(`Failed to parse database from localStorage. Resetting to default.`, e);
    localStorage.removeItem(DB_KEY); // Clear corrupted data
    return defaultState;
  }
}

/**
 * Saves the entire database state to localStorage in a single atomic operation.
 * This is now the ONLY function that writes to storage, preventing race
 * conditions and improving performance.
 * @param {AppDatabase} db The complete application database state.
 */
export function saveDatabase(db: AppDatabase): void {
  try {
    const stringifiedData = JSON.stringify(db);
    localStorage.setItem(DB_KEY, stringifiedData);
  } catch (e) {
    console.error(`Failed to save database to localStorage`, e);
    // Optionally, you could add user-facing error handling here.
  }
}