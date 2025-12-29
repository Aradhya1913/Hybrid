import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { useModeManager } from './ModeManager';
import { SceneDef } from '../data/scenes';

interface HotspotMesh extends THREE.Mesh {
  userData: {
    targetSceneId: string;
    isHotspot: boolean;
    text?: string;
    sprite?: THREE.Sprite;
    originalScale?: { x: number; y: number };
    isHovered?: boolean;
    animationTime?: number;
  };
}

interface PanoramaState {
  yaw: number;
  pitch: number;
}

export function ThreejsViewer({ scenes }: { scenes: SceneDef[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sphereRef = useRef<THREE.Mesh | null>(null);
  const hotspotGroupRef = useRef<THREE.Group | null>(null);
  const raycasterRef = useRef<THREE.Raycaster>(new THREE.Raycaster());
  const mouseRef = useRef<THREE.Vector2>(new THREE.Vector2());
  const textureLoaderRef = useRef<THREE.TextureLoader>(new THREE.TextureLoader());

  const modeManager = useModeManager();

  const stateRef = useRef<PanoramaState>({
    yaw: 0,
    pitch: 0,
  });

  const inputRef = useRef({
    isMouseDown: false,
    lastMouseX: 0,
    lastMouseY: 0,
    isTouching: false,
    lastTouchX: 0,
    lastTouchY: 0,
    touchVelocityX: 0,
    touchVelocityY: 0,
  });

  const animationRef = useRef({
    time: 0,
    deltaTime: 0,
    lastTime: Date.now(),
  });

  // Initialize Three.js scene
  useEffect(() => {
    if (!containerRef.current) return;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      10000
    );
    camera.position.set(0, 0, 0);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.NoToneMapping;
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Panorama sphere
    const geometry = new THREE.SphereGeometry(500, 64, 64);
    const material = new THREE.MeshBasicMaterial({
      side: THREE.BackSide,
      toneMapped: false,
    });
    const sphere = new THREE.Mesh(geometry, material);
    sphere.scale.x = -1;
    scene.add(sphere);
    sphereRef.current = sphere;

    // Hotspot container
    const hotspotGroup = new THREE.Group();
    scene.add(hotspotGroup);
    hotspotGroupRef.current = hotspotGroup;

    // Handle resize
    const handleResize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };
    window.addEventListener('resize', handleResize);

    // Load initial scene
    loadScene(modeManager.currentSceneIndex);

    // Animation loop with inertia
    let animationId: number;
    const animate = () => {
      animationId = requestAnimationFrame(animate);

      // Update animation time
      const now = Date.now();
      animationRef.current.deltaTime = (now - animationRef.current.lastTime) / 1000;
      animationRef.current.lastTime = now;
      animationRef.current.time += animationRef.current.deltaTime;

      // Check for hotspot hover
      if (cameraRef.current && rendererRef.current && hotspotGroupRef.current) {
        const rect = rendererRef.current.domElement.getBoundingClientRect();
        // Get current mouse position (using last known position)
        raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current);
        const intersects = raycasterRef.current.intersectObjects(hotspotGroupRef.current.children);
        
        // Reset all hotspots
        for (const child of hotspotGroupRef.current.children) {
          const mesh = child as HotspotMesh;
          if (mesh.userData?.sprite && mesh.userData?.originalScale) {
            mesh.userData.isHovered = false;
            
            // Add idle pulsing animation (subtle)
            const pulse = 1 + Math.sin(animationRef.current.time * 3.0) * 0.04;
            const originalScale = mesh.userData.originalScale;
            mesh.userData.sprite.scale.set(
              originalScale.x * pulse,
              originalScale.y * pulse,
              1
            );
            (mesh.userData.sprite.material as THREE.SpriteMaterial).opacity = 0.9 + Math.sin(animationRef.current.time * 2) * 0.1;
          }
        }
        
        // Highlight hovered hotspot
        for (const intersection of intersects) {
          const mesh = intersection.object as HotspotMesh;
          if (mesh.userData?.isHotspot && mesh.userData?.sprite) {
            mesh.userData.isHovered = true;
            const originalScale = mesh.userData.originalScale!;
            const hoverScale = {
              x: originalScale.x * 1.4,
              y: originalScale.y * 1.4,
            };
            mesh.userData.sprite.scale.lerp(new THREE.Vector3(hoverScale.x, hoverScale.y, 1), 0.2);
            (mesh.userData.sprite.material as THREE.SpriteMaterial).opacity = 1;
            rendererRef.current.domElement.style.cursor = 'pointer';
            break;
          }
        }
        
        // Reset cursor if no hotspot hovered
        if (intersects.length === 0) {
          rendererRef.current.domElement.style.cursor = inputRef.current.isMouseDown ? 'grabbing' : 'grab';
        }
      }

      // Apply inertia
      if (inputRef.current.isTouching) {
        inputRef.current.touchVelocityX *= 0.95;
        inputRef.current.touchVelocityY *= 0.95;

        stateRef.current.yaw += inputRef.current.touchVelocityX * 0.5;
        stateRef.current.pitch += inputRef.current.touchVelocityY * 0.5;
      }

      // Clamp pitch
      stateRef.current.pitch = Math.max(-85, Math.min(85, stateRef.current.pitch));

      // Update camera
      camera.rotation.order = 'YXZ';
      camera.rotation.y = (stateRef.current.yaw * Math.PI) / 180;
      camera.rotation.x = (stateRef.current.pitch * Math.PI) / 180;

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      geometry.dispose();
      material.dispose();
      containerRef.current?.removeChild(renderer.domElement);
    };
  }, []);

  const [currentTitle, setCurrentTitle] = React.useState(scenes[0]?.title || '');

  const loadScene = (index: number) => {
    if (!scenes || scenes.length === 0) return;
    index = ((index % scenes.length) + scenes.length) % scenes.length;

    const scene = scenes[index];
    setCurrentTitle(scene.title);

    // Load texture
    textureLoaderRef.current.load(
      scene.url,
      (texture) => {
        texture.colorSpace = THREE.SRGBColorSpace;
        if (sphereRef.current && sphereRef.current.material instanceof THREE.MeshBasicMaterial) {
          sphereRef.current.material.map = texture;
          sphereRef.current.material.needsUpdate = true;
        }
      },
      undefined,
      (error) => {
        console.error('[ThreejsViewer] Failed to load:', scene.url, error);
      }
    );

    // Hotspots
    clearHotspots();
    if (Array.isArray(scene.hotSpots) && scene.hotSpots.length > 0) {
      scene.hotSpots.forEach((hotspot) => {
        addHotspot(hotspot.yaw, hotspot.pitch, hotspot.targetSceneId, {
          size: 0.7,
          text: hotspot.text,
        });
      });
    } else {
      const nextIdx = (index + 1) % scenes.length;
      addHotspot(0, 0, scenes[nextIdx].id, { size: 0.6 });
    }
  };

  const clearHotspots = () => {
    if (!hotspotGroupRef.current) return;
    while (hotspotGroupRef.current.children.length > 0) {
      const child = hotspotGroupRef.current.children[0];
      hotspotGroupRef.current.remove(child);
    }
  };

  const addHotspot = (
    yawDeg: number,
    pitchDeg: number,
    targetSceneId: string,
    opts?: { size?: number; text?: string }
  ) => {
    if (!hotspotGroupRef.current || !sceneRef.current) return;

    const size = opts?.size ?? 0.7;
    const yaw = (yawDeg * Math.PI) / 180;
    const pitch = (pitchDeg * Math.PI) / 180;
    const radius = 450;

    const x = radius * Math.cos(pitch) * Math.sin(yaw);
    const y = radius * Math.sin(pitch);
    const z = radius * Math.cos(pitch) * Math.cos(yaw);

    // Load arrow.png texture with proper aspect ratio
    const arrowPath = '/ui/arrow.png';
    
    // Load image to get dimensions
    const img = new Image();
    img.onload = () => {
      textureLoaderRef.current.load(
        arrowPath,
        (texture) => {
          // Ensure proper color space and filtering
          texture.colorSpace = THREE.SRGBColorSpace;
          texture.magFilter = THREE.NearestFilter;
          texture.minFilter = THREE.NearestFilter;
          texture.generateMipmaps = false;
          
          const aspectRatio = img.width / img.height;
          const baseSize = 70;
          
          const spriteMaterial = new THREE.SpriteMaterial({
            map: texture,
            sizeAttenuation: true,
            transparent: true,
            alphaTest: 0.01,
            depthTest: false,
            depthWrite: false,
          });
          const sprite = new THREE.Sprite(spriteMaterial);
          const originalScaleX = baseSize * aspectRatio;
          const originalScaleY = baseSize;
          sprite.scale.set(originalScaleX, originalScaleY, 1);
          sprite.position.set(x, y, z);
          sprite.renderOrder = 1000;
          
          hotspotGroupRef.current?.add(sprite);
          
          // Store sprite reference in the hit sphere for hover effects
          if (hotspotGroupRef.current) {
            for (const child of hotspotGroupRef.current.children) {
              const mesh = child as HotspotMesh;
              if (mesh.userData?.targetSceneId === targetSceneId && Math.abs(mesh.position.x - hitSphere.position.x) < 1 && Math.abs(mesh.position.y - hitSphere.position.y) < 1) {
                mesh.userData.sprite = sprite;
                mesh.userData.originalScale = { x: originalScaleX, y: originalScaleY };
                mesh.userData.animationTime = 0;
                break;
              }
            }
          }
          
          console.log('[ThreejsViewer] Arrow sprite added with aspect ratio', aspectRatio);
        },
        undefined,
        (error) => {
          console.error('[ThreejsViewer] Failed to load arrow texture:', error);
        }
      );
    };
    img.onerror = () => console.error('[ThreejsViewer] Failed to load image for dimensions');
    img.src = arrowPath;

    // Hit sphere for clicking
    const hitGeometry = new THREE.SphereGeometry(size * 20, 16, 16); // Larger hit area
    const hitMaterial = new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0,
    });
    const hitSphere = new THREE.Mesh(hitGeometry, hitMaterial);
    hitSphere.position.set(x, y, z);
    (hitSphere as HotspotMesh).userData = {
      targetSceneId,
      isHotspot: true,
      text: opts?.text,
    };

    hotspotGroupRef.current.add(hitSphere);
  };

  const checkHotspotIntersection = (clientX: number, clientY: number) => {
    if (!cameraRef.current || !rendererRef.current) return;

    const rect = rendererRef.current.domElement.getBoundingClientRect();
    mouseRef.current.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    mouseRef.current.y = -((clientY - rect.top) / rect.height) * 2 + 1;

    raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current);

    if (!hotspotGroupRef.current) return;
    const intersects = raycasterRef.current.intersectObjects(hotspotGroupRef.current.children);

    console.log('[ThreejsViewer] Raycast check - intersections:', intersects.length);

    for (const intersection of intersects) {
      const mesh = intersection.object as HotspotMesh;
      if (mesh.userData?.isHotspot) {
        const targetSceneId = mesh.userData.targetSceneId;
        console.log('[ThreejsViewer] Hit hotspot:', targetSceneId);
        const targetIdx = scenes.findIndex((s) => s.id === targetSceneId);
        if (targetIdx >= 0) {
          console.log('[ThreejsViewer] Found scene index:', targetIdx);
          // Click feedback animation
          if (mesh.userData?.sprite && mesh.userData?.originalScale) {
            const sprite = mesh.userData.sprite;
            const originalScale = mesh.userData.originalScale;
            
            // Pulse animation on click
            const startScale = new THREE.Vector3(
              originalScale.x * 1.3,
              originalScale.y * 1.3,
              1
            );
            sprite.scale.copy(startScale);
            
            // Animate back to original after click
            let clickAnimationTime = 0;
            const clickAnimationDuration = 300; // ms
            const animateClick = () => {
              clickAnimationTime += 16;
              const progress = Math.min(clickAnimationTime / clickAnimationDuration, 1);
              const easeOut = 1 - Math.pow(1 - progress, 3);
              
              sprite.scale.copy(originalScale).multiplyScalar(1 + (0.3 * (1 - easeOut)));
              
              if (progress < 1) {
                requestAnimationFrame(animateClick);
              }
            };
            animateClick();
          }
          
          console.log('[ThreejsViewer] Navigating to scene:', targetIdx);
          modeManager.setCurrentScene(targetIdx);
          return;
        }
      }
    }
  };

  // Listen for scene changes from ModeManager
  useEffect(() => {
    const handleSceneChange = (e: Event) => {
      const event = e as CustomEvent;
      loadScene(event.detail.index);
    };
    window.addEventListener('scene-changed', handleSceneChange);
    return () => {
      window.removeEventListener('scene-changed', handleSceneChange);
    };
  }, []);

  // Mouse input
  useEffect(() => {
    const canvas = rendererRef.current?.domElement;
    if (!canvas) return;

    const handleMouseDown = (e: MouseEvent) => {
      inputRef.current.isMouseDown = true;
      inputRef.current.lastMouseX = e.clientX;
      inputRef.current.lastMouseY = e.clientY;
      canvas.style.cursor = 'grabbing';
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!rendererRef.current) return;
      
      const rect = rendererRef.current.domElement.getBoundingClientRect();
      mouseRef.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouseRef.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      
      if (!inputRef.current.isMouseDown) {
        // Only check for hotspot hover, don't trigger click
        return;
      }

      const deltaX = e.clientX - inputRef.current.lastMouseX;
      const deltaY = e.clientY - inputRef.current.lastMouseY;

      stateRef.current.yaw += deltaX * 0.5;
      stateRef.current.pitch += deltaY * 0.5;
      stateRef.current.pitch = Math.max(-85, Math.min(85, stateRef.current.pitch));

      inputRef.current.lastMouseX = e.clientX;
      inputRef.current.lastMouseY = e.clientY;
    };

    const handleMouseUp = () => {
      inputRef.current.isMouseDown = false;
      canvas.style.cursor = 'grab';
    };

    const handleClick = (e: MouseEvent) => {
      // Only trigger hotspot on click, not on move
      // Check if click is near center of screen (within ~100px radius)
      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight / 2;
      const distance = Math.hypot(e.clientX - centerX, e.clientY - centerY);
      
      console.log('[ThreejsViewer] Click event - distance from center:', distance);
      
      // Only allow clicks within ~150px of center to mimic the ring area
      if (distance < 150) {
        console.log('[ThreejsViewer] Click within center area, checking hotspots');
        checkHotspotIntersection(e.clientX, e.clientY);
      } else {
        console.log('[ThreejsViewer] Click too far from center, ignoring');
      }
    };

    const handleMouseLeave = () => {
      inputRef.current.isMouseDown = false;
      canvas.style.cursor = 'grab';
    };

    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('click', handleClick);
    canvas.addEventListener('mouseleave', handleMouseLeave);
    canvas.style.cursor = 'grab';
    canvas.style.touchAction = 'none';

    return () => {
      canvas.removeEventListener('mousedown', handleMouseDown);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseup', handleMouseUp);
      canvas.removeEventListener('click', handleClick);
      canvas.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [scenes]);

  // Touch input
  useEffect(() => {
    const canvas = rendererRef.current?.domElement;
    if (!canvas) return;

    let touchStartTime = 0;
    let touchStartX = 0;
    let touchStartY = 0;

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 0) return;
      touchStartTime = Date.now();
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
      inputRef.current.isTouching = true;
      inputRef.current.lastTouchX = e.touches[0].clientX;
      inputRef.current.lastTouchY = e.touches[0].clientY;
      inputRef.current.touchVelocityX = 0;
      inputRef.current.touchVelocityY = 0;
      e.preventDefault();
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!inputRef.current.isTouching || e.touches.length === 0) return;
      e.preventDefault();

      const currentX = e.touches[0].clientX;
      const currentY = e.touches[0].clientY;
      const deltaX = currentX - inputRef.current.lastTouchX;
      const deltaY = currentY - inputRef.current.lastTouchY;

      inputRef.current.touchVelocityX = deltaX;
      inputRef.current.touchVelocityY = deltaY;

      stateRef.current.yaw += deltaX * 0.05;
      stateRef.current.pitch += deltaY * 0.05;
      stateRef.current.pitch = Math.max(-85, Math.min(85, stateRef.current.pitch));

      inputRef.current.lastTouchX = currentX;
      inputRef.current.lastTouchY = currentY;
    };

    const handleTouchEnd = (e: TouchEvent) => {
      const touchDuration = Date.now() - touchStartTime;
      const touchDistance = Math.hypot(
        e.changedTouches[0].clientX - touchStartX,
        e.changedTouches[0].clientY - touchStartY
      );

      console.log('[ThreejsViewer] Touch end - duration:', touchDuration, 'distance:', touchDistance);

      // If it's a quick tap (< 200ms) with minimal movement (< 10px), treat it as a click
      if (touchDuration < 200 && touchDistance < 10) {
        // Also check if tap is near center of screen (within ~150px)
        const centerX = window.innerWidth / 2;
        const centerY = window.innerHeight / 2;
        const distanceFromCenter = Math.hypot(
          e.changedTouches[0].clientX - centerX,
          e.changedTouches[0].clientY - centerY
        );
        
        console.log('[ThreejsViewer] Detected tap - distance from center:', distanceFromCenter);
        
        if (distanceFromCenter < 150) {
          console.log('[ThreejsViewer] Detected tap click at center');
          checkHotspotIntersection(e.changedTouches[0].clientX, e.changedTouches[0].clientY);
        } else {
          console.log('[ThreejsViewer] Tap too far from center, ignoring');
        }
      }

      inputRef.current.isTouching = false;
    };

    const handleTouchCancel = () => {
      inputRef.current.isTouching = false;
    };

    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd, { passive: false });
    canvas.addEventListener('touchcancel', handleTouchCancel, { passive: false });

    return () => {
      canvas.removeEventListener('touchstart', handleTouchStart);
      canvas.removeEventListener('touchmove', handleTouchMove);
      canvas.removeEventListener('touchend', handleTouchEnd);
      canvas.removeEventListener('touchcancel', handleTouchCancel);
    };
  }, [scenes]);

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        pointerEvents: 'auto',
        touchAction: 'none',
      }}
    >
      {/* Logo */}
      <div
        style={{
          position: 'absolute',
          top: 20,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 100,
          pointerEvents: 'none',
        }}
      >
        <img
          src="/ui/kit.png"
          alt="Kit Logo"
          style={{
            height: '120px',
            width: 'auto',
            opacity: 0.8,
          }}
        />
      </div>

      {/* Nav buttons */}
      <button
        onClick={() => modeManager.goToPreviousScene()}
        style={{
          position: 'absolute',
          left: 16,
          top: '50%',
          transform: 'translateY(-50%)',
          zIndex: 200,
          width: 48,
          height: 48,
          borderRadius: 12,
          background: 'rgba(255,255,255,0.1)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255,255,255,0.2)',
          color: '#fff',
          pointerEvents: 'auto',
          cursor: 'pointer',
          fontSize: 18,
          fontWeight: 'bold',
        }}
      >
        ‹
      </button>

      <button
        onClick={() => modeManager.goToNextScene()}
        style={{
          position: 'absolute',
          right: 16,
          top: '50%',
          transform: 'translateY(-50%)',
          zIndex: 200,
          width: 48,
          height: 48,
          borderRadius: 12,
          background: 'rgba(255,255,255,0.1)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255,255,255,0.2)',
          color: '#fff',
          pointerEvents: 'auto',
          cursor: 'pointer',
          fontSize: 18,
          fontWeight: 'bold',
        }}
      >
        ›
      </button>

      {/* Scene Title Display */}
      <div
        style={{
          position: 'absolute',
          bottom: 20,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 150,
          background: 'rgba(0, 0, 0, 0.6)',
          backdropFilter: 'blur(10px)',
          padding: '10px 20px',
          borderRadius: 8,
          color: '#fff',
          fontSize: 14,
          fontWeight: 600,
          border: '1px solid rgba(255, 255, 255, 0.2)',
          pointerEvents: 'none',
        }}
      >
        {currentTitle}
      </div>

      {/* Center Cursor Ring for Click Detection */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 100,
          pointerEvents: 'none',
          width: 60,
          height: 60,
          border: '3px solid rgba(255, 255, 255, 0)',
          borderRadius: '50%',
          boxShadow: 'inset 0 0 0 2px rgba(100, 200, 255, 0)',
          opacity: 0,
          visibility: 'hidden',
        }}
      >
        {/* Inner dot */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 8,
            height: 8,
            backgroundColor: 'rgba(100, 200, 255, 0)',
            borderRadius: '50%',
            boxShadow: '0 0 10px rgba(100, 200, 255, 0)',
          }}
        />
      </div>
    </div>
  );
}
