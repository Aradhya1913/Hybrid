import React, { useEffect, useRef } from 'react';
import { useModeManager } from './ModeManager';
import { SceneDef } from '../data/scenes';

export function AframeViewer({ scenes }: { scenes: SceneDef[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const modeManager = useModeManager();

  useEffect(() => {
    if (!containerRef.current) return;

    // Initialize A-Frame scene
    const aframeScript = document.createElement('script');
    aframeScript.src = 'https://aframe.io/releases/1.4.2/aframe.min.js';
    document.head.appendChild(aframeScript);

    const onAFrameReady = () => {
      if (!containerRef.current) return;
      containerRef.current.innerHTML = `
        <a-scene embedded>
          <a-sky id="app-sky" src="${scenes[modeManager.currentSceneIndex]?.url || ''}" rotation="0 0 0"></a-sky>
          <a-camera id="camera" look-controls="enabled: true; magicWindowTrackingEnabled: false"></a-camera>
          <a-entity id="hotspots"></a-entity>
        </a-scene>
      `;

      // Reinitialize A-Frame
      (window as any).AFRAME?.reload?.();
    };

    if ((window as any).AFRAME) {
      onAFrameReady();
    } else {
      aframeScript.onload = onAFrameReady;
    }

    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, [scenes, modeManager.currentSceneIndex]);

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
      }}
    />
  );
}
