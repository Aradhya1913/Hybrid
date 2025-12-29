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
      containerRef.current.innerHTML = `
        <a-scene embedded inspector="url: https://aframe.io/releases/latest/aframe-inspector.js">
          <a-assets>
            <img id="panorama" src="${scene?.url || ''}" />
            <img id="arrow-icon" src="/ui/arrow.png" />
          </a-assets>
          <a-sky id="app-sky" src="#panorama" rotation="0 0 0"></a-sky>
          <a-camera id="camera" position="0 0 0" look-controls="enabled: true; pointerLockEnabled: true" wasd-controls="enabled: false">
            <a-cursor id="cursor" fuse="true" fuseTimeout="500" raycaster="far: 10000; objects: .clickable"></a-cursor>
            <a-entity raycaster="far: 10000; objects: .clickable" cursor></a-entity>
          </a-camera>
          <a-entity id="hotspots"></a-entity>
        </a-scene>
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
    };

    const handleSceneLoaded = (aScene: any) => {
      const camera = aScene.querySelector('#camera') as any;
      if (!camera) return;

      // Add hotspots
      addHotspots(aScene);

      // Determine if we're in gyro or VR mode
      const isGyroMode = modeManager.mode === 'gyro';

      if (isGyroMode) {
        enableGyroMode(camera, aScene);
      } else if (modeManager.mode === 'vr') {
        enableVRMode(aScene, camera);
      }

      // Setup mobile click detection for A-Frame hotspots
      // A-Frame uses a raycaster with a reticle for mobile VR/Gyro interactions
      setupMobileHotspotDetection(aScene);
    };

    setupScene();

    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, [scenes, modeManager.currentSceneIndex, modeManager.mode]);

  const addHotspots = (aScene: any) => {
    const hotspotContainer = aScene.querySelector('#hotspots') as any;
    if (!hotspotContainer) return;

    // Clear existing hotspots
    while (hotspotContainer.firstChild) {
      hotspotContainer.removeChild(hotspotContainer.firstChild);
    }

    const scene = scenes[modeManager.currentSceneIndex];
    if (!scene) return;

    // Add hotspots from scene data
    if (Array.isArray(scene.hotSpots) && scene.hotSpots.length > 0) {
      scene.hotSpots.forEach((hotspot) => {
        addHotspot(hotspotContainer, hotspot.yaw, hotspot.pitch, hotspot.targetSceneId, hotspot.text);
      });
    } else {
      // Fallback: add a single hotspot to next scene
      const nextIdx = (modeManager.currentSceneIndex + 1) % scenes.length;
      addHotspot(hotspotContainer, 0, 0, scenes[nextIdx].id, 'Next');
    }
  };

  const addHotspot = (
    container: any,
    yawDeg: number,
    pitchDeg: number,
    targetSceneId: string,
    text?: string
  ) => {
    // Convert spherical to cartesian
    const yaw = (yawDeg * Math.PI) / 180;
    const pitch = (pitchDeg * Math.PI) / 180;
    const distance = 5;

    const x = distance * Math.cos(pitch) * Math.sin(yaw);
    const y = distance * Math.sin(pitch);
    const z = distance * Math.cos(pitch) * Math.cos(yaw);

    const position = `${x} ${y} ${z}`;

    // Create hotspot entity with arrow.png image
    const hotspot = document.createElement('a-image');
    hotspot.setAttribute('src', '#arrow-icon');
    hotspot.setAttribute('position', position);
    hotspot.setAttribute('scale', '0.8 0.8 0.8');
    hotspot.setAttribute('look-at', '[camera]');
    hotspot.classList.add('clickable');
    hotspot.style.cursor = 'pointer';
    
    // Store target scene ID for click handler
    hotspot.setAttribute('data-target-scene-id', targetSceneId);

    const handleHotspotClick = () => {
      console.log('[AframeViewer] Hotspot clicked, target:', targetSceneId);
      // Click animation
      const originalScale = '0.8 0.8 0.8';
      const clickScale = '1.1 1.1 1.1';
      hotspot.setAttribute('scale', clickScale);
      setTimeout(() => {
        hotspot.setAttribute('scale', originalScale);
      }, 150);
      
      const targetIdx = scenes.findIndex((s) => s.id === targetSceneId);
      if (targetIdx >= 0) {
        modeManager.setCurrentScene(targetIdx);
      }
    };

    // Handle click with feedback
    hotspot.addEventListener('click', handleHotspotClick);
    
    // IMPORTANT: Add touch event support for mobile devices
    hotspot.addEventListener('touchend', (e: TouchEvent) => {
      e.preventDefault();
      e.stopPropagation();
      handleHotspotClick();
    }, { passive: false });

    // Handle hover with smooth transition
    hotspot.addEventListener('mouseenter', () => {
      hotspot.setAttribute('scale', '1 1 1');
    });

    hotspot.addEventListener('mouseleave', () => {
      hotspot.setAttribute('scale', '0.8 0.8 0.8');
    });

    container.appendChild(hotspot);
  };

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

  const setupMobileHotspotDetection = (aScene: any) => {
    // For A-Frame, we need to detect when the cursor/reticle intersects a hotspot
    // and trigger the click handler
    
    const cursor = aScene.querySelector('#cursor') as any;
    const canvas = aScene.canvas;
    const hotspots = aScene.querySelectorAll('.clickable');

    if (!cursor) {
      console.warn('[AframeViewer] Cursor not found, trying manual raycast setup');
    }

    // Setup direct click handler on the canvas
    const handleCanvasClick = () => {
      console.log('[AframeViewer] Canvas clicked, checking hotspots');
      
      // Raycast from camera through center of screen
      const raycaster = new THREE.Raycaster();
      const camera = aScene.camera as THREE.Camera;
      
      if (!camera) return;
      
      // Center of screen
      const mouse = new THREE.Vector2(0, 0);
      raycaster.setFromCamera(mouse, camera);
      
      // Get all hotspot objects
      const hotspotObjects: THREE.Object3D[] = [];
      hotspots.forEach((h: any) => {
        if (h.object3D) {
          hotspotObjects.push(h.object3D);
        }
      });
      
      // Check for intersections
      const intersects = raycaster.intersectObjects(hotspotObjects, true);
      
      if (intersects.length > 0) {
        console.log('[AframeViewer] Hit hotspot:', intersects[0]);
        
        // Find the corresponding hotspot element and trigger click
        hotspots.forEach((h: any) => {
          if (h.object3D && intersects[0].object === h.object3D) {
            h.click?.();
            const clickEvent = new MouseEvent('click', { bubbles: true });
            h.dispatchEvent(clickEvent);
          }
        });
      }
    };

    // Listen for screen taps on mobile
    if (canvas) {
      canvas.addEventListener('click', handleCanvasClick);
      canvas.addEventListener('touchend', (e: TouchEvent) => {
        e.preventDefault();
        handleCanvasClick();
      }, { passive: false });
    }

    // Also setup raycaster-based events on each hotspot
    hotspots.forEach((hotspot: any) => {
      const handleClick = () => {
        console.log('[AframeViewer] Hotspot raycaster click');
        const targetSceneId = hotspot.getAttribute('data-target-scene-id');
        if (!targetSceneId) return;
        
        const targetIdx = scenes.findIndex((s) => s.id === targetSceneId);
        if (targetIdx >= 0) {
          // Click animation
          const originalScale = hotspot.getAttribute('scale') || '0.8 0.8 0.8';
          const clickScale = '1.1 1.1 1.1';
          hotspot.setAttribute('scale', clickScale);
          setTimeout(() => {
            hotspot.setAttribute('scale', originalScale);
          }, 150);
          modeManager.setCurrentScene(targetIdx);
        }
      };

      // A-Frame raycaster events
      hotspot.addEventListener('raycaster-intersected', () => {
        console.log('[AframeViewer] Raycaster intersected hotspot');
        hotspot.setAttribute('scale', '1 1 1');
      });

      hotspot.addEventListener('raycaster-cleared', () => {
        console.log('[AframeViewer] Raycaster cleared hotspot');
        hotspot.setAttribute('scale', '0.8 0.8 0.8');
      });

      // Click events
      hotspot.addEventListener('click', handleClick);
      hotspot.addEventListener('touchend', (e: TouchEvent) => {
        e.preventDefault();
        e.stopPropagation();
        handleClick();
      }, { passive: false });

      // Cursor fuse (gaze-based click for VR)
      hotspot.addEventListener('cursor-fuse', () => {
        console.log('[AframeViewer] Cursor fuse on hotspot');
        handleClick();
      });
    });
  };

  const setupDeviceOrientation = (camera: any) => {
    const handleDeviceOrientation = (event: DeviceOrientationEvent) => {
      const alpha = event.alpha || 0;
      const beta = event.beta || 0;

      const radBeta = (beta * Math.PI) / 180;
      const radAlpha = (alpha * Math.PI) / 180;

      const clampedBeta = Math.max(-Math.PI / 2.5, Math.min(Math.PI / 2.5, radBeta));

      camera.setAttribute('rotation', {
        x: THREE.MathUtils.radToDeg(clampedBeta),
        y: THREE.MathUtils.radToDeg(radAlpha),
        z: 0,
      });
    };

    window.addEventListener('deviceorientation', handleDeviceOrientation);

    return () => {
      window.removeEventListener('deviceorientation', handleDeviceOrientation);
    };
  };

  const enableVRMode = async (aScene: any, camera: any) => {
    console.log('[AframeViewer] Enabling VR Cardboard mode');

    setTimeout(() => {
      enableCardboardStereo(aScene, camera);
    }, 100);
  };

  const enableCardboardStereo = (aScene: any, camera: any) => {
    console.log('[AframeViewer] Enabling Cardboard stereo rendering');
    const renderer = aScene.renderer as THREE.WebGLRenderer;
    
    if (!renderer || !camera) return;

    // Enable device orientation for gyro head tracking in VR
    if (typeof DeviceOrientationEvent !== 'undefined') {
      if ((DeviceOrientationEvent as any).requestPermission) {
        (DeviceOrientationEvent as any)
          .requestPermission()
          .then((permission: string) => {
            if (permission === 'granted') {
              console.log('[VR] Permission granted, enabling gyro');
              window.addEventListener('deviceorientation', (e: DeviceOrientationEvent) => {
                const alpha = e.alpha || 0;
                const beta = e.beta || 0;
                const radBeta = (beta * Math.PI) / 180;
                const radAlpha = (alpha * Math.PI) / 180;
                const clampedBeta = Math.max(-Math.PI / 2.5, Math.min(Math.PI / 2.5, radBeta));

                camera.setAttribute('rotation', {
                  x: THREE.MathUtils.radToDeg(clampedBeta),
                  y: THREE.MathUtils.radToDeg(radAlpha),
                  z: 0,
                });
              });
            }
          })
          .catch((err: any) => console.log('[VR] Permission denied:', err));
      } else {
        // Non-iOS
        console.log('[VR] Non-iOS device, enabling gyro');
        window.addEventListener('deviceorientation', (e: DeviceOrientationEvent) => {
          const alpha = e.alpha || 0;
          const beta = e.beta || 0;
          const radBeta = (beta * Math.PI) / 180;
          const radAlpha = (alpha * Math.PI) / 180;
          const clampedBeta = Math.max(-Math.PI / 2.5, Math.min(Math.PI / 2.5, radBeta));

          camera.setAttribute('rotation', {
            x: THREE.MathUtils.radToDeg(clampedBeta),
            y: THREE.MathUtils.radToDeg(radAlpha),
            z: 0,
          });
        });
      }
    }

    // Load Cardboard effect script for split-screen stereo
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/cardboard-vr-display@1.0.0/build/cardboard-vr-display.min.js';
    script.async = true;
    document.head.appendChild(script);

    script.onload = () => {
      console.log('[VR] Cardboard loaded, applying stereo');
      // Request fullscreen for better VR experience
      try {
        const elem = (aScene.canvas || document.documentElement) as any;
        elem.requestFullscreen?.() || 
        elem.webkitRequestFullscreen?.() ||
        elem.mozRequestFullScreen?.();
      } catch (e) {
        console.log('[VR] Fullscreen not available');
      }
    };
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
