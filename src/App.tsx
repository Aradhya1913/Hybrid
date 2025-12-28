import React from 'react'
import { ModeProvider, useModeManager } from './components/ModeManager'
import { ThreejsViewer } from './components/ThreejsViewer'
import { AframeViewer } from './components/AframeViewer'
import { ModeToggleUI } from './components/ModeToggleUI'
import { Sidebar } from './components/Sidebar'
import { useVRDetection } from './hooks/useVRDetection'
import scenes from './data/scenes'

function AppContent() {
  const { mode } = useModeManager()

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', overflow: 'hidden' }}>
      {/* Three.js Normal Mode */}
      {mode === 'normal' && <ThreejsViewer scenes={scenes} />}

      {/* A-Frame VR/Gyro Modes */}
      {(mode === 'vr' || mode === 'gyro') && <AframeViewer scenes={scenes} />}

      {/* Sidebar Navigation */}
      <Sidebar scenes={scenes} />

      {/* Mode Toggle UI */}
      <ModeToggleUI />

      {/* Developer Credits Footer */}
      <div
        style={{
          position: 'fixed',
          bottom: 20,
          left: 20,
          zIndex: 250,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}
      >
        {/* Developer Names */}
        <div
          style={{
            display: 'flex',
            gap: 12,
            flexWrap: 'wrap',
            fontSize: 12,
            fontWeight: 500,
          }}
        >
          <a
            href="https://www.linkedin.com/in/nandeesh-aradhya-r-317104269/"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: '#ffffff',
              textDecoration: 'none',
              backdropFilter: 'blur(10px)',
              background: 'rgba(0, 0, 0, 0.3)',
              padding: '6px 10px',
              borderRadius: 6,
              border: '1px solid rgba(255, 255, 255, 0.2)',
              transition: 'all 0.2s ease',
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => {
              const el = e.target as HTMLElement;
              el.style.background = 'rgba(0, 0, 0, 0.5)';
              el.style.borderColor = 'rgba(255, 255, 255, 0.4)';
            }}
            onMouseLeave={(e) => {
              const el = e.target as HTMLElement;
              el.style.background = 'rgba(0, 0, 0, 0.3)';
              el.style.borderColor = 'rgba(255, 255, 255, 0.2)';
            }}
          >
            Nandeesh Aradhya
          </a>
          <a
            href="https://www.linkedin.com/in/neha-s-85818625b/"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: '#ffffff',
              textDecoration: 'none',
              backdropFilter: 'blur(10px)',
              background: 'rgba(0, 0, 0, 0.3)',
              padding: '6px 10px',
              borderRadius: 6,
              border: '1px solid rgba(255, 255, 255, 0.2)',
              transition: 'all 0.2s ease',
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => {
              const el = e.target as HTMLElement;
              el.style.background = 'rgba(0, 0, 0, 0.5)';
              el.style.borderColor = 'rgba(255, 255, 255, 0.4)';
            }}
            onMouseLeave={(e) => {
              const el = e.target as HTMLElement;
              el.style.background = 'rgba(0, 0, 0, 0.3)';
              el.style.borderColor = 'rgba(255, 255, 255, 0.2)';
            }}
          >
            Neha S
          </a>
        </div>

        {/* Development Status */}
        <div
          style={{
            fontSize: 10,
            color: '#ffffff',
            backdropFilter: 'blur(10px)',
            background: 'rgba(0, 0, 0, 0.3)',
            padding: '4px 8px',
            borderRadius: 4,
            border: '1px solid rgba(255, 255, 255, 0.15)',
            textAlign: 'center',
            letterSpacing: '0.5px',
            fontWeight: 400,
            opacity: 0.8,
          }}
        >
          in Development
        </div>
      </div>
    </div>
  )
}

export default function App() {
  const capabilities = useVRDetection()

  return (
    <ModeProvider scenes={scenes} capabilities={capabilities}>
      <AppContent />
    </ModeProvider>
  )
}
