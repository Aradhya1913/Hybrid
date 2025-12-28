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
