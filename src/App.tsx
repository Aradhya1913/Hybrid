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
          fontSize: 11,
          color: '#ffffff',
          fontWeight: 300,
          lineHeight: '1.6',
          pointerEvents: 'auto',
        }}
      >
        <div style={{ textDecoration: 'underline' }}>• Developers</div>
        <div style={{ marginLeft: 8 }}>
          <a
            href="https://www.linkedin.com/in/nandeesh-aradhya-r-317104269/"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: '#ffffff',
              textDecoration: 'none',
              cursor: 'pointer',
              opacity: 0.8,
              transition: 'opacity 0.2s ease',
            }}
            onMouseEnter={(e) => {
              (e.target as HTMLElement).style.opacity = '1';
              (e.target as HTMLElement).style.textDecoration = 'underline';
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLElement).style.opacity = '0.8';
              (e.target as HTMLElement).style.textDecoration = 'none';
            }}
          >
            Nandeesh Aradhya R
          </a>
          {' , '}
          <a
            href="https://www.linkedin.com/in/neha-s-85818625b/"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: '#ffffff',
              textDecoration: 'none',
              cursor: 'pointer',
              opacity: 0.8,
              transition: 'opacity 0.2s ease',
            }}
            onMouseEnter={(e) => {
              (e.target as HTMLElement).style.opacity = '1';
              (e.target as HTMLElement).style.textDecoration = 'underline';
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLElement).style.opacity = '0.8';
              (e.target as HTMLElement).style.textDecoration = 'none';
            }}
          >
            Neha S
          </a>
        </div>
        <div style={{ marginTop: 6, opacity: 0.6 }}>• In Development</div>
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
