import React, { useRef, useEffect } from 'react';
import { GameState, Entity, EntityType, Vector2, PlayerStats, AnomalyEvent } from '../types';
import { CANVAS_WIDTH, CANVAS_HEIGHT, COLORS, PLAYER_SPEED, ENEMY_SPEED, BULLET_SPEED, FRICTION } from '../constants';
import { playPlayerShootSound, playEnemyShootSound, playExplosionSound, playCollectSound, playHealthSound, playDamageSound, playAnomalySound } from '../services/audioService';

interface GameCanvasProps {
  gameState: GameState;
  setStats: React.Dispatch<React.SetStateAction<PlayerStats>>;
  setGameState: (state: GameState) => void;
  triggerAnomaly: () => void;
  anomalyApplied: AnomalyEvent | null; // Prop to signal an effect needs to be applied
}

export const GameCanvas: React.FC<GameCanvasProps> = ({ 
  gameState, 
  setStats, 
  setGameState, 
  triggerAnomaly,
  anomalyApplied
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);

  // Game State in Refs (for performance, avoiding re-renders during loop)
  const entities = useRef<Entity[]>([]);
  const player = useRef<Entity | null>(null);
  const keys = useRef<Record<string, boolean>>({});
  const mouse = useRef<Vector2>({ x: 0, y: 0 });
  const scoreRef = useRef(0);
  const lastShotTime = useRef(0);
  const enemySpawnTimer = useRef(0);
  const healthSpawnTimer = useRef(0);
  const lastAnomalyScore = useRef(0);
  
  // Touch Controls State
  const touches = useRef<Record<number, { x: number, y: number, type: 'move' | 'aim' }>>({});
  const moveTouchId = useRef<number | null>(null);
  const aimTouchId = useRef<number | null>(null);
  
  // Initialize Game
  const initGame = () => {
    player.current = {
      id: 'player',
      type: EntityType.PLAYER,
      pos: { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2 },
      vel: { x: 0, y: 0 },
      radius: 20,
      color: COLORS.PLAYER,
      health: 100,
      maxHealth: 100,
      rotation: 0
    };
    entities.current = [];
    scoreRef.current = 0;
    lastAnomalyScore.current = 0;
    healthSpawnTimer.current = 0;
    
    // Sync initial stats
    setStats({
      health: 100,
      maxHealth: 100,
      scrap: 0,
      score: 0,
      level: 1
    });
  };

  // Input handlers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => { keys.current[e.code] = true; };
    const handleKeyUp = (e: KeyboardEvent) => { keys.current[e.code] = false; };
    const handleMouseMove = (e: MouseEvent) => {
      mouse.current = { x: e.clientX, y: e.clientY };
    };
    const handleMouseDown = (e: MouseEvent) => { 
        keys.current['MouseLeft'] = true;
        // Init audio on first interaction if needed
    };
    const handleMouseUp = (e: MouseEvent) => { keys.current['MouseLeft'] = false; };

    // Touch Handlers
    const handleTouchStart = (e: TouchEvent) => {
        e.preventDefault(); // Prevent scrolling
        
        for (let i = 0; i < e.changedTouches.length; i++) {
            const t = e.changedTouches[i];
            const x = t.clientX;
            const y = t.clientY;
            
            // Left half of screen = movement
            if (x < window.innerWidth / 2 && moveTouchId.current === null) {
                moveTouchId.current = t.identifier;
                touches.current[t.identifier] = { x, y, type: 'move' };
            } 
            // Right half = aiming
            else if (x >= window.innerWidth / 2 && aimTouchId.current === null) {
                aimTouchId.current = t.identifier;
                touches.current[t.identifier] = { x, y, type: 'aim' };
            }
        }
    };

    const handleTouchMove = (e: TouchEvent) => {
        e.preventDefault();
        for (let i = 0; i < e.changedTouches.length; i++) {
            const t = e.changedTouches[i];
            if (touches.current[t.identifier]) {
                touches.current[t.identifier].x = t.clientX;
                touches.current[t.identifier].y = t.clientY;
            }
        }
    };

    const handleTouchEnd = (e: TouchEvent) => {
        e.preventDefault();
        for (let i = 0; i < e.changedTouches.length; i++) {
            const t = e.changedTouches[i];
            delete touches.current[t.identifier];
            if (moveTouchId.current === t.identifier) moveTouchId.current = null;
            if (aimTouchId.current === t.identifier) aimTouchId.current = null;
        }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    
    // Passive: false is required for preventDefault to work on touch events
    window.addEventListener('touchstart', handleTouchStart, { passive: false });
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd, { passive: false });

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, []);

  // Apply Anomaly Effect (React -> Ref sync)
  useEffect(() => {
    if (anomalyApplied && player.current) {
      // Effect trigger managed by parent updates to stats, synced via the next useEffect
    }
  }, [anomalyApplied]);

  // Sync stats from props to refs when game resumes from anomaly
  useEffect(() => {
    setStats(prev => {
      if (player.current) {
        player.current.health = prev.health;
        player.current.maxHealth = prev.maxHealth;
        // Scrap and Score are visual mostly in stats, but scoreRef drives difficulty
      }
      return prev;
    });
  }, [gameState]);


  // Main Game Loop
  const update = (deltaTime: number) => {
    if (gameState !== GameState.PLAYING) return;
    if (!player.current) return;

    const p = player.current;

    // --- Player Movement ---
    const acc = { x: 0, y: 0 };
    
    // Keyboard Input
    if (keys.current['KeyW']) acc.y -= 1;
    if (keys.current['KeyS']) acc.y += 1;
    if (keys.current['KeyA']) acc.x -= 1;
    if (keys.current['KeyD']) acc.x += 1;

    // Touch Input (Virtual Joystick - Left)
    if (moveTouchId.current !== null && touches.current[moveTouchId.current]) {
        // We calculate relative to a fixed center point or just drag?
        // Simple "drag from where you touched" is better but "virtual joystick center" is standard.
        // Let's assume center of left screen for now or dynamically based on start? 
        // For simplicity: The vector from center of left screen (width/4, height/2) to touch point
        // OR simpler: Just use the touch position relative to player for movement? No, that's RTS style.
        // Let's use simpler logic: Touch position relative to screen center? No.
        
        // Best simple approach without UI:
        // If touch is in left half, it acts as a joystick relative to where you FIRST touched?
        // Or simpler: Dragging anywhere on left half moves player.
        // Actually, let's just stick to visual feedback later. For now logic:
        // We need start position of touch to make it a joystick. 
        // Since I didn't save start pos, let's make it absolute: 
        // Touch relative to (WindowWidth/4, WindowHeight - 100) - Typical joystick pos
        
        const t = touches.current[moveTouchId.current];
        const joystickCenterX = window.innerWidth / 4;
        const joystickCenterY = window.innerHeight - 150;
        
        const dx = t.x - joystickCenterX;
        const dy = t.y - joystickCenterY;
        
        // Normalize
        const len = Math.sqrt(dx*dx + dy*dy);
        if (len > 10) { // Deadzone
            acc.x = dx / len;
            acc.y = dy / len;
        }
    }

    // Normalize acceleration
    const len = Math.sqrt(acc.x * acc.x + acc.y * acc.y);
    if (len > 0) {
      acc.x /= len;
      acc.y /= len;
    }

    p.vel.x += acc.x * 0.5; // Acceleration factor
    p.vel.y += acc.y * 0.5;

    // Friction
    p.vel.x *= FRICTION;
    p.vel.y *= FRICTION;

    p.pos.x += p.vel.x;
    p.pos.y += p.vel.y;

    // Boundaries
    p.pos.x = Math.max(p.radius, Math.min(CANVAS_WIDTH - p.radius, p.pos.x));
    p.pos.y = Math.max(p.radius, Math.min(CANVAS_HEIGHT - p.radius, p.pos.y));

    // Rotation logic
    // Mouse
    if (aimTouchId.current === null) {
        const dx = mouse.current.x - p.pos.x;
        const dy = mouse.current.y - p.pos.y;
        p.rotation = Math.atan2(dy, dx);
    } else {
        // Touch Aim (Right Joystick)
        const t = touches.current[aimTouchId.current];
        const joystickCenterX = (window.innerWidth / 4) * 3;
        const joystickCenterY = window.innerHeight - 150;
        
        const dx = t.x - joystickCenterX;
        const dy = t.y - joystickCenterY;
        p.rotation = Math.atan2(dy, dx);
    }

    // --- Shooting (Automatic) ---
    const now = Date.now();
    if (now - lastShotTime.current > 150) { // Fire rate
      const bx = Math.cos(p.rotation);
      const by = Math.sin(p.rotation);
      entities.current.push({
        id: `bullet-${now}`,
        type: EntityType.BULLET,
        pos: { x: p.pos.x + bx * 30, y: p.pos.y + by * 30 },
        vel: { x: bx * BULLET_SPEED, y: by * BULLET_SPEED },
        radius: 4,
        color: COLORS.BULLET,
        health: 1,
        maxHealth: 1,
        rotation: p.rotation,
        life: 60, // frames
        owner: 'PLAYER'
      });
      playPlayerShootSound(); // Sound
      lastShotTime.current = now;
    }

    // --- Enemy Spawning ---
    enemySpawnTimer.current += 1;
    if (enemySpawnTimer.current > 60) { // Spawn every ~1 second
      enemySpawnTimer.current = 0;
      const edge = Math.floor(Math.random() * 4); // 0: top, 1: right, 2: bottom, 3: left
      let ex = 0, ey = 0;
      if (edge === 0) { ex = Math.random() * CANVAS_WIDTH; ey = -30; }
      else if (edge === 1) { ex = CANVAS_WIDTH + 30; ey = Math.random() * CANVAS_HEIGHT; }
      else if (edge === 2) { ex = Math.random() * CANVAS_WIDTH; ey = CANVAS_HEIGHT + 30; }
      else { ex = -30; ey = Math.random() * CANVAS_HEIGHT; }

      entities.current.push({
        id: `enemy-${Date.now()}-${Math.random()}`,
        type: EntityType.ENEMY,
        pos: { x: ex, y: ey },
        vel: { x: 0, y: 0 },
        radius: 15,
        color: COLORS.ENEMY,
        health: 20,
        maxHealth: 20,
        rotation: 0,
        value: 10,
        lastShot: Date.now() + Math.random() * 1000 // Stagger initial shots
      });
    }

    // --- Health Pickup Spawning ---
    healthSpawnTimer.current += 1;
    if (healthSpawnTimer.current > 900) { // Spawn every ~15 seconds (60fps * 15)
      healthSpawnTimer.current = 0;
      if (Math.random() > 0.3) { // 70% chance to spawn when timer hits
        entities.current.push({
          id: `health-${Date.now()}`,
          type: EntityType.HEALTH_PICKUP,
          pos: { x: Math.random() * (CANVAS_WIDTH - 100) + 50, y: Math.random() * (CANVAS_HEIGHT - 100) + 50 },
          vel: { x: 0, y: 0 },
          radius: 15,
          color: COLORS.HEALTH,
          health: 1,
          maxHealth: 1,
          rotation: 0,
          value: 20 // Heal amount
        });
      }
    }

    // --- Anomalies (Gemini Trigger) ---
    // Trigger every 500 score
    if (scoreRef.current - lastAnomalyScore.current >= 500) {
        lastAnomalyScore.current = scoreRef.current;
        // Spawn Anomaly Core instead of direct trigger for better gameplay flow
        entities.current.push({
            id: `anomaly-${Date.now()}`,
            type: EntityType.ANOMALY_CORE,
            pos: { x: Math.random() * (CANVAS_WIDTH - 100) + 50, y: Math.random() * (CANVAS_HEIGHT - 100) + 50 },
            vel: { x: 0, y: 0 },
            radius: 25,
            color: COLORS.ANOMALY,
            health: 1,
            maxHealth: 1,
            rotation: 0
        });
    }

    // --- Entity Updates ---
    for (let i = entities.current.length - 1; i >= 0; i--) {
      const ent = entities.current[i];

      // Movement
      ent.pos.x += ent.vel.x;
      ent.pos.y += ent.vel.y;

      // Logic based on type
      if (ent.type === EntityType.BULLET) {
        if (ent.life) ent.life--;
        if (ent.life !== undefined && ent.life <= 0) {
          entities.current.splice(i, 1);
          continue;
        }

        // Player Bullet vs Enemy Collision handled in Enemy block loop for efficiency? 
        // Actually current logic handles it in Enemy block.
        // But we need to handle Enemy Bullet vs Player here or in Player block?
        // Easier to handle "Bullet hitting Player" here if bullet owner is ENEMY
        if (ent.owner === 'ENEMY') {
             const dist = Math.hypot(p.pos.x - ent.pos.x, p.pos.y - ent.pos.y);
             if (dist < p.radius + ent.radius) {
                 p.health -= 5; // Enemy bullet damage
                 playDamageSound(); // Sound
                 createParticles(ent.pos, 3, COLORS.PLAYER);
                 entities.current.splice(i, 1);
                 if (p.health <= 0) {
                     playExplosionSound(); // Game Over sound
                     setGameState(GameState.GAME_OVER);
                 }
                 continue;
             }
        }

      } else if (ent.type === EntityType.ENEMY) {
        // Chase player
        const angle = Math.atan2(p.pos.y - ent.pos.y, p.pos.x - ent.pos.x);
        ent.vel.x = Math.cos(angle) * ENEMY_SPEED;
        ent.vel.y = Math.sin(angle) * ENEMY_SPEED;
        ent.rotation = angle;

        // Shooting Logic
        const now = Date.now();
        if (ent.lastShot && now - ent.lastShot > 1000) { // Fire every 1 second (Faster!)
            ent.lastShot = now;
            const bx = Math.cos(ent.rotation);
            const by = Math.sin(ent.rotation);
            entities.current.push({
                id: `bullet-enemy-${now}-${Math.random()}`,
                type: EntityType.BULLET,
                pos: { x: ent.pos.x + bx * 20, y: ent.pos.y + by * 20 },
                vel: { x: bx * (BULLET_SPEED * 0.8), y: by * (BULLET_SPEED * 0.8) }, // Faster enemy bullets
                radius: 4,
                color: '#ef4444', // Red bullets
                health: 1,
                maxHealth: 1,
                rotation: ent.rotation,
                life: 80,
                owner: 'ENEMY'
            });
            // playEnemyShootSound(); // Optional: might be too noisy if many enemies
        }

        // Collision with Player
        const dist = Math.hypot(p.pos.x - ent.pos.x, p.pos.y - ent.pos.y);
        if (dist < p.radius + ent.radius) {
          p.health -= 10;
          playDamageSound(); // Sound
          createParticles(ent.pos, 5, COLORS.PLAYER);
          entities.current.splice(i, 1);
          if (p.health <= 0) {
              playExplosionSound();
              setGameState(GameState.GAME_OVER);
          }
          continue;
        }
      } else if (ent.type === EntityType.SCRAP) {
          // Magnet effect if close
          const dist = Math.hypot(p.pos.x - ent.pos.x, p.pos.y - ent.pos.y);
          if (dist < 150) {
              ent.pos.x += (p.pos.x - ent.pos.x) * 0.1;
              ent.pos.y += (p.pos.y - ent.pos.y) * 0.1;
          }
          // Collect
          if (dist < p.radius + ent.radius) {
              setStats(prev => ({ ...prev, scrap: prev.scrap + (ent.value || 1) }));
              playCollectSound(); // Sound
              entities.current.splice(i, 1);
              continue;
          }
      } else if (ent.type === EntityType.ANOMALY_CORE) {
          // Pulsate
          ent.radius = 25 + Math.sin(Date.now() * 0.005) * 5;
          const dist = Math.hypot(p.pos.x - ent.pos.x, p.pos.y - ent.pos.y);
          if (dist < p.radius + ent.radius) {
              playAnomalySound(); // Sound
              triggerAnomaly(); // Pause and call Gemini
              entities.current.splice(i, 1);
              continue;
          }
      } else if (ent.type === EntityType.HEALTH_PICKUP) {
          // Pulsate
          ent.radius = 15 + Math.sin(Date.now() * 0.005) * 2;
          const dist = Math.hypot(p.pos.x - ent.pos.x, p.pos.y - ent.pos.y);
          if (dist < p.radius + ent.radius) {
              // Heal Player
              p.health = Math.min(p.maxHealth, p.health + (ent.value || 20));
              playHealthSound(); // Sound
              createParticles(ent.pos, 10, COLORS.HEALTH); // Green particles
              entities.current.splice(i, 1);
              continue;
          }
      }

      // Collision: Bullet vs Enemy (Only Player Bullets)
      if (ent.type === EntityType.ENEMY) {
        for (let j = entities.current.length - 1; j >= 0; j--) {
          const bullet = entities.current[j];
          if (bullet.type === EntityType.BULLET && bullet.owner === 'PLAYER') {
            const dist = Math.hypot(ent.pos.x - bullet.pos.x, ent.pos.y - bullet.pos.y);
            if (dist < ent.radius + bullet.radius) {
              ent.health -= 10;
              entities.current.splice(j, 1); // Remove bullet
              if (ent.health <= 0) {
                createParticles(ent.pos, 8, COLORS.ENEMY);
                playExplosionSound(); // Sound
                // Drop Scrap
                entities.current.push({
                    id: `scrap-${Date.now()}`,
                    type: EntityType.SCRAP,
                    pos: { ...ent.pos },
                    vel: { x: (Math.random() - 0.5), y: (Math.random() - 0.5) },
                    radius: 8,
                    color: COLORS.SCRAP,
                    health: 1,
                    maxHealth: 1,
                    rotation: 0,
                    value: 5
                });
                
                scoreRef.current += ent.value || 10;
                entities.current.splice(i, 1); // Remove enemy
              }
              break;
            }
          }
        }
      }
    }
    
    // Sync UI periodically
    setStats(prev => ({
        ...prev,
        health: p.health,
        score: scoreRef.current
    }));
  };

  const createParticles = (pos: Vector2, count: number, color: string) => {
    for (let i = 0; i < count; i++) {
      entities.current.push({
        id: `part-${Date.now()}-${i}`,
        type: EntityType.PARTICLE,
        pos: { ...pos },
        vel: { x: (Math.random() - 0.5) * 10, y: (Math.random() - 0.5) * 10 },
        radius: Math.random() * 3 + 1,
        color: color,
        health: 1,
        maxHealth: 1,
        rotation: 0,
        life: 30 + Math.random() * 20
      });
    }
  };

  const draw = (ctx: CanvasRenderingContext2D) => {
    // Clear
    ctx.fillStyle = COLORS.BG;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Draw Grid (Retro effect)
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    const gridSize = 50;
    for (let x = 0; x < CANVAS_WIDTH; x += gridSize) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, CANVAS_HEIGHT); ctx.stroke();
    }
    for (let y = 0; y < CANVAS_HEIGHT; y += gridSize) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(CANVAS_WIDTH, y); ctx.stroke();
    }

    if (gameState === GameState.MENU) return;
    if (!player.current) return;

    const p = player.current;

    // Draw Player
    ctx.save();
    ctx.translate(p.pos.x, p.pos.y);
    ctx.rotate(p.rotation);
    ctx.fillStyle = p.color;
    // Ship shape
    ctx.beginPath();
    ctx.moveTo(20, 0);
    ctx.lineTo(-15, 15);
    ctx.lineTo(-10, 0);
    ctx.lineTo(-15, -15);
    ctx.closePath();
    ctx.fill();
    
    // Thruster flame
    if (keys.current['KeyW'] || (moveTouchId.current !== null && touches.current[moveTouchId.current])) {
        ctx.fillStyle = '#f97316';
        ctx.beginPath();
        ctx.moveTo(-12, 5);
        ctx.lineTo(-25 - Math.random()*10, 0);
        ctx.lineTo(-12, -5);
        ctx.fill();
    }
    ctx.restore();

    // Draw Entities
    entities.current.forEach(ent => {
      ctx.save();
      ctx.translate(ent.pos.x, ent.pos.y);
      
      if (ent.type === EntityType.ENEMY) {
          ctx.rotate(ent.rotation);
          ctx.fillStyle = ent.color;
          ctx.beginPath();
          ctx.moveTo(15, 0);
          ctx.lineTo(-10, 10);
          ctx.lineTo(-10, -10);
          ctx.fill();
          // Health bar above enemy
          ctx.fillStyle = 'red';
          ctx.fillRect(-15, -20, 30, 4);
          ctx.fillStyle = '#22c55e';
          ctx.fillRect(-15, -20, 30 * (ent.health / ent.maxHealth), 4);

      } else if (ent.type === EntityType.BULLET) {
          ctx.fillStyle = ent.color;
          ctx.beginPath();
          ctx.arc(0, 0, ent.radius, 0, Math.PI * 2);
          ctx.fill();
          // Glow
          ctx.shadowBlur = 10;
          ctx.shadowColor = ent.color;
          ctx.stroke();
      } else if (ent.type === EntityType.PARTICLE) {
          ctx.globalAlpha = (ent.life || 1) / 30;
          ctx.fillStyle = ent.color;
          ctx.fillRect(-ent.radius, -ent.radius, ent.radius*2, ent.radius*2);
      } else if (ent.type === EntityType.SCRAP) {
          ctx.fillStyle = ent.color;
          ctx.rotate(Date.now() * 0.01);
          ctx.fillRect(-5, -5, 10, 10);
      } else if (ent.type === EntityType.ANOMALY_CORE) {
          ctx.fillStyle = 'rgba(168, 85, 247, 0.5)'; // Purple transparent
          ctx.beginPath();
          ctx.arc(0, 0, ent.radius, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#fff';
          ctx.beginPath();
          ctx.arc(0, 0, ent.radius * 0.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 20;
          ctx.shadowColor = '#a855f7';
      } else if (ent.type === EntityType.HEALTH_PICKUP) {
          // Green cross icon
          ctx.fillStyle = ent.color;
          ctx.beginPath();
          ctx.arc(0, 0, ent.radius, 0, Math.PI * 2);
          ctx.fill();
          
          ctx.shadowBlur = 15;
          ctx.shadowColor = ent.color;
          ctx.stroke();

          // Draw White Cross
          ctx.fillStyle = '#ffffff';
          const w = 6; // width of cross bars
          const l = 16; // length of cross bars
          ctx.fillRect(-w/2, -l/2, w, l);
          ctx.fillRect(-l/2, -w/2, l, w);
      }
      
      ctx.restore();
    });

    // Draw Mobile Controls (Virtual Joysticks)
    // Always draw circles to indicate where controls are
    const joystickRadius = 50;
    const joystickKnobRadius = 20;
    
    // Left Joystick (Movement) - Bottom Left
    const leftCenterX = window.innerWidth / 4;
    const leftCenterY = window.innerHeight - 150;
    
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(leftCenterX, leftCenterY, joystickRadius, 0, Math.PI * 2);
    ctx.stroke();
    
    // Draw active knob for left joystick
    if (moveTouchId.current !== null && touches.current[moveTouchId.current]) {
        const t = touches.current[moveTouchId.current];
        let dx = t.x - leftCenterX;
        let dy = t.y - leftCenterY;
        const dist = Math.sqrt(dx*dx + dy*dy);
        if (dist > joystickRadius) {
            dx = (dx / dist) * joystickRadius;
            dy = (dy / dist) * joystickRadius;
        }
        
        ctx.fillStyle = 'rgba(6, 182, 212, 0.5)'; // Cyan
        ctx.beginPath();
        ctx.arc(leftCenterX + dx, leftCenterY + dy, joystickKnobRadius, 0, Math.PI * 2);
        ctx.fill();
    } else {
        // Center knob inactive
        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.beginPath();
        ctx.arc(leftCenterX, leftCenterY, joystickKnobRadius, 0, Math.PI * 2);
        ctx.fill();
    }

    // Right Joystick (Aiming) - Bottom Right
    const rightCenterX = (window.innerWidth / 4) * 3;
    const rightCenterY = window.innerHeight - 150;
    
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.beginPath();
    ctx.arc(rightCenterX, rightCenterY, joystickRadius, 0, Math.PI * 2);
    ctx.stroke();

    // Draw active knob for right joystick
    if (aimTouchId.current !== null && touches.current[aimTouchId.current]) {
        const t = touches.current[aimTouchId.current];
        let dx = t.x - rightCenterX;
        let dy = t.y - rightCenterY;
        const dist = Math.sqrt(dx*dx + dy*dy);
        if (dist > joystickRadius) {
            dx = (dx / dist) * joystickRadius;
            dy = (dy / dist) * joystickRadius;
        }
        
        ctx.fillStyle = 'rgba(249, 115, 22, 0.5)'; // Orange
        ctx.beginPath();
        ctx.arc(rightCenterX + dx, rightCenterY + dy, joystickKnobRadius, 0, Math.PI * 2);
        ctx.fill();
    } else {
        // Center knob inactive
        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.beginPath();
        ctx.arc(rightCenterX, rightCenterY, joystickKnobRadius, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.restore();
  };

  const loop = (time: number) => {
    const deltaTime = time - lastTimeRef.current;
    lastTimeRef.current = time;

    update(deltaTime);
    
    const canvas = canvasRef.current;
    if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) draw(ctx);
    }

    requestRef.current = requestAnimationFrame(loop);
  };

  // Start Loop
  useEffect(() => {
    if (gameState === GameState.PLAYING) {
        // Initialize if first run OR if player is dead (restart)
        if (player.current === null || player.current.health <= 0) {
            initGame();
        }
    }
    
    requestRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(requestRef.current);
  }, [gameState]);

  return (
    <canvas 
        ref={canvasRef} 
        width={CANVAS_WIDTH} 
        height={CANVAS_HEIGHT} 
        className="block bg-slate-900 cursor-crosshair touch-none"
    />
  );
};
