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
  const userManuallyPausedRef = useRef(false)
  const wasPlayingBeforeHideRef = useRef(false)

  const UI_NEUTRAL = 'rgba(231, 231, 231, 1)'
  const UI_ACCENT = 'rgba(0, 0, 0, 1)'
  const UI_DARK = 'rgba(30, 30, 30, 1)'

  const GLASS_BG = 'rgba(231, 231, 231, 0.14)'
  const GLASS_BG_HOVER = 'rgba(231, 231, 231, 0.22)'

  // Reduce casual downloading via right-click/long-press.
  // Note: determined users can still extract images via devtools/network.
  useEffect(() => {
    const preventContextMenu = (e: Event) => {
      e.preventDefault()
    }

    const preventDragOnImages = (e: Event) => {
      const target = e.target as HTMLElement | null
      if (!target) return
      const tag = target.tagName
      if (tag === 'IMG' || tag === 'A-IMAGE') {
        e.preventDefault()
      }
    }

    document.addEventListener('contextmenu', preventContextMenu)
    document.addEventListener('dragstart', preventDragOnImages)
    return () => {
      document.removeEventListener('contextmenu', preventContextMenu)
      document.removeEventListener('dragstart', preventDragOnImages)
    }
  }, [])

  // Background music
  useEffect(() => {
    const bgMusic = new Audio('/media/bg.mp3')
    bgMusic.loop = true
    bgMusic.volume = 0.14
    bgMusicRef.current = bgMusic

    // Play on first user interaction (required by browsers)
    const tryAutoPlay = () => {
      if (userManuallyPausedRef.current) return
      if (!bgMusicRef.current) return
      if (!bgMusicRef.current.paused) return

      bgMusicRef.current
        .play()
        .then(() => {
          setIsPlaying(true)
        })
        .catch(() => {
          // Keep listeners so the next interaction can retry.
        })
    }

    // Use capture so we still get the event even if a button stops propagation.
    document.addEventListener('pointerdown', tryAutoPlay, true)
    document.addEventListener('touchstart', tryAutoPlay, true)
    document.addEventListener('click', tryAutoPlay, true)
    document.addEventListener('keydown', tryAutoPlay, true)

    const pauseForBackground = () => {
      const audio = bgMusicRef.current
      if (!audio) return

      // Remember if it was playing so we can optionally resume.
      wasPlayingBeforeHideRef.current = !audio.paused

      if (!audio.paused) {
        audio.pause()
        setIsPlaying(false)
      }
    }

    const maybeResumeFromBackground = () => {
      const audio = bgMusicRef.current
      if (!audio) return
      if (userManuallyPausedRef.current) return
      if (!wasPlayingBeforeHideRef.current) return

      audio
        .play()
        .then(() => setIsPlaying(true))
        .catch(() => {
          // If the browser blocks autoplay again, user interaction will unlock it.
        })
    }

    const handleVisibilityChange = () => {
      if (document.hidden) pauseForBackground()
      else maybeResumeFromBackground()
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    // iOS Safari (older) sometimes uses the prefixed event.
    document.addEventListener('webkitvisibilitychange' as any, handleVisibilityChange)
    window.addEventListener('blur', pauseForBackground)
    window.addEventListener('focus', maybeResumeFromBackground)
    window.addEventListener('pagehide', pauseForBackground)
    // Mobile browsers can suspend pages without a full unload.
    window.addEventListener('freeze' as any, pauseForBackground)
    // Coming back from BFCache should try to resume (if it was playing).
    window.addEventListener('pageshow', maybeResumeFromBackground)

    return () => {
      bgMusic.pause()
      bgMusic.src = ''
      document.removeEventListener('pointerdown', tryAutoPlay, true)
      document.removeEventListener('touchstart', tryAutoPlay, true)
      document.removeEventListener('click', tryAutoPlay, true)
      document.removeEventListener('keydown', tryAutoPlay, true)

      document.removeEventListener('visibilitychange', handleVisibilityChange)
      document.removeEventListener('webkitvisibilitychange' as any, handleVisibilityChange)
      window.removeEventListener('blur', pauseForBackground)
      window.removeEventListener('focus', maybeResumeFromBackground)
      window.removeEventListener('pagehide', pauseForBackground)
      window.removeEventListener('freeze' as any, pauseForBackground)
      window.removeEventListener('pageshow', maybeResumeFromBackground)
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
              userManuallyPausedRef.current = true;
            } else {
              userManuallyPausedRef.current = false;
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
