import React, { useEffect, useState } from 'react';
import { useModeManager } from './ModeManager';

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
      // Exit VR and return to normal mode with toolkit
      unlockOrientation();
      void exitFullscreen();
      switchMode('normal');
      setIsMenuOpen(true); // Show toolkit when exiting
      return;
    }

    // In gyro mode, do not allow switching directly to VR.
    // User must exit gyro back to normal first.
    if (mode === 'gyro') {
      switchMode('normal');
      setIsMenuOpen(true); // Show toolkit when exiting
      return;
    }

    // Best-effort: fullscreen + lock orientation on user gesture
    void requestFullscreen(document.documentElement);
    void lockLandscape();
    switchMode('vr');
    setIsMenuOpen(false); // Hide toolkit when entering VR
  };

  const handleGyroClick = async () => {
    if (mode === 'gyro') {
      switchMode('normal');
      setIsMenuOpen(true); // Show toolkit when exiting
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
          setIsMenuOpen(false); // Hide toolkit when entering Gyro
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
      setIsMenuOpen(false); // Hide toolkit when entering Gyro
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

  // Auto Tour is allowed in both normal and VR modes
  // (Gyro mode doesn't support it well due to device orientation conflicts)
  useEffect(() => {
    if (mode === 'gyro' && isAutoTourEnabled) {
      setIsAutoTourEnabled(false);
      window.dispatchEvent(new CustomEvent('auto-tour-set', { detail: { enabled: false } }));
    }
  }, [mode, isAutoTourEnabled]);

  const mainButtonLabel = mode === 'vr' ? 'VR' : mode === 'gyro' ? 'Gyro' : 'Modes';

  const ToolButton = ({
    label,
    icon,
    onClick,
    active,
    disabled,
  }: {
    label: string;
    icon: string;
    onClick: () => void;
    active?: boolean;
    disabled?: boolean;
  }) => (
    <button
      className="ui-btn"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      style={{
        width: '100%',
        padding: '10px 14px',
        borderRadius: 4,
        background: active ? GLASS_BG_HOVER : GLASS_BG,
        color: UI_DARK,
        border: `2px solid ${UI_ACCENT}`,
        borderTop: 'none',
        borderLeft: 'none',
        cursor: disabled ? 'not-allowed' : 'pointer',
        backdropFilter: 'blur(10px)',
        transition: 'all 0.2s ease',
        pointerEvents: 'auto',
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-start',
        gap: 10,
        fontFamily: 'monospace',
        opacity: disabled ? 0.6 : 1,
        outline: 'none',
        fontSize: 13,
        fontWeight: 500,
        minHeight: 38,
        whiteSpace: 'nowrap',
      }}
      onMouseEnter={(e) => {
        if (disabled) return;
        const el = e.currentTarget as HTMLButtonElement;
        el.style.background = GLASS_BG_HOVER;
        el.style.transform = 'scale(1.02)';
        playHoverSound();
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLButtonElement;
        el.style.background = active ? GLASS_BG_HOVER : GLASS_BG;
        el.style.transform = 'scale(1)';
      }}
    >
      <span style={{ fontSize: 16, lineHeight: 1 }}>{icon}</span>
      <span style={{ fontSize: 13, fontWeight: 500, lineHeight: 1 }}>{label}</span>
    </button>
  );

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
        pointerEvents: 'none',
      }}
    >
      {!isMenuOpen && mode === 'normal' && (
        <button
          className="ui-btn ui-mode-btn"
          onClick={() => setIsMenuOpen(true)}
          aria-label={mainButtonLabel}
          aria-expanded={false}
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
            justifyContent: 'center',
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
          <span className="ui-btn-icon" style={{ fontSize: 16 }}>
            ⌂
          </span>
          <span className="ui-btn-label">{mainButtonLabel}</span>
        </button>
      )}

      {/* Exit button for VR mode + Auto Tour toggle */}
      {!isMenuOpen && mode === 'vr' && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
            alignItems: 'flex-end',
          }}
        >
          <button
            className="ui-btn ui-mode-btn"
            onClick={() => {
              const next = !isAutoTourEnabled;
              setIsAutoTourEnabled(next);
              window.dispatchEvent(new CustomEvent('auto-tour-set', { detail: { enabled: next } }));
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
              justifyContent: 'center',
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
            <span className="ui-btn-icon" style={{ fontSize: 16 }}>
              {isAutoTourEnabled ? '■' : '▶'}
            </span>
            <span className="ui-btn-label">{isAutoTourEnabled ? 'Stop Tour' : 'Start Tour'}</span>
          </button>

          <button
            className="ui-btn ui-mode-btn"
            onClick={handleVRClick}
            aria-label="Exit VR"
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
              justifyContent: 'center',
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
            <span className="ui-btn-icon" style={{ fontSize: 16 }}>
              🕶
            </span>
            <span className="ui-btn-label">Exit VR</span>
          </button>
        </div>
      )}

      {/* Exit button for Gyro mode */}
      {!isMenuOpen && mode === 'gyro' && (
        <button
          className="ui-btn ui-mode-btn"
          onClick={() => void handleGyroClick()}
          aria-label="Exit Gyro"
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
            justifyContent: 'center',
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
          <span className="ui-btn-icon" style={{ fontSize: 16 }}>
            ⌖
          </span>
          <span className="ui-btn-label">Exit Gyro</span>
        </button>
      )}

      {isMenuOpen && mode === 'normal' && (
        <div
          style={{
            padding: 10,
            borderRadius: 4,
            background: GLASS_BG,
            backdropFilter: 'blur(10px)',
            border: `2px solid ${UI_ACCENT}`,
            borderTop: 'none',
            borderLeft: 'none',
            pointerEvents: 'auto',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'stretch',
            gap: 10,
          }}
        >
          {/* Modes header button (inside the same panel) */}
          <button
            className="ui-btn ui-mode-btn"
            onClick={() => setIsMenuOpen(false)}
            aria-label={mainButtonLabel}
            aria-expanded={true}
            style={{
              width: '100%',
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
              whiteSpace: 'nowrap',
              fontFamily: 'monospace',
              minHeight: 38,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              outline: 'none',
            }}
            onMouseEnter={(e) => {
              const el = e.currentTarget as HTMLButtonElement;
              el.style.background = GLASS_BG_HOVER;
              el.style.transform = 'scale(1.02)';
              playHoverSound();
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget as HTMLButtonElement;
              el.style.background = GLASS_BG;
              el.style.transform = 'scale(1)';
            }}
          >
            <span className="ui-btn-icon" style={{ fontSize: 16 }}>
              ⌂
            </span>
            <span className="ui-btn-label">{mainButtonLabel}</span>
          </button>

          {/* Toolkit buttons - vertical layout */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
              alignItems: 'stretch',
            }}
          >
            <ToolButton
              label={isAutoTourEnabled ? 'Stop Tour' : 'Start Tour'}
              icon={isAutoTourEnabled ? '■' : '▶'}
              active={isAutoTourEnabled}
              onClick={() => {
                const next = !isAutoTourEnabled;
                setIsAutoTourEnabled(next);
                window.dispatchEvent(new CustomEvent('auto-tour-set', { detail: { enabled: next } }));
              }}
            />

            <ToolButton
              label="Enter VR"
              icon="🕶"
              active={false}
              onClick={handleVRClick}
            />

            {capabilities.hasGyroscope && (
              <ToolButton
                label="Enter Gyro"
                icon="⌖"
                active={false}
                onClick={() => void handleGyroClick()}
              />
            )}
          </div>
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
            pointerEvents: 'auto',
          }}
        >
          ⚠️ Permission denied
        </div>
      )}
    </div>
  );
}
