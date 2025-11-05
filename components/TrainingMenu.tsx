
import React from 'react';
import { View } from '../services/storageService';

interface TrainingMenuProps {
  onViewChange: (view: View) => void;
}

const TrainingMenu: React.FC<TrainingMenuProps> = ({ onViewChange }) => {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-cyan-400">Training Center</h1>
        <p className="text-gray-400 mt-1">Select a drill to begin your training session.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div 
          className="bg-gray-800 p-6 rounded-lg shadow-xl hover:shadow-cyan-500/20 transition-all duration-300 cursor-pointer hover:scale-105 flex flex-col items-center justify-center text-center" 
          onClick={() => onViewChange('faceOffTrainer')}
        >
          <h2 className="text-2xl font-semibold">Face-Off Drills</h2>
          <p className="text-gray-400 mt-2">Use the AI Trainer to measure and improve your reaction time on the whistle.</p>
        </div>
        <div 
          className="bg-gray-800 p-6 rounded-lg shadow-xl hover:shadow-cyan-500/20 transition-all duration-300 cursor-pointer hover:scale-105 flex flex-col items-center justify-center text-center" 
          onClick={() => onViewChange('shootingDrill')}
        >
          <h2 className="text-2xl font-semibold">Shooting Drills</h2>
          <p className="text-gray-400 mt-2">Measure your shot release speed or track your shot placement to build an accuracy heatmap.</p>
        </div>
      </div>
       <div className="text-center pt-4">
        <button onClick={() => onViewChange('dashboard')} className="bg-gray-600 hover:bg-gray-500 text-white font-semibold py-2 px-6 rounded-lg transition-colors">
          Return to Main Menu
        </button>
      </div>
    </div>
  );
};

export default TrainingMenu;
