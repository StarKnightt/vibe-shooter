import React, { useState, useCallback, useEffect } from 'react';
import { GameCanvas } from './components/GameCanvas';
import { UIOverlay } from './components/UIOverlay';
import { GameState, PlayerStats, AnomalyEvent } from './types';
import { generateAnomaly } from './services/geminiService';

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(GameState.LOADING);
  const [stats, setStats] = useState<PlayerStats>({
    health: 100,
    maxHealth: 100,
    scrap: 0,
    score: 0,
    level: 1
  });
  const [currentAnomaly, setCurrentAnomaly] = useState<AnomalyEvent | null>(null);
  const [loadingAnomaly, setLoadingAnomaly] = useState(false);
  const [anomalyEffectApplied, setAnomalyEffectApplied] = useState<AnomalyEvent | null>(null); // Trigger ref updates

  const startGame = () => {
    setGameState(GameState.PLAYING);
    setStats({
      health: 100,
      maxHealth: 100,
      scrap: 0,
      score: 0,
      level: 1
    });
  };

  // Simulate initial loading
  useEffect(() => {
    if (gameState === GameState.LOADING) {
      const timer = setTimeout(() => {
        startGame();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [gameState]);

  const restartGame = () => {
    setGameState(GameState.PLAYING);
    setStats({
      health: 100,
      maxHealth: 100,
      scrap: 0,
      score: 0,
      level: 1
    });
    setCurrentAnomaly(null);
    // Logic inside GameCanvas will re-init entities
  };

  const handleTriggerAnomaly = useCallback(async () => {
    setGameState(GameState.ANOMALY);
    setLoadingAnomaly(true);
    // Call Gemini
    try {
        const anomaly = await generateAnomaly(stats.level, stats.scrap);
        setCurrentAnomaly(anomaly);
    } catch (e) {
        console.error("Failed to generate anomaly", e);
        // Simple fallback handled in service, but just in case:
        setGameState(GameState.PLAYING);
    } finally {
        setLoadingAnomaly(false);
    }
  }, [stats.level, stats.scrap]);

  const handleOptionSelect = (index: number) => {
    if (!currentAnomaly) return;
    
    const choice = currentAnomaly.options[index];
    
    // Apply effects to React State (Visuals)
    setStats(prev => {
        let newHealth = prev.health;
        let newScrap = prev.scrap;
        
        if (choice.effect === 'HEAL') newHealth = Math.min(prev.maxHealth, prev.health + choice.value);
        if (choice.effect === 'DAMAGE') newHealth = Math.max(0, prev.health - choice.value);
        if (choice.effect === 'SCRAP') newScrap = prev.scrap + choice.value;
        // 'WEAPON' upgrades would ideally change weapon type, simplified here to just nothing for now or scrap
        
        return {
            ...prev,
            health: newHealth,
            scrap: newScrap
        };
    });
    
    // We need to tell GameCanvas to update the Refs specifically for Health if it changed
    setAnomalyEffectApplied(currentAnomaly);

    // Short delay to read outcome? Or just resume.
    // For better UX, maybe show the outcome text for 2s, but for speed -> Resume
    setGameState(GameState.PLAYING);
    setCurrentAnomaly(null);
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-950">
      <GameCanvas 
        gameState={gameState} 
        setStats={setStats} 
        setGameState={setGameState}
        triggerAnomaly={handleTriggerAnomaly}
        anomalyApplied={anomalyEffectApplied}
      />
      <UIOverlay 
        gameState={gameState} 
        stats={stats} 
        anomaly={currentAnomaly}
        onStart={startGame}
        onRestart={restartGame}
        onOptionSelect={handleOptionSelect}
        loadingAnomaly={loadingAnomaly}
      />
    </div>
  );
};

export default App;