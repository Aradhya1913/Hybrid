import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { useModeManager } from './ModeManager';
import { SceneDef } from '../data/scenes';

export function AframeViewer({ scenes }: { scenes: SceneDef[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneMountRef = useRef<HTMLDivElement>(null);
  const modeManager = useModeManager();
  const sceneRef = useRef<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const gyroOffsetsRef = useRef<{ yaw: number; pitch: number }>({ yaw: 0, pitch: 0 });
  const gyroOrientationCleanupRef = useRef<null | (() => void)>(null);

  const UI_ACCENT = 'rgba(0, 0, 0, 1)';
  const UI_DARK = 'rgba(30, 30, 30, 1)';
  const GLASS_BG = 'rgba(231, 231, 231, 0.14)';
  const GLASS_BG_HOVER = 'rgba(231, 231, 231, 0.22)';

  const positionTooltipAboveObject = (object3D: THREE.Object3D) => {
    const aScene = sceneRef.current;
    const tooltip = document.getElementById('hotspot-tooltip');
    if (!aScene?.camera || !aScene?.renderer || !tooltip) return;

    const rect = aScene.renderer.domElement.getBoundingClientRect();
    const worldPos = object3D.getWorldPosition(new THREE.Vector3());
    const projected = worldPos.project(aScene.camera);

    const x = (projected.x * 0.5 + 0.5) * rect.width + rect.left;
    const y = (-projected.y * 0.5 + 0.5) * rect.height + rect.top;

    // Place tooltip above the icon
    const verticalOffsetPx = 50; // slightly lower
    const left = Math.max(8, Math.min(window.innerWidth - 8, x));
    const top = Math.max(8, Math.min(window.innerHeight - 8, y - verticalOffsetPx));

    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${top}px`;
    tooltip.style.transform = 'translate(-50%, -100%)';
  };

  useEffect(() => {
    if (!sceneMountRef.current) return;

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

      if (!sceneMountRef.current) return;

      // Get or create fade overlay (accessible to all nested functions)
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
          background: #000000;
          z-index: 998;
          opacity: 0;
          transition: opacity 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94);
          pointer-events: none;
        `;
        document.body.appendChild(fadeOverlay);
      }

      // Always start Gyro/VR by fading to black while A-Frame + the pano initializes.
      // This makes the *first* panorama load and all scene changes visibly transition.
      fadeOverlay.style.pointerEvents = 'none';
      fadeOverlay.style.transition = 'opacity 0.25s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
      fadeOverlay.style.opacity = '1';

      const scene = scenes[modeManager.currentSceneIndex];
      const isVRMode = modeManager.mode === 'vr';
      
      // For VR mode, use stereoscopic split-screen; for Gyro, use normal view
      if (isVRMode) {
        // VR split-screen stereo view (YouTube VR style)
        sceneMountRef.current.innerHTML = `
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
        sceneMountRef.current.innerHTML = `
          <a-scene embedded vr-mode-ui="enabled: false">
            <a-assets>
              <img id="panorama" src="${scene?.url || ''}" />
              <img id="arrow-icon" src="/ui/arrow.png" />
            </a-assets>
            <a-sky id="app-sky" src="#panorama" rotation="0 0 0"></a-sky>
            <a-camera id="camera" position="0 0 0" look-controls="enabled: true; pointerLockEnabled: true" wasd-controls="enabled: false">
              <a-cursor id="cursor" visible="false" fuse="true" fuseTimeout="1500" raycaster="far: 10000; objects: .clickable"></a-cursor>
            </a-camera>
            <a-entity id="hotspots"></a-entity>
          </a-scene>
        `;
      }

      // Get the scene element and ensure it's ready
      const aScene = sceneMountRef.current.querySelector('a-scene') as any;
      sceneRef.current = aScene;

      // Define handleSceneLoaded inside setupScene to access fadeOverlay
      const handleSceneLoaded = (aScene: any) => {
        const camera = aScene.querySelector('#camera') as any;
        if (!camera) return;

        const currentScene = scenes[modeManager.currentSceneIndex];
        console.log(`[AframeViewer] 🎬 Scene loaded callback for: ${currentScene?.id}`);

        // Apply per-panorama initial viewing direction.
        // VR: set the camera rotation directly (look-controls will start from here).
        // Gyro: store offsets so deviceorientation applies the per-panorama alignment.
        const initialYaw = currentScene?.initialView?.yaw ?? 0;
        const initialPitch = currentScene?.initialView?.pitch ?? 0;
        gyroOffsetsRef.current = { yaw: initialYaw, pitch: initialPitch };

        try {
          camera.setAttribute('rotation', {
            x: initialPitch,
            y: initialYaw,
            z: 0,
          });
        } catch {
          // Ignore
        }

        // Show loading indicator (but not for A-Frame Gyro - instant transitions)
        const isGyroMode = modeManager.mode === 'gyro';
        // Never set isLoading for Gyro mode - keep it false
        if (!isGyroMode) {
          setIsLoading(true);
        }
        console.log('[AframeViewer] Starting to load scene panorama');

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
              
              // Fade in from black when image loads
              if (fadeOverlay) {
                fadeOverlay.style.transition = 'opacity 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
                fadeOverlay.style.opacity = '0';
              }
              
              // Set sky to fully opaque immediately - no fade animation to avoid blue flash
              sky.setAttribute('opacity', '1');
              
              // Add slight camera rotation transition for immersion
              camera.setAttribute('animation', 'property: rotation; from: 0 0 0; to: 0 0 0; dur: 300; easing: easeOutQuad');
              
              // Wait a bit more to ensure sky texture is applied
              setTimeout(() => {
                console.log(`[AframeViewer] 🔧 Adding hotspots for ${currentScene?.id} (${currentScene?.hotSpots?.length || 0} hotspots)`);
                // Image is loaded, now add hotspots
                addHotspots(aScene);
                // Only turn off loading for non-Gyro modes
                if (!isGyroMode) {
                  setIsLoading(false);
                }

                // Setup gyro or VR mode (already determined isGyroMode earlier)
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
              if (!isGyroMode) {
                setIsLoading(false);
              }

              if (fadeOverlay) {
                fadeOverlay.style.transition = 'opacity 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
                fadeOverlay.style.opacity = '0';
                fadeOverlay.style.pointerEvents = 'none';
              }

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
                  fadeOverlay.style.transition = 'opacity 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
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
          if (!isGyroMode) {
            setIsLoading(false);
          }

          if (fadeOverlay) {
            fadeOverlay.style.opacity = '0';
            fadeOverlay.style.pointerEvents = 'none';
          }

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

      // Wait for A-Frame to load
      if (aScene.hasLoaded) {
        handleSceneLoaded(aScene);
      } else {
        aScene.addEventListener('loaded', () => {
          handleSceneLoaded(aScene);
        });
      }
    };

    setupScene();

    return () => {
      // Clean up deviceorientation listener between scene mounts.
      if (gyroOrientationCleanupRef.current) {
        gyroOrientationCleanupRef.current();
        gyroOrientationCleanupRef.current = null;
      }

      if (sceneMountRef.current) {
        sceneMountRef.current.innerHTML = '';
      }

      // Ensure we don't leave the screen black when leaving Gyro/VR.
      const fadeOverlay = document.getElementById('fade-overlay-gyro');
      if (fadeOverlay) {
        (fadeOverlay as HTMLDivElement).style.transition = 'none';
        (fadeOverlay as HTMLDivElement).style.opacity = '0';
        (fadeOverlay as HTMLDivElement).style.pointerEvents = 'none';
      }

      // Remove VR-specific injected CSS
      const existingStyle = document.getElementById('vr-stereo-style');
      if (existingStyle) existingStyle.remove();
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
      
      // Fade to black before scene transition
      const fadeOverlay = document.getElementById('fade-overlay-gyro');
      if (fadeOverlay) {
        fadeOverlay.style.opacity = '1';
      }
      
      const targetIdx = scenes.findIndex((s) => s.id === targetSceneId);
      if (targetIdx >= 0) {
        // Wait for fade-out to complete, then change scene
        setTimeout(() => {
          modeManager.setCurrentScene(targetIdx);
        }, 250);
      }
    };

    // Handle both click and intersection for raycaster
    hotspot.addEventListener('click', handleHotspotClick);
    
    // Handle hover to show tooltip
    const targetScene = scenes.find((s) => s.id === targetSceneId);
    const tooltipText = targetScene?.title || targetSceneId || 'Navigate';
    
    // Store tooltip text on the hotspot element for later retrieval
    hotspot.setAttribute('data-tooltip-text', tooltipText);

    let tooltipRafId: number | null = null;
    const startTooltipTracking = () => {
      if (tooltipRafId != null) return;
      const tick = () => {
        if ((hotspot as any).object3D) {
          positionTooltipAboveObject((hotspot as any).object3D);
        }
        tooltipRafId = requestAnimationFrame(tick);
      };
      tooltipRafId = requestAnimationFrame(tick);
    };
    const stopTooltipTracking = () => {
      if (tooltipRafId != null) {
        cancelAnimationFrame(tooltipRafId);
        tooltipRafId = null;
      }
    };
    
    // Handle raycaster-intersected event for hover feedback and tooltip
    hotspot.addEventListener('raycaster-intersected', () => {
      console.log('[AframeViewer] 🎯 Raycaster intersected hotspot:', targetSceneId, 'tooltip:', tooltipText);
      
      // Show tooltip
      const tooltip = document.getElementById('hotspot-tooltip');
      console.log('[AframeViewer] Tooltip element found:', !!tooltip);
      if (tooltip) {
        tooltip.textContent = tooltipText;
        tooltip.style.display = 'block';
        console.log('[AframeViewer] Tooltip text set to:', tooltipText);
        if ((hotspot as any).object3D) {
          positionTooltipAboveObject((hotspot as any).object3D);
        }
        startTooltipTracking();
      }
    });

    hotspot.addEventListener('raycaster-intersected-cleared', () => {
      console.log('[AframeViewer] Raycaster cleared from hotspot:', targetSceneId);
      
      // Hide tooltip
      const tooltip = document.getElementById('hotspot-tooltip');
      if (tooltip) {
        tooltip.style.display = 'none';
      }

      stopTooltipTracking();
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
        // Play hover sound
        const hoverSound = new Audio('/media/hover.mp3');
        hoverSound.volume = 0.3;
        hoverSound.play().catch(() => {});
        
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

    // Ensure we don't stack multiple listeners across scene changes.
    if (gyroOrientationCleanupRef.current) {
      gyroOrientationCleanupRef.current();
      gyroOrientationCleanupRef.current = null;
    }

    // Request permission for iOS 13+
    if (typeof DeviceOrientationEvent !== 'undefined') {
      if ((DeviceOrientationEvent as any).requestPermission) {
        try {
          const permission = await (DeviceOrientationEvent as any).requestPermission();
          if (permission === 'granted') {
            console.log('[AframeViewer] Permission granted, enabling device orientation');
              gyroOrientationCleanupRef.current = setupDeviceOrientation(camera);
          } else {
            console.warn('[AframeViewer] Permission denied');
          }
        } catch (err) {
          console.error('[AframeViewer] Permission request failed:', err);
        }
      } else {
        // Non-iOS devices
        console.log('[AframeViewer] Non-iOS device, enabling device orientation');
        gyroOrientationCleanupRef.current = setupDeviceOrientation(camera);
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
        return;
      }

      // Get cursor element
      const cursor = aScene.querySelector('#cursor');
      if (!cursor) {
        console.warn('[AframeViewer] Cursor not found');
        return;
      }

      console.log('[AframeViewer] ✓ Cursor element found, setting up raycaster tracking');

      // Track intersected elements using cursor's raycaster
      let lastIntersected = null;
      
      // Use A-Frame's tick function to continuously check raycaster intersections
      aScene.addEventListener('tick', () => {
        const raycaster = cursor.components?.raycaster;
        if (!raycaster || !raycaster.raycaster) return;

        // Check intersections manually
        const intersection = raycaster.getIntersection(hotspots[0]?.object3D?.parent);
        if (intersection) {
          // Find which hotspot we're looking at
          hotspots.forEach((hotspot: any) => {
            const hotspotObj = hotspot.object3D;
            if (hotspotObj) {
              // Check if this hotspot is in the intersection
              const intersectedObjects = raycaster.raycaster.intersectObject(hotspotObj, true);
              if (intersectedObjects.length > 0 && lastIntersected !== hotspot) {
                // Hovering over this hotspot
                lastIntersected = hotspot;
                const targetSceneId = hotspot.getAttribute('data-target-scene-id');
                const tooltipText = hotspot.getAttribute('data-tooltip-text');
                console.log('[AframeViewer] 🎯 Hovering over hotspot:', targetSceneId, tooltipText);
                
                const tooltip = document.getElementById('hotspot-tooltip');
                if (tooltip) {
                  tooltip.textContent = tooltipText || 'Navigate';
                  tooltip.style.display = 'block';
                }
              }
            }
          });
        } else if (lastIntersected) {
          // Not hovering over anything anymore
          console.log('[AframeViewer] No longer hovering');
          lastIntersected = null;
          const tooltip = document.getElementById('hotspot-tooltip');
          if (tooltip) {
            tooltip.style.display = 'none';
          }
        }
      });

      // Setup click handlers
      hotspots.forEach((hotspot: any) => {
        const targetSceneId = hotspot.getAttribute('data-target-scene-id');
        
        const handleHotspotClick = () => {
          console.log('[AframeViewer] Hotspot clicked:', targetSceneId);
          
          const fadeOverlay = document.getElementById('fade-overlay-gyro');
          if (fadeOverlay) {
            fadeOverlay.style.opacity = '1';
          }
          
          const targetIdx = scenes.findIndex((s) => s.id === targetSceneId);
          if (targetIdx >= 0) {
            setTimeout(() => {
              modeManager.setCurrentScene(targetIdx);
            }, 250);
          }
        };

        hotspot.addEventListener('click', handleHotspotClick);
        hotspot.addEventListener('fuse', handleHotspotClick);
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

      const { yaw: yawOffsetDeg, pitch: pitchOffsetDeg } = gyroOffsetsRef.current;

      const radBeta = (beta * Math.PI) / 180;
      const radAlpha = (alpha * Math.PI) / 180;

      const clampedBeta = Math.max(-Math.PI / 2.5, Math.min(Math.PI / 2.5, radBeta));

      camera.setAttribute('rotation', {
        x: THREE.MathUtils.radToDeg(clampedBeta) + pitchOffsetDeg,
        y: THREE.MathUtils.radToDeg(radAlpha) + yawOffsetDeg,
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

    const getViewportSize = () => {
      const vv = (window as any).visualViewport as VisualViewport | undefined;
      const width = Math.round((vv?.width ?? window.innerWidth) || 0);
      const height = Math.round((vv?.height ?? window.innerHeight) || 0);
      return {
        width: width > 0 ? width : window.innerWidth,
        height: height > 0 ? height : window.innerHeight,
      };
    };

    // Apply split-screen stereo CSS
    const style = document.createElement('style');
    style.id = 'vr-stereo-style';
    style.textContent = `
      html, body {
        margin: 0;
        padding: 0;
        overflow: hidden;
        width: 100%;
        height: 100%;
      }
      
      a-scene {
        position: fixed !important;
        inset: 0 !important;
        width: 100vw !important;
        height: 100vh !important;
        height: 100dvh !important;
      }
      
      canvas {
        position: fixed !important;
        inset: 0 !important;
        width: 100vw !important;
        height: 100vh !important;
        height: 100dvh !important;
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
        let { width: viewportWidth, height: viewportHeight } = getViewportSize();
        
        // Store original render function
        const originalRender = renderer.render.bind(renderer);
        
        // Override render to draw split-screen
        let frameCount = 0;
        renderer.render = function(scene: any, cam: any) {
          frameCount++;

          // Keep viewport in sync (orientation changes can otherwise leave gaps)
          ({ width: viewportWidth, height: viewportHeight } = getViewportSize());
          
          // Render left eye
          renderer.setViewport(0, 0, viewportWidth / 2, viewportHeight);
          renderer.setScissor(0, 0, viewportWidth / 2, viewportHeight);
          renderer.setScissorTest(true);
          cam.position.x = -0.032; // IPD offset for left eye
          originalRender(scene, cam);
          
          // Render right eye
          renderer.setViewport(viewportWidth / 2, 0, viewportWidth / 2, viewportHeight);
          renderer.setScissor(viewportWidth / 2, 0, viewportWidth / 2, viewportHeight);
          renderer.setScissorTest(true);
          cam.position.x = 0.032; // IPD offset for right eye
          originalRender(scene, cam);
          
          // Reset
          cam.position.x = 0;
          renderer.setScissorTest(false);
          renderer.setViewport(0, 0, viewportWidth, viewportHeight);
        };

        console.log('[AframeViewer] Stereo effect enabled');

        // Handle window resize
        const handleResize = () => {
          const { width: newWidth, height: newHeight } = getViewportSize();
          viewportWidth = newWidth;
          viewportHeight = newHeight;
          renderer.setSize(newWidth, newHeight);
        };
        window.addEventListener('resize', handleResize);
        (window as any).visualViewport?.addEventListener('resize', handleResize);

        // Initial size sync
        handleResize();
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
        backgroundColor: '#000000',
      }}
    >
      <style>{`
        .a-enter-vr, .a-enter-vr-button, .a-enter-ar-button {
          display: none !important;
        }
      `}</style>

      <div
        ref={sceneMountRef}
        style={{
          position: 'absolute',
          inset: 0,
        }}
      />

      {/* Center reticle (Gyro mode) */}
      {modeManager.mode === 'gyro' && (
        <div
          aria-hidden="true"
          style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 1200,
            pointerEvents: 'none',
            width: 18,
            height: 18,
            border: '2px solid rgba(0, 0, 0, 0.55)',
            borderRadius: '50%',
            boxShadow: 'inset 0 0 0 2px rgba(0, 0, 0, 0.15)',
            opacity: 1,
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: 3,
              height: 3,
              backgroundColor: 'rgba(0, 0, 0, 0.7)',
              borderRadius: '50%',
              boxShadow: '0 0 10px rgba(0, 0, 0, 0.2)',
            }}
          />
        </div>
      )}

      {/* VR Toggle (A-Frame) */}
      <button
        onClick={() => {
          const requestFullscreen = async (elem: Element) => {
            const anyElem = elem as any;
            try {
              if (anyElem.requestFullscreen) {
                await anyElem.requestFullscreen();
              } else if (anyElem.webkitRequestFullscreen) {
                anyElem.webkitRequestFullscreen();
              } else if (anyElem.mozRequestFullScreen) {
                anyElem.mozRequestFullScreen();
              } else if (anyElem.msRequestFullscreen) {
                anyElem.msRequestFullscreen();
              }
            } catch {
              // Ignore
            }
          };

          const exitFullscreen = async () => {
            const anyDoc = document as any;
            try {
              if (document.exitFullscreen) {
                await document.exitFullscreen();
              } else if (anyDoc.webkitExitFullscreen) {
                anyDoc.webkitExitFullscreen();
              } else if (anyDoc.mozCancelFullScreen) {
                anyDoc.mozCancelFullScreen();
              } else if (anyDoc.msExitFullscreen) {
                anyDoc.msExitFullscreen();
              }
            } catch {
              // Ignore
            }
          };

          const lockLandscape = async () => {
            try {
              if (screen.orientation && (screen.orientation as any).lock) {
                await (screen.orientation as any).lock('landscape');
              }
            } catch {
              // Ignore
            }
          };

          const unlockOrientation = () => {
            try {
              if (screen.orientation && (screen.orientation as any).unlock) {
                (screen.orientation as any).unlock();
              }
            } catch {
              // Ignore
            }
          };

          if (modeManager.mode === 'gyro') {
            // Do not allow switching directly from gyro to VR.
            // User must exit gyro back to normal first.
            modeManager.switchMode('normal');
            return;
          }

          if (modeManager.mode === 'vr') {
            unlockOrientation();
            void exitFullscreen();
            modeManager.switchMode(modeManager.capabilities.hasGyroscope ? 'gyro' : 'normal');
            return;
          }

          // Best-effort: fullscreen + lock orientation on user gesture
          void requestFullscreen(document.documentElement);
          void lockLandscape();
          modeManager.switchMode('vr');
        }}
        aria-label={modeManager.mode === 'vr' ? 'Exit VR' : modeManager.mode === 'gyro' ? 'Exit Gyro' : 'Enter VR'}
        style={{
          position: 'fixed',
          top: 'calc(20px + env(safe-area-inset-top))',
          right: 'calc(20px + env(safe-area-inset-right))',
          zIndex: 300,
          padding: '10px 14px',
          borderRadius: 4,
          background: GLASS_BG,
          color: UI_DARK,
          border: `2px solid ${UI_ACCENT}`,
          borderTop: 'none',
          borderLeft: 'none',
          cursor: 'pointer',
          fontSize: 13,
          fontWeight: 500,
          backdropFilter: 'blur(10px)',
          transition: 'all 0.2s ease',
          transform: 'scale(1)',
          pointerEvents: 'auto',
          whiteSpace: 'nowrap',
          fontFamily: 'monospace',
          minHeight: 38,
          display: modeManager.mode === 'vr' ? 'none' : 'inline-flex',
          alignItems: 'center',
          gap: 8,
          outline: 'none',
        }}
        onMouseEnter={(e) => {
          const el = e.currentTarget as HTMLButtonElement;
          el.style.background = GLASS_BG_HOVER;
          el.style.transform = 'scale(1.05)';
          const hoverSound = new Audio('/media/hover.mp3');
          hoverSound.volume = 0.3;
          hoverSound.play().catch(() => {});
        }}
        onMouseLeave={(e) => {
          const el = e.currentTarget as HTMLButtonElement;
          el.style.background = GLASS_BG;
          el.style.transform = 'scale(1)';
        }}
      >
        <span style={{ fontSize: 16 }}>⌂</span>
        <span>{modeManager.mode === 'vr' ? 'Exit VR' : modeManager.mode === 'gyro' ? 'Exit Gyro' : 'Enter VR'}</span>
      </button>

      {/* Tooltip for hotspot hover */}
      <div
        id="hotspot-tooltip"
        style={{
          position: 'fixed',
          background: 'rgba(242, 212, 194, 0.22)',
          color: '#000',
          padding: '8px 12px',
          borderRadius: 4,
          fontSize: 12,
          fontWeight: 600,
          pointerEvents: 'none',
          zIndex: 1000,
          display: 'none',
          whiteSpace: 'nowrap',
          backdropFilter: 'blur(10px)',
          border: '2px solid #000',
          borderTop: 'none',
          borderLeft: 'none',
          boxShadow: 'none',
          fontFamily: 'monospace',
        }}
      />

      {/* Logo */}
      <div
        className="ui-logo"
        style={{
          position: 'fixed',
          top: '-24px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 9999,
          pointerEvents: 'none',
        }}
      >
        <img
          src="/ui/kit.png"
          alt="Kit Logo"
          className="ui-logo-img"
          style={{
            height: '171px',
            width: 'auto',
            opacity: 0.8,
          }}
        />
      </div>

      {/* Loading Overlay - only for non-Gyro modes */}
      {isLoading && modeManager.mode !== 'gyro' && (
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
