import React, { useEffect, useRef, useState } from 'react'
import { ModeProvider, useModeManager } from './components/ModeManager'
import { ThreejsViewer } from './components/ThreejsViewer'
import { AframeViewer } from './components/AframeViewer'
import { ModeToggleUI } from './components/ModeToggleUI'
import { Sidebar } from './components/Sidebar'
import { useVRDetection } from './hooks/useVRDetection'
import scenes from './data/scenes'

function AppContent() {
  const { mode } = useModeManager()
  const bgMusicRef = useRef<HTMLAudioElement | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)

  const UI_NEUTRAL = 'rgba(231, 231, 231, 1)'
  const UI_ACCENT = 'rgba(0, 0, 0, 1)'
  const UI_DARK = 'rgba(30, 30, 30, 1)'

  const GLASS_BG = 'rgba(231, 231, 231, 0.14)'
  const GLASS_BG_HOVER = 'rgba(231, 231, 231, 0.22)'

  // Background music
  useEffect(() => {
    const bgMusic = new Audio('/media/bg.mp3')
    bgMusic.loop = true
    bgMusic.volume = 0.14
    bgMusicRef.current = bgMusic

    // Play on first user interaction (required by browsers)
    const playMusic = () => {
      bgMusic.play().then(() => {
        setIsPlaying(true)
      }).catch(() => {})
      document.removeEventListener('click', playMusic)
      document.removeEventListener('touchstart', playMusic)
    }
    
    document.addEventListener('click', playMusic)
    document.addEventListener('touchstart', playMusic)

    return () => {
      bgMusic.pause()
      bgMusic.src = ''
      document.removeEventListener('click', playMusic)
      document.removeEventListener('touchstart', playMusic)
    }
  }, [])

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

      {/* Music Wave Button - Bottom Right */}
      <div
        onClick={() => {
          if (bgMusicRef.current) {
            if (isPlaying) {
              bgMusicRef.current.pause();
              setIsPlaying(false);
            } else {
              bgMusicRef.current.play().then(() => {
                setIsPlaying(true);
              }).catch(() => {});
            }
          }
        }}
        style={{
          position: 'fixed',
          bottom: 20,
          right: 20,
          zIndex: 300,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 48,
          height: 48,
          background: GLASS_BG,
          backdropFilter: 'blur(10px)',
          borderRadius: 4,
          border: `2px solid ${UI_ACCENT}`,
          borderTop: 'none',
          borderLeft: 'none',
          cursor: 'pointer',
          transition: 'all 0.3s ease',
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.background = GLASS_BG_HOVER;
          (e.currentTarget as HTMLElement).style.transform = 'scale(1.05)';
          const hoverSound = new Audio('/media/hover.mp3');
          hoverSound.volume = 0.3;
          hoverSound.play().catch(() => {});
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.background = GLASS_BG;
          (e.currentTarget as HTMLElement).style.transform = 'scale(1)';
        }}
      >
        <svg
          width="48"
          height="24"
          viewBox="0 0 64 24"
          style={{ display: 'block' }}
        >
          <path
            d={isPlaying ? "M0 12 Q 8 6 16 12 T 32 12 T 48 12 T 64 12" : "M0 12 L 64 12"}
            fill="none"
            stroke={UI_ACCENT}
            strokeWidth="3"
            strokeLinecap="round"
          >
            {isPlaying && (
              <animate
                attributeName="d"
                dur="0.9s"
                repeatCount="indefinite"
                values="
                  M0 12 Q 8 6 16 12 T 32 12 T 48 12 T 64 12;
                  M0 12 Q 8 18 16 12 T 32 12 T 48 12 T 64 12;
                  M0 12 Q 8 6 16 12 T 32 12 T 48 12 T 64 12
                "
              />
            )}
          </path>
        </svg>
      </div>

      {/* Developer Credits Footer */}
      <div
        style={{
          position: 'fixed',
          bottom: 16,
          left: 16,
          zIndex: 250,
          padding: '8px 12px',
          background: GLASS_BG,
          backdropFilter: 'blur(10px)',
          borderRadius: 4,
          border: `2px solid ${UI_ACCENT}`,
          borderTop: 'none',
          borderLeft: 'none',
          fontSize: 11,
          color: UI_DARK,
          fontWeight: 400,
          lineHeight: '1.4',
          pointerEvents: 'auto',
          fontFamily: 'monospace',
        }}
      >
        <div style={{ fontWeight: 600, marginBottom: 2 }}>Developers</div>
        <div>
          <a
            href="https://www.linkedin.com/in/nandeesh-aradhya-r-317104269/"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: UI_DARK,
              textDecoration: 'none',
              cursor: 'pointer',
              transition: 'opacity 0.2s ease',
            }}
            onMouseEnter={(e) => {
              (e.target as HTMLElement).style.textDecoration = 'underline';
              const hoverSound = new Audio('/media/hover.mp3');
              hoverSound.volume = 0.3;
              hoverSound.play().catch(() => {});
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLElement).style.textDecoration = 'none';
            }}
          >
            Nandeesh Aradhya R
          </a>
          {' · '}
          <a
            href="https://www.linkedin.com/in/neha-s-85818625b/"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: UI_DARK,
              textDecoration: 'none',
              cursor: 'pointer',
              transition: 'opacity 0.2s ease',
            }}
            onMouseEnter={(e) => {
              (e.target as HTMLElement).style.textDecoration = 'underline';
              const hoverSound = new Audio('/media/hover.mp3');
              hoverSound.volume = 0.3;
              hoverSound.play().catch(() => {});
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLElement).style.textDecoration = 'none';
            }}
          >
            Neha S
          </a>
        </div>
        <div style={{ marginTop: 2, opacity: 0.7 }}>In Development</div>
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
