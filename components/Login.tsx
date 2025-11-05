
import React, { useState } from 'react';
import { Role } from '../types';

interface LoginProps {
  onLogin: (username: string, password: string) => void;
  onRegister: (username: string, email: string, password: string, role: Role, invitationCode?: string) => { success: boolean, error?: string };
  onPasswordResetRequest: (email: string) => void;
  error: string;
  onResetApiKey: () => void;
}

const Login: React.FC<LoginProps> = ({ onLogin, onRegister, onPasswordResetRequest, error, onResetApiKey }) => {
  const [view, setView] = useState<'login' | 'register' | 'reset'>('login');

  // Login state
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Register state
  const [regUsername, setRegUsername] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [regRole, setRegRole] = useState<Role | ''>('');
  const [regInvitationCode, setRegInvitationCode] = useState('');
  const [registerError, setRegisterError] = useState('');

  // Reset state
  const [resetEmail, setResetEmail] = useState('');
  const [resetMessage, setResetMessage] = useState('');

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onLogin(loginUsername, loginPassword);
  };

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setRegisterError('');
    if (regPassword !== regConfirmPassword) {
      setRegisterError("Passwords do not match.");
      return;
    }
    if (!regRole) {
        setRegisterError("Please select a role.");
        return;
    }
    const result = onRegister(regUsername, regEmail, regPassword, regRole, regInvitationCode);
    if (!result.success && result.error) {
      setRegisterError(result.error);
    }
  };
  
  const handleResetSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onPasswordResetRequest(resetEmail);
    setResetMessage("If an account with that email exists, password reset instructions have been sent.");
  };

  const renderLogin = () => (
    <form onSubmit={handleLoginSubmit} className="space-y-6">
      <div>
        <label htmlFor="username" className="block text-sm font-medium text-gray-300">Username</label>
        <input
          id="username"
          type="text"
          value={loginUsername}
          onChange={(e) => setLoginUsername(e.target.value)}
          required
          className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-cyan-500 focus:border-cyan-500"
        />
      </div>
      <div>
        <label htmlFor="password" className="block text-sm font-medium text-gray-300">Password</label>
        <input
          id="password"
          type="password"
          value={loginPassword}
          onChange={(e) => setLoginPassword(e.target.value)}
          required
          className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-cyan-500 focus:border-cyan-500"
        />
      </div>
      {error && <p className="text-red-400 text-sm">{error}</p>}
      <div>
        <button
          type="submit"
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-cyan-600 hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500"
        >
          Sign In
        </button>
      </div>
      <div className="text-center text-sm text-gray-400 space-y-2">
        <p>
            Don't have an account?{' '}
            <button type="button" onClick={() => { setView('register'); setRegisterError(''); }} className="font-medium text-cyan-400 hover:text-cyan-300">
                Sign Up
            </button>
        </p>
        <p>
            <button type="button" onClick={() => { setView('reset'); setResetMessage(''); }} className="font-medium text-cyan-400 hover:text-cyan-300">
                Forgot Password?
            </button>
        </p>
        <div className="pt-3 mt-3 border-t border-gray-700">
             <p>
                Having trouble with AI features?{' '}
                <button type="button" onClick={onResetApiKey} className="font-medium text-yellow-400 hover:text-yellow-300">
                    Set or Change API Key
                </button>
            </p>
        </div>
      </div>
    </form>
  );

  const renderRegister = () => (
    <form onSubmit={handleRegisterSubmit} className="space-y-4">
      <div>
        <label htmlFor="reg-username" className="block text-sm font-medium text-gray-300">Username</label>
        <input id="reg-username" type="text" value={regUsername} onChange={(e) => setRegUsername(e.target.value)} required className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-cyan-500 focus:border-cyan-500" />
      </div>
      <div>
        <label htmlFor="reg-email" className="block text-sm font-medium text-gray-300">Email Address</label>
        <input id="reg-email" type="email" value={regEmail} onChange={(e) => setRegEmail(e.target.value)} required className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-cyan-500 focus:border-cyan-500" />
      </div>
      <div>
        <label htmlFor="reg-role" className="block text-sm font-medium text-gray-300">I am a...</label>
        <select
          id="reg-role"
          value={regRole}
          onChange={(e) => setRegRole(e.target.value as Role)}
          required
          className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-cyan-500 focus:border-cyan-500"
        >
          <option value="" disabled>Select your role</option>
          <option value={Role.PLAYER}>Player</option>
          <option value={Role.PARENT}>Player Family/Parent</option>
          <option value={Role.COACH}>Coach</option>
        </select>
      </div>
      {regRole === Role.PARENT && (
        <div>
            <label htmlFor="reg-invite-code" className="block text-sm font-medium text-gray-300">Invitation Code (Optional)</label>
            <input id="reg-invite-code" type="text" value={regInvitationCode} onChange={(e) => setRegInvitationCode(e.target.value)} placeholder="Enter code from player" className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-cyan-500 focus:border-cyan-500" />
        </div>
      )}
      <div>
        <label htmlFor="reg-password" className="block text-sm font-medium text-gray-300">Password</label>
        <input id="reg-password" type="password" value={regPassword} onChange={(e) => setRegPassword(e.target.value)} required className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-cyan-500 focus:border-cyan-500" />
      </div>
      <div>
        <label htmlFor="reg-confirm-password" className="block text-sm font-medium text-gray-300">Confirm Password</label>
        <input id="reg-confirm-password" type="password" value={regConfirmPassword} onChange={(e) => setRegConfirmPassword(e.target.value)} required className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-cyan-500 focus:border-cyan-500" />
      </div>
      {registerError && <p className="text-red-400 text-sm">{registerError}</p>}
      <div>
        <button type="submit" className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-cyan-600 hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500">
          Create Account
        </button>
      </div>
       <div className="text-center text-sm text-gray-400">
        <p>
            Already have an account?{' '}
            <button type="button" onClick={() => setView('login')} className="font-medium text-cyan-400 hover:text-cyan-300">
                Sign In
            </button>
        </p>
      </div>
    </form>
  );

  const renderReset = () => (
     <form onSubmit={handleResetSubmit} className="space-y-6">
        <div>
            <label htmlFor="reset-email" className="block text-sm font-medium text-gray-300">Email Address</label>
            <input id="reset-email" type="email" value={resetEmail} onChange={(e) => setResetEmail(e.target.value)} required className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-cyan-500 focus:border-cyan-500" />
        </div>
        {resetMessage && <p className="text-green-400 text-sm text-center">{resetMessage}</p>}
        <div>
            <button type="submit" className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-cyan-600 hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500">
                Send Reset Instructions
            </button>
        </div>
        <div className="text-center text-sm text-gray-400">
            <p>
                <button type="button" onClick={() => setView('login')} className="font-medium text-cyan-400 hover:text-cyan-300">
                    Back to Sign In
                </button>
            </p>
        </div>
    </form>
  );

  const renderContent = () => {
    switch (view) {
      case 'register':
        return {
            title: 'Create an Account',
            content: renderRegister()
        };
      case 'reset':
        return {
            title: 'Reset Your Password',
            content: renderReset()
        };
      case 'login':
      default:
        return {
            title: 'Please sign in to continue',
            content: renderLogin()
        };
    }
  };

  const { title, content } = renderContent();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900">
      <div className="max-w-md w-full bg-gray-800 p-8 rounded-lg shadow-2xl">
        <h1 className="text-4xl font-bold text-center text-cyan-400 mb-2">LAX Keeper AI</h1>
        <p className="text-center text-gray-400 mb-8">{title}</p>
        {content}
      </div>
    </div>
  );
};

export default Login;