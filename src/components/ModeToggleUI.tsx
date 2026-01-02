import React, { useState } from 'react';
import { useModeManager } from './ModeManager';
import { useVRDetection } from '../hooks/useVRDetection';

export function ModeToggleUI() {
  const { mode, capabilities, switchMode } = useModeManager();
  const [permissionDenied, setPermissionDenied] = useState(false);

  const UI_ACCENT = 'rgba(215, 244, 71, 1)';
  const UI_DARK = 'rgba(30, 30, 30, 1)';
  const GLASS_BG = 'rgba(231, 231, 231, 0.14)';
  const GLASS_BG_HOVER = 'rgba(231, 231, 231, 0.22)';

  // Keep in sync with the music button in App.tsx (48x48, bottom/right = 20)
  const MUSIC_BTN_SIZE = 48;
  const MUSIC_BTN_GAP = 12;

  const handleGyroClick = async () => {
    if (mode === 'gyro') {
      switchMode('normal');
      return;
    }

    // Request permission on iOS 13+
    if (capabilities.canRequestPermission) {
      try {
        console.log('[ModeToggleUI] Requesting permission...');
        const permission = await (DeviceOrientationEvent as any).requestPermission();
        console.log('[ModeToggleUI] Permission result:', permission);
        if (permission === 'granted') {
          console.log('[ModeToggleUI] Switching to gyro mode');
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
      console.log('[ModeToggleUI] Non-iOS device, enabling gyro');
      switchMode('gyro');
      setPermissionDenied(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        right: 'calc(20px + env(safe-area-inset-right))',
        bottom: `calc(${20 + MUSIC_BTN_SIZE + MUSIC_BTN_GAP}px + env(safe-area-inset-bottom))`,
        zIndex: 300,
        display: 'flex',
        gap: 10,
        flexDirection: 'column',
        alignItems: 'flex-end',
        maxWidth: 'calc(100vw - 40px)',
      }}
    >
      {/* Gyro Button */}
      {capabilities.hasGyroscope && (
        <button
          className="ui-btn ui-gyro-btn"
          onClick={handleGyroClick}
          aria-label={mode === 'gyro' ? 'Disable gyro' : 'Enable gyro'}
          style={{
            padding: '10px 14px',
            borderRadius: 4,
            background: GLASS_BG,
            color: UI_DARK,
            border: `2px solid ${UI_ACCENT}`,
            borderTop: 'none',
            borderLeft: 'none',
            cursor: 'pointer',
            fontSize: 13,
            fontWeight: 500,
            backdropFilter: 'blur(10px)',
            transition: 'all 0.2s ease',
            transform: 'scale(1)',
            pointerEvents: 'auto',
            whiteSpace: 'nowrap',
            fontFamily: 'monospace',
            minHeight: 38,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            outline: 'none',
          }}
          onMouseEnter={(e) => {
            const el = e.currentTarget as HTMLButtonElement;
            el.style.background = GLASS_BG_HOVER;
            el.style.transform = 'scale(1.05)';
            // Play hover sound
            const hoverSound = new Audio('/media/hover.mp3');
            hoverSound.volume = 0.3;
            hoverSound.play().catch(() => {});
          }}
          onMouseLeave={(e) => {
            const el = e.currentTarget as HTMLButtonElement;
            el.style.background = GLASS_BG;
            el.style.transform = 'scale(1)';
          }}
        >
          <span className="ui-btn-icon" style={{ fontSize: 16 }}>≡</span>
          <span className="ui-btn-label">{mode === 'gyro' ? 'Gyro Enabled' : 'Enable Gyro'}</span>
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
