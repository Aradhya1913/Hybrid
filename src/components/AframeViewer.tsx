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
        // Gyro mode - normal single view with improved raycaster
        containerRef.current.innerHTML = `
          <a-scene embedded>
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

      const currentScene = scenes[modeManager.currentSceneIndex];
      console.log(`[AframeViewer] 🎬 Scene loaded callback for: ${currentScene?.id}`);

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
      const hotspotContainer = aScene.querySelector('#hotspots') as any;

      console.log(`[AframeViewer] Scene elements - panorama: ${!!panoramaImg}, sky: ${!!sky}, hotspots container: ${!!hotspotContainer}`);

      if (panoramaImg && sky) {
        // Monitor image load with better detection
        let imageLoadAttempts = 0;
        const maxAttempts = 100; // 10 seconds max wait (was 5)
        
        const checkImageLoaded = () => {
          imageLoadAttempts++;
          
          // Log every 10 attempts to avoid spam
          if (imageLoadAttempts % 10 === 0 || imageLoadAttempts === 1) {
            console.log(`[AframeViewer] Image load check ${imageLoadAttempts}/${maxAttempts} for ${currentScene?.id}: complete=${panoramaImg.complete}, height=${panoramaImg.naturalHeight}`);
          }
          
          if (panoramaImg.complete && panoramaImg.naturalHeight > 0) {
            console.log(`[AframeViewer] ✅ Image loaded after ${imageLoadAttempts} attempts`);
            
            // Add sky fade-in animation
            sky.setAttribute('animation', 'property: opacity; from: 0.5; to: 1; dur: 800; easing: easeInOutQuad');
            
            // Add slight camera rotation transition for immersion
            camera.setAttribute('animation', 'property: rotation; from: 0 0 0; to: 0 0 0; dur: 300; easing: easeOutQuad');
            
            // Wait a bit more to ensure sky texture is applied
            setTimeout(() => {
              console.log(`[AframeViewer] 🔧 Adding hotspots for ${currentScene?.id} (${currentScene?.hotSpots?.length || 0} hotspots)`);
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
            console.warn(`[AframeViewer] ⚠️ Image load timeout after ${maxAttempts} attempts, adding hotspots anyway for ${currentScene?.id}`);
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
            console.log(`[AframeViewer] Image cached for ${currentScene?.id}`);
            checkImageLoaded();
          } else {
            console.log(`[AframeViewer] Starting image load poll for ${currentScene?.id}`);
            panoramaImg.onload = () => {
              console.log(`[AframeViewer] onload event for ${currentScene?.id}`);
              checkImageLoaded();
            };
            panoramaImg.onerror = () => {
              console.error(`[AframeViewer] ❌ Image load error for ${currentScene?.id}`);
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
        console.warn('[AframeViewer] ⚠️ Panorama or sky element not found!');
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

    console.log(`[AframeViewer] 🎯 Adding hotspots for scene: ${scene.id}, count: ${scene.hotSpots?.length || 0}`);

    // Add hotspots from scene data
    if (Array.isArray(scene.hotSpots) && scene.hotSpots.length > 0) {
      scene.hotSpots.forEach((hotspot, idx) => {
        console.log(`[AframeViewer]   → Hotspot ${idx}: yaw=${hotspot.yaw}°, pitch=${hotspot.pitch}°, target=${hotspot.targetSceneId}`);
        addHotspot(hotspotContainer, hotspot.yaw, hotspot.pitch, hotspot.targetSceneId, hotspot.text);
      });
      
      // Verify hotspots were added and force render
      setTimeout(() => {
        const addedHotspots = hotspotContainer.querySelectorAll('a-image');
        console.log(`[AframeViewer] ✓ Verification: ${addedHotspots.length} hotspots in DOM for scene ${scene.id}`);
        
        // Force A-Frame to re-render
        if (aScene && aScene.renderer) {
          try {
            aScene.renderer.render(aScene.object3D, aScene.camera);
            console.log('[AframeViewer] ✓ Force rendered scene');
          } catch (e) {
            console.warn('[AframeViewer] Could not force render:', e);
          }
        }
        
        if (addedHotspots.length === 0) {
          console.error('[AframeViewer] ❌ ERROR: Hotspots were not added to DOM! Retrying...');
          // Retry adding hotspots
          scene.hotSpots.forEach((hotspot, idx) => {
            console.log(`[AframeViewer]   🔄 RETRY ${idx}: yaw=${hotspot.yaw}°, pitch=${hotspot.pitch}°, target=${hotspot.targetSceneId}`);
            addHotspot(hotspotContainer, hotspot.yaw, hotspot.pitch, hotspot.targetSceneId, hotspot.text);
          });
          
          // Force render again after retry
          setTimeout(() => {
            if (aScene && aScene.renderer) {
              aScene.renderer.render(aScene.object3D, aScene.camera);
            }
          }, 100);
        }
      }, 300);
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
    const distance = 15; // INCREASED from 5 to 15 for better visibility

    const x = distance * Math.cos(pitch) * Math.sin(yaw);
    const y = distance * Math.sin(pitch);
    const z = distance * Math.cos(pitch) * Math.cos(yaw);

    const position = `${x} ${y} ${z}`;

    // Create hotspot entity with arrow.png image
    const hotspot = document.createElement('a-image');
    hotspot.setAttribute('src', '#arrow-icon');
    hotspot.setAttribute('position', position);
    hotspot.setAttribute('scale', '2 2 2'); // INCREASED from 1.2 to 2 for visibility
    // Don't use look-at - instead manually set a constrained rotation
    hotspot.setAttribute('rotation', '0 0 0');
    hotspot.setAttribute('data-target-scene-id', targetSceneId);
    hotspot.classList.add('clickable');
    hotspot.style.cursor = 'pointer';
    
    // Add opacity and animation attributes - FORCED VISIBLE
    hotspot.setAttribute('opacity', '1');
    hotspot.setAttribute('visible', 'true');
    hotspot.setAttribute('animation', 'property: scale; from: 1.6 1.6 1.6; to: 2 2 2; dur: 600; easing: easeInOutQuad');

    console.log(`[AframeViewer] Creating hotspot: yaw=${yawDeg}, pitch=${pitchDeg}, pos=(${x.toFixed(2)},${y.toFixed(2)},${z.toFixed(2)}), target=${targetSceneId}`);

    const handleHotspotClick = () => {
      console.log('[AframeViewer] Hotspot clicked, target:', targetSceneId);
      
      const targetIdx = scenes.findIndex((s) => s.id === targetSceneId);
      if (targetIdx >= 0) {
        // Click animation
        hotspot.setAttribute('animation__click', 'property: scale; from: 2 2 2; to: 2.3 2.3 2.3; dur: 150; direction: alternate');
        
        // Fade to next scene
        setTimeout(() => {
          modeManager.setCurrentScene(targetIdx);
        }, 150);
      }
    };

    // Handle both click and intersection for raycaster
    hotspot.addEventListener('click', handleHotspotClick);
    
    // Handle raycaster intersection (fuse event)
    hotspot.addEventListener('raycaster-intersection', () => {
      console.log('[AframeViewer] Raycaster intersected hotspot:', targetSceneId);
    });

    hotspot.addEventListener('raycaster-intersection-cleared', () => {
      console.log('[AframeViewer] Raycaster cleared from hotspot:', targetSceneId);
    });

    // CONSTRAINED BILLBOARD: Update rotation to face camera but limit extreme angles
    const updateHotspotRotation = (aScene: any) => {
      if (!aScene?.camera) return;
      
      // Get the Three.js object from the A-Frame entity
      const hotspotMesh = (hotspot as any).object3D;
      if (!hotspotMesh) return;
      
      const camera = aScene.camera;
      const hotspotPos = hotspotMesh.position.clone();
      const cameraPos = camera.getWorldPosition(new THREE.Vector3());
      
      // Calculate direction from hotspot to camera
      const direction = cameraPos.clone().sub(hotspotPos).normalize();
      
      // Create a quaternion that represents looking at the camera
      const lookAtQuat = new THREE.Quaternion();
      const up = new THREE.Vector3(0, 1, 0);
      
      // Use a matrix to calculate rotation
      const matrix = new THREE.Matrix4();
      matrix.lookAt(hotspotPos, cameraPos, up);
      lookAtQuat.setFromRotationMatrix(matrix);
      
      // Apply the rotation
      hotspotMesh.quaternion.copy(lookAtQuat);
    };
    
    // First update after small delay
    setTimeout(() => {
      updateHotspotRotation(sceneRef.current);
    }, 100);
    
    // Keep updating to maintain billboard effect
    const rotationInterval = setInterval(() => {
      updateHotspotRotation(sceneRef.current);
    }, 300);
    
    hotspot.addEventListener('remove', () => clearInterval(rotationInterval));

    // IMPORTANT: Add touch event support for mobile devices
    hotspot.addEventListener('touchend', (e: TouchEvent) => {
      e.preventDefault();
      e.stopPropagation();
      handleHotspotClick();
    }, { passive: false });

    // Handle hover with smooth transition
    hotspot.addEventListener('mouseenter', () => {
        hotspot.setAttribute('scale', '2.3 2.3 2.3');
        hotspot.setAttribute('animation__hover', 'property: scale; to: 2.5 2.5 2.5; dur: 200');
    });

    hotspot.addEventListener('mouseleave', () => {
        hotspot.setAttribute('scale', '2 2 2');
    });

    container.appendChild(hotspot);
    console.log(`[AframeViewer] ✓ Hotspot added to DOM with position ${position}, target: ${targetSceneId}`);
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
    
    // Add a small delay to ensure hotspots are in DOM
    setTimeout(() => {
      const hotspotContainer = aScene.querySelector('#hotspots');
      const hotspots = hotspotContainer?.querySelectorAll('a-image') || [];

      console.log(`[AframeViewer] ✓ Found ${hotspots.length} hotspots in DOM`);
      
      if (hotspots.length === 0) {
        console.warn('[AframeViewer] ⚠ WARNING: No hotspots found in DOM!');
        // Try to find them by checking innerHTML
        if (hotspotContainer) {
          console.log('[AframeViewer] Hotspot container HTML:', hotspotContainer.innerHTML.substring(0, 500));
        }
        return;
      }

      // Setup event listeners on each hotspot
      hotspots.forEach((hotspot: any, index: number) => {
        const targetSceneId = hotspot.getAttribute('data-target-scene-id');
        const pos = hotspot.getAttribute('position');
        console.log(`[AframeViewer] Hotspot ${index}: target=${targetSceneId}, position=${pos}, visible=${hotspot.getAttribute('visible')}`);

        const handleHotspotClick = () => {
          console.log('[AframeViewer] Hotspot clicked:', targetSceneId);
          const targetIdx = scenes.findIndex((s) => s.id === targetSceneId);
          if (targetIdx >= 0) {
            modeManager.setCurrentScene(targetIdx);
          }
        };

        // Add click handler directly
        hotspot.addEventListener('click', handleHotspotClick);

        // Add cursor fuse event (for A-Frame raycaster)
        hotspot.addEventListener('fuse', handleHotspotClick);
        
        // Raycaster intersection events for hover feedback
        hotspot.addEventListener('raycaster-intersected', () => {
          console.log('[AframeViewer] Raycaster intersected:', targetSceneId);
          hotspot.setAttribute('scale', '1.4 1.4 1.4');
        });

        hotspot.addEventListener('raycaster-intersected-cleared', () => {
          console.log('[AframeViewer] Raycaster cleared:', targetSceneId);
          hotspot.setAttribute('scale', '1.2 1.2 1.2');
        });
      });

      // Force render update
      if (aScene && aScene.renderer) {
        console.log('[AframeViewer] Triggering render update');
        aScene.renderer.render(aScene.object3D, aScene.camera);
      }
    }, 300);
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
