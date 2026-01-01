import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { useModeManager } from './ModeManager';
import { SceneDef } from '../data/scenes';

export function AframeViewer({ scenes }: { scenes: SceneDef[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const modeManager = useModeManager();
  const sceneRef = useRef<any>(null);
  const [isLoading, setIsLoading] = useState(false);

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

      // Get or create fade overlay outside the container
      let fadeOverlay = document.getElementById('fade-overlay-gyro');
      if (!fadeOverlay) {
        fadeOverlay = document.createElement('div');
        fadeOverlay.id = 'fade-overlay-gyro';
        fadeOverlay.style.cssText = `
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.7);
          z-index: 998;
          opacity: 0;
          transition: opacity 0.5s ease-in-out;
          pointer-events: none;
        `;
        document.body.appendChild(fadeOverlay);
      }

      // Show fade overlay
      fadeOverlay.style.opacity = '1';
      fadeOverlay.style.pointerEvents = 'auto';

      // Wait for fade effect
      await new Promise(resolve => setTimeout(resolve, 500));

      const scene = scenes[modeManager.currentSceneIndex];
      const isVRMode = modeManager.mode === 'vr';
      
      // For VR mode, use stereoscopic split-screen; for Gyro, use normal view
      if (isVRMode) {
        // VR split-screen stereo view (YouTube VR style)
        containerRef.current.innerHTML = `
          <a-scene embedded embedded-vr inspector="url: https://aframe.io/releases/latest/aframe-inspector.js" vr-mode-ui="enabled: false">
            <a-assets>
              <img id="panorama" src="${scene?.url || ''}" />
              <img id="arrow-icon" src="/ui/arrow.png" />
            </a-assets>
            <a-sky id="app-sky" src="#panorama" rotation="0 0 0"></a-sky>
            <a-camera id="camera" position="0 0 0" look-controls="enabled: true" wasd-controls="enabled: false" camera="active: true; far: 10000; fov: 80">
              <a-cursor id="cursor" fuse="true" fuseTimeout="1500" raycaster="far: 10000; objects: .clickable"></a-cursor>
            </a-camera>
            <a-entity id="hotspots"></a-entity>
          </a-scene>
        `;
      } else {
        // Gyro mode - normal single view
        containerRef.current.innerHTML = `
          <a-scene embedded inspector="url: https://aframe.io/releases/latest/aframe-inspector.js">
            <a-assets>
              <img id="panorama" src="${scene?.url || ''}" />
              <img id="arrow-icon" src="/ui/arrow.png" />
            </a-assets>
            <a-sky id="app-sky" src="#panorama" rotation="0 0 0"></a-sky>
            <a-camera id="camera" position="0 0 0" look-controls="enabled: true; pointerLockEnabled: true" wasd-controls="enabled: false">
              <a-cursor id="cursor" fuse="true" fuseTimeout="1500" raycaster="far: 10000; objects: .clickable"></a-cursor>
            </a-camera>
            <a-entity id="hotspots"></a-entity>
          </a-scene>
        `;
      }

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

      // Show loading indicator
      setIsLoading(true);
      console.log('[AframeViewer] Starting to load scene panorama');

      // Show fade overlay immediately and disable pointer events so raycaster works
      let fadeOverlay = document.getElementById('fade-overlay-gyro');
      if (!fadeOverlay) {
        fadeOverlay = document.createElement('div');
        fadeOverlay.id = 'fade-overlay-gyro';
        fadeOverlay.style.cssText = `
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.7);
          z-index: 998;
          opacity: 0;
          transition: opacity 0.5s ease-in-out;
          pointer-events: none;
        `;
        document.body.appendChild(fadeOverlay);
      }

      fadeOverlay.style.opacity = '1';
      fadeOverlay.style.pointerEvents = 'none'; // CRITICAL: Don't block raycaster

      // Wait for panorama image to fully load before showing hotspots
      const panoramaImg = aScene.querySelector('#panorama') as any;
      const sky = aScene.querySelector('#app-sky') as any;

      if (panoramaImg && sky) {
        // Monitor image load with better detection
        let imageLoadAttempts = 0;
        const maxAttempts = 50; // 5 seconds max wait
        
        const checkImageLoaded = () => {
          imageLoadAttempts++;
          console.log(`[AframeViewer] Checking image load attempt ${imageLoadAttempts}, complete: ${panoramaImg.complete}, naturalHeight: ${panoramaImg.naturalHeight}`);
          
          if (panoramaImg.complete && panoramaImg.naturalHeight > 0) {
            console.log('[AframeViewer] Panorama image loaded successfully');
            
            // Add sky fade-in animation
            sky.setAttribute('animation', 'property: opacity; from: 0.5; to: 1; dur: 800; easing: easeInOutQuad');
            
            // Add slight camera rotation transition for immersion
            camera.setAttribute('animation', 'property: rotation; from: 0 0 0; to: 0 0 0; dur: 300; easing: easeOutQuad');
            
            // Wait a bit more to ensure sky texture is applied
            setTimeout(() => {
              console.log('[AframeViewer] Adding hotspots after texture applied');
              // Image is loaded, now add hotspots
              addHotspots(aScene);
              setIsLoading(false);

              // Fade out the overlay
              if (fadeOverlay) {
                fadeOverlay.style.opacity = '0';
                fadeOverlay.style.pointerEvents = 'none';
              }

              // Determine if we're in gyro or VR mode
              const isGyroMode = modeManager.mode === 'gyro';

              if (isGyroMode) {
                enableGyroMode(camera, aScene);
              } else if (modeManager.mode === 'vr') {
                enableVRMode(aScene, camera);
              }

              // Setup mobile click detection after hotspots are added
              setTimeout(() => {
                setupMobileHotspotDetection(aScene);
              }, 200);
            }, 400);
          } else if (imageLoadAttempts < maxAttempts) {
            // Still loading, check again
            setTimeout(checkImageLoaded, 100);
          } else {
            // Timeout - force add hotspots anyway
            console.warn('[AframeViewer] Image load timeout, adding hotspots anyway');
            addHotspots(aScene);
            setIsLoading(false);

            if (fadeOverlay) {
              fadeOverlay.style.opacity = '0';
              fadeOverlay.style.pointerEvents = 'none';
            }

            const isGyroMode = modeManager.mode === 'gyro';
            if (isGyroMode) {
              enableGyroMode(camera, aScene);
            } else if (modeManager.mode === 'vr') {
              enableVRMode(aScene, camera);
            }

            setTimeout(() => {
              setupMobileHotspotDetection(aScene);
            }, 200);
          }
        };

        // Start checking if image is loaded (add small delay to let A-Frame initialize)
        setTimeout(() => {
          if (panoramaImg.complete && panoramaImg.naturalHeight > 0) {
            console.log('[AframeViewer] Image already cached/loaded');
            checkImageLoaded();
          } else {
            panoramaImg.onload = checkImageLoaded;
            panoramaImg.onerror = () => {
              console.error('[AframeViewer] Failed to load panorama image');
              setIsLoading(false);
              if (fadeOverlay) {
                fadeOverlay.style.opacity = '0';
                fadeOverlay.style.pointerEvents = 'none';
              }
            };
            // Also start polling in case onload doesn't fire
            setTimeout(checkImageLoaded, 100);
          }
        }, 100);
      } else {
        // Fallback if elements not found
        console.warn('[AframeViewer] Panorama or sky element not found, adding hotspots anyway');
        addHotspots(aScene);
        setIsLoading(false);

        if (fadeOverlay) {
          fadeOverlay.style.opacity = '0';
          fadeOverlay.style.pointerEvents = 'none';
        }

        const isGyroMode = modeManager.mode === 'gyro';
        if (isGyroMode) {
          enableGyroMode(camera, aScene);
        } else if (modeManager.mode === 'vr') {
          enableVRMode(aScene, camera);
        }

        setTimeout(() => {
          setupMobileHotspotDetection(aScene);
        }, 200);
      }
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
    if (!hotspotContainer) {
      console.error('[AframeViewer] Hotspot container not found!');
      return;
    }

    // Clear existing hotspots
    while (hotspotContainer.firstChild) {
      hotspotContainer.removeChild(hotspotContainer.firstChild);
    }

    const scene = scenes[modeManager.currentSceneIndex];
    if (!scene) {
      console.error('[AframeViewer] Scene not found at index:', modeManager.currentSceneIndex);
      return;
    }

    console.log(`[AframeViewer] Adding hotspots for scene: ${scene.id}, count: ${scene.hotSpots?.length || 0}`);

    // Add hotspots from scene data
    if (Array.isArray(scene.hotSpots) && scene.hotSpots.length > 0) {
      scene.hotSpots.forEach((hotspot, idx) => {
        console.log(`[AframeViewer] Adding hotspot ${idx}: yaw=${hotspot.yaw}, pitch=${hotspot.pitch}, target=${hotspot.targetSceneId}`);
        addHotspot(hotspotContainer, hotspot.yaw, hotspot.pitch, hotspot.targetSceneId, hotspot.text);
      });
    } else {
      // Fallback: add a single hotspot to next scene
      console.log('[AframeViewer] No hotspots defined, adding fallback hotspot');
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
    console.log('[AframeViewer] Setting up hotspot detection');
    
    const cursor = aScene.querySelector('#cursor') as any;
    const hotspots = aScene.querySelectorAll('.clickable');

    console.log('[AframeViewer] Found hotspots:', hotspots.length);

    // Setup event listeners on each hotspot
    hotspots.forEach((hotspot: any, index: number) => {
      const targetSceneId = hotspot.getAttribute('data-target-scene-id');
      console.log(`[AframeViewer] Hotspot ${index}: ${targetSceneId}`);

      const handleHotspotClick = () => {
        console.log('[AframeViewer] Hotspot clicked/fused:', targetSceneId);
        
        const targetIdx = scenes.findIndex((s) => s.id === targetSceneId);
        if (targetIdx >= 0) {
          // Click animation
          const originalScale = '0.8 0.8 0.8';
          const clickScale = '1.1 1.1 1.1';
          hotspot.setAttribute('scale', clickScale);
          setTimeout(() => {
            hotspot.setAttribute('scale', originalScale);
          }, 150);
          
          console.log('[AframeViewer] Navigating to scene:', targetIdx);
          modeManager.setCurrentScene(targetIdx);
        }
      };

      // Listen for cursor-fuse event (gaze-based click in VR mode)
      hotspot.addEventListener('fuse', () => {
        console.log('[AframeViewer] Fuse event on hotspot');
        handleHotspotClick();
      });

      // Raycaster intersection events for hover feedback
      hotspot.addEventListener('raycaster-intersected', () => {
        console.log('[AframeViewer] Raycaster intersected');
        hotspot.setAttribute('scale', '1 1 1');
      });

      hotspot.addEventListener('raycaster-cleared', () => {
        console.log('[AframeViewer] Raycaster cleared');
        hotspot.setAttribute('scale', '0.8 0.8 0.8');
      });

      // Click events for desktop
      hotspot.addEventListener('click', () => {
        console.log('[AframeViewer] Click event on hotspot');
        handleHotspotClick();
      });

      // Touch events for mobile non-VR
      hotspot.addEventListener('touchend', (e: TouchEvent) => {
        e.preventDefault();
        e.stopPropagation();
        console.log('[AframeViewer] Touchend event on hotspot');
        handleHotspotClick();
      }, { passive: false });
    });

    // Setup canvas-level tap detection
    const canvas = aScene.canvas;
    if (canvas) {
      const handleCanvasTap = () => {
        console.log('[AframeViewer] Canvas tapped');
        
        // In VR mode, tapping anywhere with cursor on hotspot should click
        // The cursor fuse will handle this, but we add this as fallback
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
          console.log('[AframeViewer] Canvas tap hit hotspot');
          
          // Find the corresponding hotspot element
          hotspots.forEach((h: any) => {
            if (h.object3D && intersects[0].object.parent?.parent?.userData?.aframeEntity === h) {
              console.log('[AframeViewer] Triggering hotspot click from canvas tap');
              h.click?.();
            }
          });
        }
      };

      // Listen for screen taps
      canvas.addEventListener('click', handleCanvasTap);
      canvas.addEventListener('touchend', (e: TouchEvent) => {
        e.preventDefault();
        handleCanvasTap();
      }, { passive: false });
    }
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
    console.log('[AframeViewer] Enabling Cardboard stereo rendering for VR mode');
    
    if (!aScene || !aScene.renderer) return;

    const renderer = aScene.renderer as THREE.WebGLRenderer;
    const canvas = renderer.domElement;

    // Apply split-screen stereo CSS
    const style = document.createElement('style');
    style.id = 'vr-stereo-style';
    style.textContent = `
      body {
        margin: 0;
        padding: 0;
        overflow: hidden;
      }
      
      a-scene {
        width: 100vw !important;
        height: 100vh !important;
      }
      
      canvas {
        width: 100vw !important;
        height: 100vh !important;
        display: block !important;
      }
    `;
    
    // Remove existing style if present
    const existingStyle = document.getElementById('vr-stereo-style');
    if (existingStyle) {
      existingStyle.remove();
    }
    document.head.appendChild(style);

    // Enable stereo effect using Three.js
    setTimeout(() => {
      try {
        // Get THREE library from A-Frame
        const THREE = (window as any).THREE;
        if (!THREE) return;

        // Create stereo effect for split-screen rendering
        const width = window.innerWidth;
        const height = window.innerHeight;
        
        // Store original render function
        const originalRender = renderer.render.bind(renderer);
        
        // Override render to draw split-screen
        let frameCount = 0;
        renderer.render = function(scene: any, cam: any) {
          frameCount++;
          
          // Render left eye
          renderer.setViewport(0, 0, width / 2, height);
          renderer.setScissor(0, 0, width / 2, height);
          renderer.setScissorTest(true);
          cam.position.x = -0.032; // IPD offset for left eye
          originalRender(scene, cam);
          
          // Render right eye
          renderer.setViewport(width / 2, 0, width / 2, height);
          renderer.setScissor(width / 2, 0, width / 2, height);
          renderer.setScissorTest(true);
          cam.position.x = 0.032; // IPD offset for right eye
          originalRender(scene, cam);
          
          // Reset
          cam.position.x = 0;
          renderer.setScissorTest(false);
          renderer.setViewport(0, 0, width, height);
        };

        console.log('[AframeViewer] Stereo effect enabled');

        // Handle window resize
        const handleResize = () => {
          const newWidth = window.innerWidth;
          const newHeight = window.innerHeight;
          renderer.setSize(newWidth, newHeight);
        };
        window.addEventListener('resize', handleResize);

        // Request fullscreen
        try {
          const elem = canvas as any;
          if (elem.requestFullscreen) {
            elem.requestFullscreen().catch(() => {});
          } else if (elem.webkitRequestFullscreen) {
            elem.webkitRequestFullscreen();
          } else if (elem.mozRequestFullScreen) {
            elem.mozRequestFullScreen();
          }
        } catch (e) {
          console.log('[VR] Fullscreen not available');
        }
      } catch (error) {
        console.error('[AframeViewer] Error enabling stereo:', error);
      }
    }, 500);
  };

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
      }}
    >
      {/* Loading Overlay */}
      {isLoading && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 999,
            backdropFilter: 'blur(5px)',
            pointerEvents: 'auto',
          }}
        >
          {/* Spinner */}
          <div
            style={{
              width: 60,
              height: 60,
              border: '4px solid rgba(255, 255, 255, 0.2)',
              borderTop: '4px solid rgba(100, 200, 255, 0.8)',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              marginBottom: 16,
            }}
          />
          <div
            style={{
              color: '#fff',
              fontSize: 14,
              fontWeight: 500,
              textAlign: 'center',
            }}
          >
            Loading Scene...
          </div>
          <div
            style={{
              color: 'rgba(255, 255, 255, 0.6)',
              fontSize: 12,
              marginTop: 8,
            }}
          >
            Please wait
          </div>

          {/* CSS Animation */}
          <style>{`
            @keyframes spin {
              to { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      )}
    </div>
  );
}
