import React, { useState } from 'react';
import { useModeManager } from './ModeManager';
import { SceneDef } from '../data/scenes';

export function Sidebar({ scenes }: { scenes: SceneDef[] }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { setCurrentScene } = useModeManager();

  return (
    <>
      {/* Sidebar toggle button */}
      <button
        onClick={() => setSidebarOpen((v) => !v)}
        style={{
          position: 'fixed',
          left: 16,
          top: 16,
          zIndex: 220,
          padding: '10px 14px',
          borderRadius: 12,
          background: 'rgba(255,255,255,0.1)',
          backdropFilter: 'blur(10px)',
          color: '#fff',
          border: '1px solid rgba(255,255,255,0.2)',
          display: 'inline-flex',
          gap: 8,
          alignItems: 'center',
          pointerEvents: 'auto',
          cursor: 'pointer',
          transition: 'all 0.3s ease',
          fontWeight: 500,
          fontSize: 13,
        }}
        onMouseEnter={(e) => {
          const el = e.target as HTMLElement;
          el.style.background = 'rgba(255,255,255,0.15)';
          el.style.transform = 'scale(1.05)';
        }}
        onMouseLeave={(e) => {
          const el = e.target as HTMLElement;
          el.style.background = 'rgba(255,255,255,0.1)';
          el.style.transform = 'scale(1)';
        }}
      >
        <span style={{ fontSize: 16 }}>≡</span>
        <span>Locations</span>
      </button>

      {/* Sidebar Modal Dialog */}
      <aside
        style={{
          position: 'fixed',
          left: 20,
          top: '50%',
          transform: 'translateY(-50%)',
          width: 150,
          maxHeight: '41vh',
          overflow: 'hidden',
          transition: 'all 0.28s cubic-bezier(0.34, 1.56, 0.64, 1)',
          zIndex: 210,
          background: sidebarOpen ? 'linear-gradient(180deg, #3B2F5C, #1E293B)' : 'transparent',
          backdropFilter: sidebarOpen ? 'blur(20px) saturate(180%)' : 'none',
          padding: sidebarOpen ? 10 : 0,
          borderRadius: 20,
          border: sidebarOpen ? '1px solid rgba(255,255,255,0.18)' : 'none',
          pointerEvents: sidebarOpen ? 'auto' : 'none',
          boxShadow: sidebarOpen ? '0 8px 32px rgba(31, 38, 135, 0.37)' : 'none',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {sidebarOpen && (
          <div
            style={{
              color: '#e5e7eb',
              display: 'flex',
              flexDirection: 'column',
              height: '100%',
              minHeight: 0,
            }}
          >
            <div
              style={{
                fontWeight: 700,
                fontSize: 9,
                marginBottom: 8,
                color: '#ffffff',
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
                    padding: '5px 8px',
                    borderRadius: 12,
                    background: 'rgba(99, 146, 226, 0.15)',
                    color: '#ffffff',
                    border: '1px solid rgba(99, 146, 226, 0.3)',
                    cursor: 'pointer',
                    pointerEvents: 'auto',
                    fontWeight: 500,
                    fontSize: 7,
                    transition: 'all 0.25s ease',
                    flexShrink: 0,
                  }}
                  onMouseEnter={(e) => {
                    const el = e.target as HTMLElement;
                    el.style.background = 'rgba(99, 146, 226, 0.25)';
                    el.style.border = '1px solid rgba(99, 146, 226, 0.45)';
                    el.style.transform = 'translateX(2px)';
                    el.style.boxShadow = '0 4px 12px rgba(99, 146, 226, 0.2)';
                  }}
                  onMouseLeave={(e) => {
                    const el = e.target as HTMLElement;
                    el.style.background = 'rgba(99, 146, 226, 0.15)';
                    el.style.border = '1px solid rgba(99, 146, 226, 0.3)';
                    el.style.transform = 'translateX(0)';
                    el.style.boxShadow = 'none';
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
