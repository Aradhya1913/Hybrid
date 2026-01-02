import React, { useRef, useState } from 'react';
import { useModeManager } from './ModeManager';
import { SceneDef } from '../data/scenes';

export function Sidebar({ scenes }: { scenes: SceneDef[] }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { setCurrentScene } = useModeManager();
  const lastScrollSoundAtRef = useRef(0);

  const UI_ACCENT = 'rgba(0, 0, 0, 1)';
  const UI_DARK = 'rgba(30, 30, 30, 1)';
  const GLASS_BG = 'rgba(231, 231, 231, 0.14)';
  const GLASS_BG_HOVER = 'rgba(231, 231, 231, 0.22)';

  return (
    <>
      {/* Sidebar toggle button */}
      <button
        className="ui-btn ui-top-btn ui-locations-btn"
        onClick={() => setSidebarOpen((v) => !v)}
        aria-label={sidebarOpen ? 'Close locations' : 'Open locations'}
        style={{
          position: 'fixed',
          left: 16,
          top: 16,
          zIndex: 220,
          padding: '10px 14px',
          borderRadius: 4,
          background: GLASS_BG,
          backdropFilter: 'blur(10px)',
          color: UI_DARK,
          border: `2px solid ${UI_ACCENT}`,
          borderTop: 'none',
          borderLeft: 'none',
          display: 'inline-flex',
          gap: 8,
          alignItems: 'center',
          pointerEvents: 'auto',
          cursor: 'pointer',
          transition: 'all 0.3s ease',
          fontWeight: 500,
          fontSize: 13,
          fontFamily: 'monospace',
          minHeight: 38,
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
        <span className="ui-btn-label">Locations</span>
      </button>

      {/* Sidebar Modal Dialog */}
      <aside
        style={{
          position: 'fixed',
          left: 20,
          top: '50%',
          transform: 'translateY(-50%)',
          width: 220,
          maxHeight: '41vh',
          overflow: 'hidden',
          transition: 'all 0.28s cubic-bezier(0.34, 1.56, 0.64, 1)',
          zIndex: 210,
          background: sidebarOpen
            ? GLASS_BG
            : 'transparent',
          backdropFilter: sidebarOpen ? 'blur(10px)' : 'none',
          padding: sidebarOpen ? 10 : 0,
          borderRadius: 4,
          border: sidebarOpen ? `2px solid ${UI_ACCENT}` : 'none',
          borderTop: sidebarOpen ? 'none' : 'none',
          borderLeft: sidebarOpen ? 'none' : 'none',
          pointerEvents: sidebarOpen ? 'auto' : 'none',
          boxShadow: 'none',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {sidebarOpen && (
          <div
            style={{
              color: UI_DARK,
              display: 'flex',
              flexDirection: 'column',
              height: '100%',
              minHeight: 0,
              fontFamily: 'monospace',
            }}
          >
            <div
              style={{
                fontWeight: 700,
                fontSize: 11,
                marginBottom: 8,
                color: UI_DARK,
                flexShrink: 0,
                letterSpacing: '-0.3px',
              }}
            >
              Explore Campus
            </div>

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 4,
                overflowY: 'auto',
                flex: 1,
                paddingRight: 4,
              }}
              onScroll={() => {
                const now = Date.now();
                // Throttle so we don't spam audio while scrolling.
                if (now - lastScrollSoundAtRef.current < 220) return;
                lastScrollSoundAtRef.current = now;

                const hoverSound = new Audio('/media/hover.mp3');
                hoverSound.volume = 0.2;
                hoverSound.play().catch(() => {});
              }}
            >
              {scenes.map((s, i) => (
                <button
                  key={s.id}
                  onClick={() => {
                    setCurrentScene(i);
                    setSidebarOpen(false);
                  }}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '7px 10px',
                    borderRadius: 4,
                    background: GLASS_BG,
                    color: UI_DARK,
                    border: `2px solid ${UI_ACCENT}`,
                    borderTop: 'none',
                    borderLeft: 'none',
                    cursor: 'pointer',
                    pointerEvents: 'auto',
                    fontWeight: 500,
                    fontSize: 11,
                    transition: 'all 0.25s ease',
                    flexShrink: 0,
                    fontFamily: 'monospace',
                    outline: 'none',
                  }}
                  onMouseEnter={(e) => {
                    const el = e.currentTarget as HTMLButtonElement;
                    el.style.background = GLASS_BG_HOVER;
                    el.style.transform = 'scale(1.03)';
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
                  <span style={{ flex: 1, textAlign: 'left' }}>{s.title}</span>
                  <span style={{ fontSize: 8, opacity: 0.7 }}>→</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
