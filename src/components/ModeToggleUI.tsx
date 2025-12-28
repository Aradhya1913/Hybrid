import React, { useState } from 'react';
import { useModeManager } from './ModeManager';
import { useVRDetection } from '../hooks/useVRDetection';

export function ModeToggleUI() {
  const { mode, capabilities, switchMode } = useModeManager();
  const [permissionDenied, setPermissionDenied] = useState(false);

  const handleVRClick = () => {
    if (mode === 'vr') {
      switchMode('normal');
    } else {
      switchMode('vr');
    }
  };

  const handleGyroClick = async () => {
    if (mode === 'gyro') {
      switchMode('normal');
      return;
    }

    // Request permission on iOS 13+
    if (capabilities.canRequestPermission) {
      try {
        const permission = await (DeviceOrientationEvent as any).requestPermission();
        if (permission === 'granted') {
          switchMode('gyro');
          setPermissionDenied(false);
        } else {
          setPermissionDenied(true);
        }
      } catch (err) {
        console.warn('[ModeToggleUI] Permission request failed:', err);
        setPermissionDenied(true);
      }
    } else {
      // Non-iOS, just enable
      switchMode('gyro');
      setPermissionDenied(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 20,
        right: 20,
        zIndex: 300,
        display: 'flex',
        gap: 10,
        flexDirection: 'column',
        alignItems: 'flex-end',
        maxWidth: 'calc(100vw - 40px)',
      }}
    >
      {/* Current Mode Indicator */}
      <div
        style={{
          padding: '6px 10px',
          borderRadius: 6,
          background: 'rgba(0, 0, 0, 0.6)',
          color: '#fff',
          fontSize: 11,
          fontWeight: 500,
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          textAlign: 'right',
        }}
      >
        {mode === 'normal' && '👁️ Normal Mode'}
        {mode === 'vr' && '🥽 VR Mode'}
        {mode === 'gyro' && '📱 Gyro Mode'}
      </div>

      {/* VR Button */}
      {capabilities.hasWebXR && (
        <button
          onClick={handleVRClick}
          style={{
            padding: '8px 12px',
            borderRadius: 6,
            background: mode === 'vr' ? 'rgba(239, 68, 68, 0.8)' : 'rgba(255, 255, 255, 0.1)',
            color: '#fff',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            cursor: 'pointer',
            fontSize: 12,
            fontWeight: 500,
            backdropFilter: 'blur(10px)',
            transition: 'all 0.2s ease',
            pointerEvents: 'auto',
            whiteSpace: 'nowrap',
          }}
          onMouseEnter={(e) => {
            const el = e.target as HTMLElement;
            el.style.background = mode === 'vr' ? 'rgba(220, 38, 38, 0.9)' : 'rgba(255, 255, 255, 0.15)';
          }}
          onMouseLeave={(e) => {
            const el = e.target as HTMLElement;
            el.style.background = mode === 'vr' ? 'rgba(239, 68, 68, 0.8)' : 'rgba(255, 255, 255, 0.1)';
          }}
        >
          {mode === 'vr' ? '✕ Exit VR' : '🥽 Enter VR'}
        </button>
      )}

      {/* Gyro Button */}
      {capabilities.hasGyroscope && (
        <button
          onClick={handleGyroClick}
          style={{
            padding: '8px 12px',
            borderRadius: 6,
            background: mode === 'gyro' ? 'rgba(59, 130, 246, 0.8)' : 'rgba(255, 255, 255, 0.1)',
            color: '#fff',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            cursor: 'pointer',
            fontSize: 12,
            fontWeight: 500,
            backdropFilter: 'blur(10px)',
            transition: 'all 0.2s ease',
            pointerEvents: 'auto',
            whiteSpace: 'nowrap',
          }}
          onMouseEnter={(e) => {
            const el = e.target as HTMLElement;
            el.style.background = mode === 'gyro' ? 'rgba(37, 99, 235, 0.9)' : 'rgba(255, 255, 255, 0.15)';
          }}
          onMouseLeave={(e) => {
            const el = e.target as HTMLElement;
            el.style.background = mode === 'gyro' ? 'rgba(59, 130, 246, 0.8)' : 'rgba(255, 255, 255, 0.1)';
          }}
        >
          {mode === 'gyro' ? '✕ Disable Gyro' : '📱 Enable Gyro'}
        </button>
      )}

      {/* Permission Error */}
      {permissionDenied && (
        <div
          style={{
            padding: '6px 10px',
            borderRadius: 6,
            background: 'rgba(239, 68, 68, 0.8)',
            color: '#fff',
            fontSize: 10,
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 100, 100, 0.3)',
            textAlign: 'right',
          }}
        >
          ⚠️ Permission denied
        </div>
      )}
    </div>
  );
}
