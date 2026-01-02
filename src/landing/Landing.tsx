import React, { useEffect, useMemo, useState } from 'react'
import App from '../App'
import './landing.css'

type Phase = 'enter' | 'exit' | 'hidden'

export default function Landing() {
  const totalMs = useMemo(() => 2400, [])
  const exitMs = useMemo(() => 450, [])

  const [phase, setPhase] = useState<Phase>('enter')

  useEffect(() => {
    const exitTimer = window.setTimeout(() => setPhase('exit'), totalMs)
    const hideTimer = window.setTimeout(() => setPhase('hidden'), totalMs + exitMs)

    return () => {
      window.clearTimeout(exitTimer)
      window.clearTimeout(hideTimer)
    }
  }, [totalMs, exitMs])

  const showLoader = phase !== 'hidden'

  return (
    <div className="landing-root">
      <App />

      {showLoader && (
        <div
          className={`landing-loader ${phase === 'exit' ? 'is-exiting' : ''}`}
          style={{
            ['--landing-total-ms' as any]: `${totalMs}ms`,
            ['--landing-exit-ms' as any]: `${exitMs}ms`,
          }}
          aria-hidden="true"
        >
          <div className="landing-center" role="presentation">
            <div className="landing-wordmark" role="presentation">
              <span className="landing-word" data-text="Solfin.">Solfin.</span>
              <sup className="landing-r">®</sup>
            </div>
          </div>

          <div className="landing-progress" role="presentation">
            <div className="landing-progress-track" />
            <div className="landing-progress-fill" />
          </div>
        </div>
      )}
    </div>
  )
}
