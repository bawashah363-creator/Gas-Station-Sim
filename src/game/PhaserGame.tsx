import { useEffect, useImperativeHandle, useRef, forwardRef } from 'react';
import Phaser from 'phaser';
import { GasStationScene, SceneCallbacks } from './GasStationScene';
import {
  ActiveServicePrompt,
  BusinessUnlockId,
  DayPhase,
  EmployeeRecord,
  EquippedCosmetics,
  JoystickVector,
  UpgradeState,
} from './types';

export interface PhaserGameHandle {
  setJoystick: (vec: JoystickVector) => void;
  triggerService: () => void;
  adjustZoom: (delta: number) => void;
  setPaused: (paused: boolean) => void;
  setCosmetics: (equipped: EquippedCosmetics) => void;
  setVisualSettings: (sensitivity: number, graphicsQuality: 'high' | 'balanced') => void;
  triggerLevelUpCelebration: (level: number) => void;
  syncProgress: (
    unlocked: BusinessUnlockId[],
    employees: EmployeeRecord[],
    upgrades: UpgradeState,
    dayPhase: DayPhase,
    washSupplies?: number,
    roomNeedsClean?: boolean
  ) => void;
}

interface PhaserGameProps {
  initialUnlocked: BusinessUnlockId[];
  initialEmployees: EmployeeRecord[];
  initialUpgrades: UpgradeState;
  initialDayPhase: DayPhase;
  initialWashSupplies: number;
  initialRoomNeedsClean: boolean;
  initialEquipped: EquippedCosmetics;
  initialSensitivity: number;
  initialGraphicsQuality: 'high' | 'balanced';
  onPromptChange: (prompt: ActiveServicePrompt | null) => void;
  onActionProgress: (progress: number | null) => void;
  onServiceExecute: (prompt: ActiveServicePrompt, byWorker?: boolean) => boolean;
  onSceneReady?: () => void;
}

export const PhaserGame = forwardRef<PhaserGameHandle, PhaserGameProps>(
  function PhaserGame(
    {
      initialUnlocked,
      initialEmployees,
      initialUpgrades,
      initialDayPhase,
      initialWashSupplies,
      initialRoomNeedsClean,
      initialEquipped,
      initialSensitivity,
      initialGraphicsQuality,
      onPromptChange,
      onActionProgress,
      onServiceExecute,
      onSceneReady,
    },
    ref
  ) {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const gameRef = useRef<Phaser.Game | null>(null);
    const sceneRef = useRef<GasStationScene | null>(null);

    const callbacksRef = useRef<SceneCallbacks>({
      onPromptChange,
      onActionProgress,
      onServiceExecute,
      onSceneReady,
    });
    callbacksRef.current = { onPromptChange, onActionProgress, onServiceExecute, onSceneReady };

    useImperativeHandle(ref, () => ({
      setJoystick(vec: JoystickVector) {
        sceneRef.current?.setJoystick(vec);
      },
      triggerService() {
        sceneRef.current?.triggerActiveService();
      },
      adjustZoom(delta: number) {
        sceneRef.current?.adjustZoom(delta);
      },
      setPaused(paused: boolean) {
        const scene = sceneRef.current;
        if (!scene || !scene.scene || !scene.sys?.settings) return;
        if (paused) {
          if (!scene.scene.isPaused()) {
            scene.scene.pause();
          }
        } else if (scene.scene.isPaused()) {
          scene.scene.resume();
        }
      },
      setCosmetics(equipped: EquippedCosmetics) {
        sceneRef.current?.setCosmetics(equipped);
      },
      setVisualSettings(sensitivity: number, graphicsQuality: 'high' | 'balanced') {
        sceneRef.current?.setVisualSettings(sensitivity, graphicsQuality);
      },
      triggerLevelUpCelebration(level: number) {
        sceneRef.current?.triggerLevelUpCelebration(level);
      },
      syncProgress(unlocked, employees, upgrades, dayPhase, washSupplies, roomNeedsClean) {
        sceneRef.current?.syncProgress(
          unlocked,
          employees,
          upgrades,
          dayPhase,
          washSupplies,
          roomNeedsClean
        );
      },
    }));

    useEffect(() => {
      if (!containerRef.current) return;

      const scene = new GasStationScene();
      sceneRef.current = scene;

      const config: Phaser.Types.Core.GameConfig = {
        type: Phaser.AUTO,
        parent: containerRef.current,
        width: containerRef.current.clientWidth || window.innerWidth,
        height: containerRef.current.clientHeight || window.innerHeight,
        backgroundColor: '#3B7D2B',
        antialias: true,
        roundPixels: false,
        input: {
          activePointers: 3,
        },
        scale: {
          mode: Phaser.Scale.RESIZE,
          autoCenter: Phaser.Scale.CENTER_BOTH,
        },
        scene: [],
      };

      const game = new Phaser.Game(config);
      gameRef.current = game;

      game.scene.add('GasStationScene', scene, true, {
        callbacks: {
          onPromptChange: (p: ActiveServicePrompt | null) =>
            callbacksRef.current.onPromptChange(p),
          onActionProgress: (prog: number | null) =>
            callbacksRef.current.onActionProgress(prog),
          onServiceExecute: (p: ActiveServicePrompt, byWorker?: boolean) =>
            callbacksRef.current.onServiceExecute(p, byWorker),
          onSceneReady: () => callbacksRef.current.onSceneReady?.(),
        },
        unlockedBusinesses: initialUnlocked,
        employees: initialEmployees,
        upgrades: initialUpgrades,
        dayPhase: initialDayPhase,
        washSupplies: initialWashSupplies,
        roomNeedsClean: initialRoomNeedsClean,
        equipped: initialEquipped,
        cameraSensitivity: initialSensitivity,
        graphicsQuality: initialGraphicsQuality,
      });

      const handleWindowResize = () => {
        if (!containerRef.current || !gameRef.current) return;
        const w = containerRef.current.clientWidth;
        const h = containerRef.current.clientHeight;
        if (w > 0 && h > 0) {
          gameRef.current.scale.resize(w, h);
        }
      };

      window.addEventListener('resize', handleWindowResize);
      window.addEventListener('orientationchange', handleWindowResize);

      return () => {
        window.removeEventListener('resize', handleWindowResize);
        window.removeEventListener('orientationchange', handleWindowResize);
        game.destroy(true);
        gameRef.current = null;
        sceneRef.current = null;
      };
    }, []);

    return (
      <div
        ref={containerRef}
        className="absolute inset-0 w-full h-full overflow-hidden touch-none select-none"
      />
    );
  }
);
