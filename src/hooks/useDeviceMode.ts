import { useEffect, useState, useCallback } from 'react';

export type ViewerMode = 'normal' | 'vr' | 'gyro';

interface UseModeOptions {
  onModeChange?: (mode: ViewerMode) => void;
}

export function useDeviceMode(options?: UseModeOptions) {
  const [mode, setMode] = useState<ViewerMode>('normal');

  const switchMode = useCallback((newMode: ViewerMode) => {
    setMode(newMode);
    options?.onModeChange?.(newMode);
  }, [options]);

  // Listen for VR session changes
  useEffect(() => {
    const handleVRStart = () => {
      console.log('[DeviceMode] VR session started');
      switchMode('vr');
    };

    const handleVREnd = () => {
      console.log('[DeviceMode] VR session ended');
      switchMode('normal');
    };

    window.addEventListener('vr-session-start', handleVRStart);
    window.addEventListener('vr-session-end', handleVREnd);

    return () => {
      window.removeEventListener('vr-session-start', handleVRStart);
      window.removeEventListener('vr-session-end', handleVREnd);
    };
  }, [switchMode]);

  return { mode, switchMode };
}
