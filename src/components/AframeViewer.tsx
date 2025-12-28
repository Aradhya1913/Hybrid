import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useModeManager } from './ModeManager';
import { SceneDef } from '../data/scenes';

export function AframeViewer({ scenes }: { scenes: SceneDef[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const modeManager = useModeManager();
  const sceneRef = useRef<any>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Initialize A-Frame if not already loaded
    const initAFrame = async () => {
      if (!(window as any).AFRAME) {
        const script = document.createElement('script');
        script.src = 'https://aframe.io/releases/1.4.2/aframe.min.js';
        script.async = true;
        document.head.appendChild(script);
        
        return new Promise((resolve) => {
          script.onload = resolve;
        });
      }
    };

    const setupScene = async () => {
      await initAFrame();

      if (!containerRef.current) return;

      const scene = scenes[modeManager.currentSceneIndex];
      const isVRMode = modeManager.mode === 'vr';

      containerRef.current.innerHTML = `
        <a-scene 
          embedded 
          ${isVRMode ? 'vr-mode-ui="enterVRButton: #enter-vr-btn"' : ''}
          renderer="colorManagement: true; antialias: true;"
        >
          <a-assets>
            <img id="panorama" src="${scene?.url || ''}" />
          </a-assets>
          
          <!-- Panorama Sky -->
          <a-sky 
            id="app-sky" 
            src="#panorama" 
            rotation="0 0 0"
            geometry="segmentsHeight: 64; segmentsWidth: 64"
          ></a-sky>
          
          <!-- Camera with look controls -->
          <a-camera 
            id="camera" 
            position="0 0 0" 
            look-controls="enabled: true; pointerLockEnabled: false; magicWindowTrackingEnabled: true"
            wasd-controls="enabled: false"
          ></a-camera>
        </a-scene>

        <!-- VR Enter Button (visible when VR available) -->
        <button 
          id="enter-vr-btn" 
          style="
            position: fixed;
            bottom: 20px;
            right: 20px;
            padding: 12px 20px;
            background: linear-gradient(135deg, #06b6d4 0%, #0ea5a4 100%);
            color: white;
            border: none;
            border-radius: 8px;
            font-weight: bold;
            cursor: pointer;
            z-index: 500;
            font-size: 14px;
            box-shadow: 0 8px 24px rgba(6, 182, 212, 0.4);
            transition: all 0.3s ease;
            display: none;
          "
        >
          🥽 Enter VR Mode
        </button>
      `;

      // Get the scene element and ensure it's ready
      const aScene = containerRef.current.querySelector('a-scene') as any;
      sceneRef.current = aScene;

      // Wait for A-Frame to load
      if (aScene.hasLoaded) {
        handleSceneLoaded(aScene);
      } else {
        aScene.addEventListener('loaded', () => {
          handleSceneLoaded(aScene);
        });
      }

      // Show VR button if VR mode and WebXR is available
      if (isVRMode) {
        setTimeout(() => {
          const vrBtn = containerRef.current?.querySelector('#enter-vr-btn') as HTMLElement;
          if (vrBtn) {
            vrBtn.style.display = 'block';
          }
        }, 500);
      }
    };

    const handleSceneLoaded = (aScene: any) => {
      const camera = aScene.querySelector('#camera') as any;
      if (!camera) return;

      // Determine if we're in gyro or VR mode
      const isGyroMode = modeManager.mode === 'gyro';

      if (isGyroMode) {
        enableGyroMode(camera, aScene);
      } else if (modeManager.mode === 'vr') {
        enableVRMode(aScene);
      }
    };

    setupScene();

    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, [scenes, modeManager.currentSceneIndex, modeManager.mode]);

  const enableGyroMode = async (camera: any, aScene: any) => {
    console.log('[AframeViewer] Enabling gyro mode');

    // Request permission for iOS 13+
    if (typeof DeviceOrientationEvent !== 'undefined') {
      if ((DeviceOrientationEvent as any).requestPermission) {
        try {
          const permission = await (DeviceOrientationEvent as any).requestPermission();
          if (permission === 'granted') {
            console.log('[AframeViewer] Permission granted, enabling device orientation');
            setupDeviceOrientation(camera);
          } else {
            console.warn('[AframeViewer] Permission denied');
          }
        } catch (err) {
          console.error('[AframeViewer] Permission request failed:', err);
        }
      } else {
        // Non-iOS devices
        console.log('[AframeViewer] Non-iOS device, enabling device orientation');
        setupDeviceOrientation(camera);
      }
    }
  };

  const setupDeviceOrientation = (camera: any) => {
    let alpha = 0;
    let beta = 0;
    let gamma = 0;

    const handleDeviceOrientation = (event: DeviceOrientationEvent) => {
      alpha = event.alpha || 0; // Z axis rotation (yaw)
      beta = event.beta || 0;   // X axis rotation (pitch)
      gamma = event.gamma || 0; // Y axis rotation (roll)

      // Apply rotation to camera
      // A-Frame uses Euler angles with YXZ order
      const radBeta = (beta * Math.PI) / 180;  // pitch
      const radAlpha = (alpha * Math.PI) / 180; // yaw

      // Clamp pitch to prevent flipping
      const clampedBeta = Math.max(-Math.PI / 2.5, Math.min(Math.PI / 2.5, radBeta));

      camera.setAttribute('rotation', {
        x: THREE.MathUtils.radToDeg(clampedBeta),
        y: THREE.MathUtils.radToDeg(radAlpha),
        z: 0,
      });

      console.log('[DeviceOrientation] alpha:', alpha, 'beta:', beta, 'gamma:', gamma);
    };

    window.addEventListener('deviceorientation', handleDeviceOrientation);

    return () => {
      window.removeEventListener('deviceorientation', handleDeviceOrientation);
    };
  };

  const enableVRMode = async (aScene: any) => {
    console.log('[AframeViewer] Enabling VR mode');
    
    // A-Frame automatically handles VR through WebXR
    // The VR button will appear if WebXR is available
    // When user clicks the button, it enters immersive VR mode
    
    // Try to enter VR automatically after a short delay
    setTimeout(async () => {
      try {
        if ((navigator as any).xr) {
          console.log('[AframeViewer] WebXR available, VR ready');
          // User will click the VR button to enter
        } else {
          console.log('[AframeViewer] WebXR not available, Cardboard mode will be used');
        }
      } catch (err) {
        console.error('[AframeViewer] VR setup error:', err);
      }
    }, 1000);
  };

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
