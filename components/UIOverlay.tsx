import React from 'react';
import { GameState, PlayerStats, AnomalyEvent } from '../types';
import { Heart, Loader2, ShieldAlert, Coins, Crosshair, Github } from 'lucide-react';

interface UIOverlayProps {
  gameState: GameState;
  stats: PlayerStats;
  anomaly: AnomalyEvent | null;
  onStart: () => void;
  onRestart: () => void;
  onOptionSelect: (index: number) => void;
  loadingAnomaly: boolean;
}

export const UIOverlay: React.FC<UIOverlayProps> = ({
  gameState,
  stats,
  anomaly,
  onStart,
  onRestart,
  onOptionSelect,
  loadingAnomaly
}) => {
  
  // Replaced MENU with LOADING screen
  if (gameState === GameState.LOADING) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/95 z-50 text-center p-4">
        <Loader2 size={64} className="text-cyan-400 animate-spin mb-6" />
        <h2 className="text-2xl font-display font-bold text-cyan-400 tracking-[0.5em] animate-pulse">
          INITIALIZING SYSTEMS...
        </h2>
      </div>
    );
  }

  // Fallback if somehow we are in MENU state (unused now)
  if (gameState === GameState.MENU) {
      return null; 
  }

  if (gameState === GameState.GAME_OVER) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-red-900/80 z-50 text-center p-4 backdrop-blur-sm">
        <h2 className="text-5xl font-display font-bold text-red-500 mb-4">CRITICAL FAILURE</h2>
        <p className="text-2xl text-white mb-2">Score: {stats.score}</p>
        <p className="text-xl text-gray-300 mb-8">Scrap Collected: {stats.scrap}</p>
        <button
          onClick={onRestart}
          className="px-8 py-3 bg-white text-red-900 hover:bg-gray-200 rounded-full font-bold text-lg transition-colors"
        >
          REBOOT SEQUENCE
        </button>
      </div>
    );
  }

  if (gameState === GameState.ANOMALY || loadingAnomaly) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-black/70 z-40 backdrop-blur-md p-4">
        <div className="bg-slate-900 border border-purple-500/50 rounded-lg max-w-2xl w-full p-8 shadow-[0_0_50px_rgba(168,85,247,0.2)] relative overflow-hidden">
          
          {/* Background grid effect */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:14px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none"></div>

          {loadingAnomaly ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 size={48} className="text-purple-400 animate-spin mb-4" />
              <p className="text-purple-300 font-mono animate-pulse">Loading...</p>
            </div>
          ) : anomaly ? (
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-4">
                <ShieldAlert className="text-purple-400" size={24} />
                <h2 className="text-3xl font-display text-purple-100">{anomaly.title}</h2>
              </div>
              
              <div className="bg-black/40 p-4 rounded border-l-4 border-purple-500 mb-8">
                <p className="text-lg text-gray-300 leading-relaxed font-light">
                  {anomaly.description}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {anomaly.options.map((option, idx) => (
                  <button
                    key={idx}
                    onClick={() => onOptionSelect(idx)}
                    className="group relative p-4 bg-slate-800 hover:bg-slate-700 border border-slate-600 hover:border-purple-400 rounded-lg text-left transition-all overflow-hidden"
                  >
                     <div className="absolute inset-0 w-1 bg-purple-500 transition-all group-hover:w-full opacity-10"></div>
                     <h3 className="font-bold text-purple-200 mb-1 relative z-10">{option.text}</h3>
                     <div className="text-xs text-gray-500 uppercase tracking-wider relative z-10">
                       Probability Effect: {option.effect}
                     </div>
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  // HUD
  return (
    <div className="absolute inset-0 pointer-events-none p-6 flex flex-col justify-between z-30">
      {/* Top Bar */}
      <div className="flex justify-between items-start">
        <div className="flex gap-6">
          {/* Health */}
          <div className="bg-slate-900/80 backdrop-blur border border-slate-700 rounded-lg p-3 flex items-center gap-3 min-w-[160px]">
            <div className="bg-red-900/30 p-2 rounded-full">
              <Heart className="text-red-500" size={20} />
            </div>
            <div>
              <div className="text-xs text-gray-400 uppercase font-bold">Health 💖</div>
              <div className="text-xl font-mono text-white">
                {Math.max(0, Math.round(stats.health))} / {stats.maxHealth}
              </div>
              <div className="w-full bg-gray-700 h-1 mt-1 rounded-full overflow-hidden">
                <div 
                  className="bg-red-500 h-full transition-all duration-300" 
                  style={{ width: `${(stats.health / stats.maxHealth) * 100}%` }}
                />
              </div>
            </div>
          </div>

          {/* Scrap */}
          <div className="bg-slate-900/80 backdrop-blur border border-slate-700 rounded-lg p-3 flex items-center gap-3 min-w-[140px]">
            <div className="bg-amber-900/30 p-2 rounded-full">
              <Coins className="text-amber-400" size={20} />
            </div>
            <div>
              <div className="text-xs text-gray-400 uppercase font-bold">Scrap</div>
              <div className="text-xl font-mono text-white">{stats.scrap}</div>
            </div>
          </div>
        </div>

        {/* Score & Github */}
        <div className="flex items-start gap-6 pointer-events-auto">
            {/* GitHub Link */}
            <a
                href="https://github.com/StarKnightt/vibe-shooter"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-gray-500 hover:text-white transition-all opacity-50 hover:opacity-100 bg-black/20 hover:bg-black/60 p-2 rounded-full backdrop-blur-sm h-fit"
            >
                <Github size={20} />
                <span className="text-xs font-mono hidden group-hover:inline">/StarKnightt/vibe-shooter</span>
            </a>

            {/* Score */}
            <div className="text-right pointer-events-none">
                <div className="text-4xl font-display font-bold text-white/80 drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">
                    {stats.score.toString().padStart(6, '0')}
                </div>
                <div className="text-sm text-cyan-400 uppercase tracking-[0.3em]">Current Score</div>
            </div>
        </div>
      </div>

      {/* Bottom Instructions */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-center opacity-50 text-sm font-mono text-white pointer-events-none">
         <span className="bg-white/10 px-2 py-1 rounded mx-1 hidden md:inline">WASD</span> 
         <span className="hidden md:inline"> THRUST </span>
         <span className="mx-2 hidden md:inline">•</span>
         <span className="bg-white/10 px-2 py-1 rounded mx-1 hidden md:inline">MOUSE</span> 
         <span className="hidden md:inline"> AIM </span>
         <span className="mx-2 hidden md:inline">•</span>
         <span className="bg-white/10 px-2 py-1 rounded mx-1">AUTO</span> FIRE
         <span className="md:hidden block mt-2 text-xs opacity-70">TOUCH & DRAG TO MOVE/AIM</span>
      </div>
    </div>
  );
};
