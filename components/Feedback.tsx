import React, { useState, useMemo } from 'react';
import { Feedback, User, Role, FeedbackType, FeedbackStatus } from '../types';
import { View } from '../services/storageService';

interface FeedbackComponentProps {
  currentUser: User;
  feedbackList: Feedback[];
  onAddFeedback: (type: FeedbackType, message: string) => void;
  onUpdateFeedbackStatus: (feedbackId: string, status: FeedbackStatus) => void;
  onReturnToDashboard: (view: View) => void;
}

const FeedbackForm: React.FC<{
  onAddFeedback: (type: FeedbackType, message: string) => void;
}> = ({ onAddFeedback }) => {
  const [feedbackType, setFeedbackType] = useState<FeedbackType>(FeedbackType.GENERAL_COMMENT);
  const [message, setMessage] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) {
      alert('Please enter your feedback before submitting.');
      return;
    }
    onAddFeedback(feedbackType, message.trim());
    setMessage('');
  };

  return (
    <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold text-cyan-400 mb-4">Submit Feedback</h2>
      <p className="text-gray-400 mb-6">
        Have a suggestion, found a bug, or want to share a comment? Let us know! Your feedback helps improve the app for everyone.
      </p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="feedbackType" className="block text-sm font-medium mb-1">Feedback Type</label>
          <select
            id="feedbackType"
            value={feedbackType}
            onChange={(e) => setFeedbackType(e.target.value as FeedbackType)}
            className="w-full bg-gray-700 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-500"
          >
            {Object.values(FeedbackType).map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="message" className="block text-sm font-medium mb-1">Message</label>
          <textarea
            id="message"
            rows={6}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Please be as detailed as possible..."
            className="w-full bg-gray-700 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-cyan-500"
          />
        </div>
        <button type="submit" className="w-full bg-cyan-500 hover:bg-cyan-600 text-white font-bold py-3 px-4 rounded-md text-lg transition-colors">
          Submit Feedback
        </button>
      </form>
    </div>
  );
};

const FeedbackViewer: React.FC<{
  feedbackList: Feedback[];
  onUpdateFeedbackStatus: (feedbackId: string, status: FeedbackStatus) => void;
}> = ({ feedbackList, onUpdateFeedbackStatus }) => {
  const sortedFeedback = useMemo(() => {
    const statusOrder = { [FeedbackStatus.NEW]: 1, [FeedbackStatus.VIEWED]: 2, [FeedbackStatus.RESOLVED]: 3 };
    return [...feedbackList].sort((a, b) => {
      if (statusOrder[a.status] !== statusOrder[b.status]) {
        return statusOrder[a.status] - statusOrder[b.status];
      }
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });
  }, [feedbackList]);
  
  const getStatusColor = (status: FeedbackStatus) => {
    switch (status) {
      case FeedbackStatus.NEW: return 'bg-yellow-500 text-black';
      case FeedbackStatus.VIEWED: return 'bg-blue-500 text-white';
      case FeedbackStatus.RESOLVED: return 'bg-green-500 text-white';
    }
  };

  return (
    <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold text-cyan-400 mb-4">User Feedback</h2>
      {sortedFeedback.length > 0 ? (
        <div className="space-y-4">
          {sortedFeedback.map(item => (
            <div key={item.id} className="bg-gray-700 p-4 rounded-md border-l-4" style={{ borderColor: getStatusColor(item.status).split(' ')[0].replace('bg-', '#') }}>
              <div className="flex justify-between items-start flex-wrap gap-2 mb-2">
                <div>
                  <p className="font-bold">{item.username} <span className="text-sm text-gray-400">({item.userRole})</span></p>
                  <p className="text-xs text-gray-400">{new Date(item.timestamp).toLocaleString()}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(item.status)}`}>
                    {item.status}
                  </span>
                  <select
                    value={item.status}
                    onChange={(e) => onUpdateFeedbackStatus(item.id, e.target.value as FeedbackStatus)}
                    className="bg-gray-600 text-white text-xs rounded-md p-1 border-0 focus:ring-2 focus:ring-cyan-500"
                  >
                    {Object.values(FeedbackStatus).map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <p className="text-sm font-semibold mb-2 text-cyan-300">[{item.type}]</p>
              <p className="text-gray-300 whitespace-pre-wrap">{item.message}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-gray-500 text-center py-8">No feedback has been submitted yet.</p>
      )}
    </div>
  );
};

const FeedbackComponent: React.FC<FeedbackComponentProps> = ({
  currentUser,
  feedbackList,
  onAddFeedback,
  onUpdateFeedbackStatus,
  onReturnToDashboard,
}) => {
  const isAdmin = currentUser.role === Role.ADMIN;
  
  const getReturnView = (): View => {
    switch(currentUser.role) {
        case Role.PLAYER: return 'playerDashboard';
        case Role.PARENT: return 'parentDashboard';
        default: return 'dashboard';
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-cyan-400">{isAdmin ? 'Feedback Management' : 'Submit Feedback'}</h1>
        <button onClick={() => onReturnToDashboard(getReturnView())} className="bg-gray-600 hover:bg-gray-500 text-white font-semibold py-2 px-4 rounded-lg transition-colors">
          Return to Dashboard
        </button>
      </div>
      
      {isAdmin ? (
        <FeedbackViewer
          feedbackList={feedbackList}
          onUpdateFeedbackStatus={onUpdateFeedbackStatus}
        />
      ) : (
        <FeedbackForm onAddFeedback={onAddFeedback} />
      )}
    </div>
  );
};

export default FeedbackComponent;