import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { ViewerMode } from '../hooks/useDeviceMode';
import { SceneDef } from '../data/scenes';
import { VRCapabilities } from '../hooks/useVRDetection';

interface ModeContextType {
  mode: ViewerMode;
  currentSceneIndex: number;
  capabilities: VRCapabilities;
  switchMode: (mode: ViewerMode) => void;
  setCurrentScene: (index: number) => void;
  goToPreviousScene: () => void;
  goToNextScene: () => void;
}

const ModeContext = createContext<ModeContextType | undefined>(undefined);

export function ModeProvider({
  children,
  scenes,
  capabilities,
}: {
  children: ReactNode;
  scenes: SceneDef[];
  capabilities: VRCapabilities;
}) {
  const [mode, setMode] = useState<ViewerMode>('normal');
  const [currentSceneIndex, setCurrentSceneIndex] = useState(0);

  const switchMode = useCallback((newMode: ViewerMode) => {
    console.log('[ModeManager] Switching to mode:', newMode);
    setMode(newMode);
    window.dispatchEvent(new CustomEvent('mode-changed', { detail: { mode: newMode } }));
  }, []);

  const setCurrentScene = useCallback((index: number) => {
    const clampedIndex = ((index % scenes.length) + scenes.length) % scenes.length;
    setCurrentSceneIndex(clampedIndex);
    window.dispatchEvent(new CustomEvent('scene-changed', { detail: { index: clampedIndex } }));
  }, [scenes.length]);

  const goToPreviousScene = useCallback(() => {
    setCurrentScene(currentSceneIndex - 1);
  }, [currentSceneIndex, setCurrentScene]);

  const goToNextScene = useCallback(() => {
    setCurrentScene(currentSceneIndex + 1);
  }, [currentSceneIndex, setCurrentScene]);

  const value: ModeContextType = {
    mode,
    currentSceneIndex,
    capabilities,
    switchMode,
    setCurrentScene,
    goToPreviousScene,
    goToNextScene,
  };

  return <ModeContext.Provider value={value}>{children}</ModeContext.Provider>;
}

export function useModeManager() {
  const context = useContext(ModeContext);
  if (!context) {
    throw new Error('useModeManager must be used within ModeProvider');
  }
  return context;
}
