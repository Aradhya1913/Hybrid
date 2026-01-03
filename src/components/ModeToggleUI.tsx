import React, { useEffect, useState } from 'react';
import { useModeManager } from './ModeManager';
import { useVRDetection } from '../hooks/useVRDetection';

export function ModeToggleUI() {
  const { mode, capabilities, switchMode } = useModeManager();
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isAutoTourEnabled, setIsAutoTourEnabled] = useState(false);

  const UI_ACCENT = 'rgba(0, 0, 0, 1)';
  const UI_DARK = 'rgba(30, 30, 30, 1)';
  const GLASS_BG = 'rgba(231, 231, 231, 0.14)';
  const GLASS_BG_HOVER = 'rgba(231, 231, 231, 0.22)';

  // Keep in sync with the music button in App.tsx (48x48, bottom/right = 20)
  const MUSIC_BTN_SIZE = 48;
  const MUSIC_BTN_GAP = 12;

  const requestFullscreen = async (elem: Element) => {
    const anyElem = elem as any;
    try {
      if (anyElem.requestFullscreen) {
        await anyElem.requestFullscreen();
      } else if (anyElem.webkitRequestFullscreen) {
        anyElem.webkitRequestFullscreen();
      } else if (anyElem.mozRequestFullScreen) {
        anyElem.mozRequestFullScreen();
      } else if (anyElem.msRequestFullscreen) {
        anyElem.msRequestFullscreen();
      }
    } catch {
      // Ignore (not supported / blocked)
    }
  };

  const exitFullscreen = async () => {
    const anyDoc = document as any;
    try {
      if (document.exitFullscreen) {
        await document.exitFullscreen();
      } else if (anyDoc.webkitExitFullscreen) {
        anyDoc.webkitExitFullscreen();
      } else if (anyDoc.mozCancelFullScreen) {
        anyDoc.mozCancelFullScreen();
      } else if (anyDoc.msExitFullscreen) {
        anyDoc.msExitFullscreen();
      }
    } catch {
      // Ignore
    }
  };

  const lockLandscape = async () => {
    try {
      if (screen.orientation && (screen.orientation as any).lock) {
        await (screen.orientation as any).lock('landscape');
      }
    } catch {
      // Ignore (not supported / requires fullscreen / blocked)
    }
  };

  const unlockOrientation = () => {
    try {
      if (screen.orientation && (screen.orientation as any).unlock) {
        (screen.orientation as any).unlock();
      }
    } catch {
      // Ignore
    }
  };

  const handleVRClick = () => {
    if (mode === 'vr') {
      // Prefer returning to gyro if available, otherwise normal (Three.js)
      unlockOrientation();
      void exitFullscreen();
      switchMode(capabilities.hasGyroscope ? 'gyro' : 'normal');
      return;
    }

    // In gyro mode, do not allow switching directly to VR.
    // User must exit gyro back to normal first.
    if (mode === 'gyro') {
      switchMode('normal');
      return;
    }

    // Best-effort: fullscreen + lock orientation on user gesture
    void requestFullscreen(document.documentElement);
    void lockLandscape();
    switchMode('vr');
  };

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

  const playHoverSound = () => {
    const hoverSound = new Audio('/media/hover.mp3');
    hoverSound.volume = 0.3;
    hoverSound.play().catch(() => {});
  };

  // Keep Auto Tour state in sync if it gets stopped from elsewhere
  useEffect(() => {
    const handleAutoTourStopped = () => setIsAutoTourEnabled(false);
    window.addEventListener('auto-tour-stop', handleAutoTourStopped);
    return () => window.removeEventListener('auto-tour-stop', handleAutoTourStopped);
  }, []);

  // If leaving normal mode, ensure Auto Tour is off.
  useEffect(() => {
    if (mode !== 'normal' && isAutoTourEnabled) {
      setIsAutoTourEnabled(false);
      window.dispatchEvent(new CustomEvent('auto-tour-set', { detail: { enabled: false } }));
    }
  }, [mode, isAutoTourEnabled]);

  const mainButtonLabel = mode === 'vr' ? 'VR' : mode === 'gyro' ? 'Gyro' : 'Modes';

  return (
    <div
      style={{
        position: 'fixed',
        right: 'calc(20px + env(safe-area-inset-right))',
        bottom: `calc(${20 + MUSIC_BTN_SIZE + MUSIC_BTN_GAP}px + env(safe-area-inset-bottom))`,
        zIndex: 300,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        maxWidth: 'calc(100vw - 40px)',
      }}
    >
      {/* Combined Modes Button */}
      <button
        className="ui-btn ui-mode-btn"
        onClick={() => setIsMenuOpen((v) => !v)}
        aria-label="Modes"
        aria-expanded={isMenuOpen}
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
          playHoverSound();
        }}
        onMouseLeave={(e) => {
          const el = e.currentTarget as HTMLButtonElement;
          el.style.background = GLASS_BG;
          el.style.transform = 'scale(1)';
        }}
      >
        <span className="ui-btn-icon" style={{ fontSize: 16 }}>⌂</span>
        <span className="ui-btn-label">{mainButtonLabel}</span>
      </button>

      {/* Menu */}
      {isMenuOpen && (
        <div
          style={{
            marginTop: 10,
            display: 'flex',
            gap: 10,
            flexDirection: 'column',
            alignItems: 'flex-end',
          }}
        >
          {mode === 'normal' && (
            <button
              className="ui-btn ui-auto-tour-btn"
              onClick={() => {
                const next = !isAutoTourEnabled;
                setIsAutoTourEnabled(next);
                window.dispatchEvent(new CustomEvent('auto-tour-set', { detail: { enabled: next } }));
                // Keep the menu open so the user can still switch modes if desired.
              }}
              aria-label={isAutoTourEnabled ? 'Stop Tour' : 'Start Tour'}
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
                playHoverSound();
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget as HTMLButtonElement;
                el.style.background = GLASS_BG;
                el.style.transform = 'scale(1)';
              }}
            >
              <span className="ui-btn-icon" style={{ fontSize: 16 }}>⌂</span>
              <span className="ui-btn-label">{isAutoTourEnabled ? 'Stop Tour' : 'Start Tour'}</span>
            </button>
          )}

          <button
            className="ui-btn ui-vr-btn"
            onClick={() => {
              setIsMenuOpen(false);
              handleVRClick();
            }}
            aria-label={mode === 'vr' ? 'Exit VR' : mode === 'gyro' ? 'Exit Gyro' : 'Enter VR'}
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
              playHoverSound();
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget as HTMLButtonElement;
              el.style.background = GLASS_BG;
              el.style.transform = 'scale(1)';
            }}
          >
            <span className="ui-btn-icon" style={{ fontSize: 16 }}>⌂</span>
            <span className="ui-btn-label">{mode === 'vr' ? 'Exit VR' : mode === 'gyro' ? 'Exit Gyro' : 'Enter VR'}</span>
          </button>

          {capabilities.hasGyroscope && (
            <button
              className="ui-btn ui-gyro-btn"
              onClick={async () => {
                setIsMenuOpen(false);
                await handleGyroClick();
              }}
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
                playHoverSound();
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget as HTMLButtonElement;
                el.style.background = GLASS_BG;
                el.style.transform = 'scale(1)';
              }}
            >
              <span className="ui-btn-icon" style={{ fontSize: 16 }}>⌂</span>
              <span className="ui-btn-label">{mode === 'gyro' ? 'Exit Gyro' : 'Enter Gyro'}</span>
            </button>
          )}
        </div>
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
            marginTop: 10,
          }}
        >
          ⚠️ Permission denied
        </div>
      )}
    </div>
  );
}
