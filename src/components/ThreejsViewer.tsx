import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useModeManager } from './ModeManager';
import { SceneDef } from '../data/scenes';

interface HotspotMesh extends THREE.Mesh {
  userData: {
    targetSceneId: string;
    isHotspot: boolean;
    text?: string;
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

  const loadScene = (index: number) => {
    if (!scenes || scenes.length === 0) return;
    index = ((index % scenes.length) + scenes.length) % scenes.length;

    const scene = scenes[index];

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
        addHotspot(hotspot.yaw, hotspot.pitch, hotspot.sceneId, {
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

    // Sprite
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0)';
      ctx.fillRect(0, 0, 256, 256);
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(128, 128, 100, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#000000';
      ctx.font = 'bold 48px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('→', 128, 128);
    }

    const texture = new THREE.CanvasTexture(canvas);
    const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
    const sprite = new THREE.Sprite(spriteMaterial);
    sprite.scale.set(size * 10, size * 10, 1);
    sprite.position.set(x, y, z);

    // Hit sphere
    const hitGeometry = new THREE.SphereGeometry(size * 15, 16, 16);
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

    hotspotGroupRef.current.add(sprite);
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

    for (const intersection of intersects) {
      const mesh = intersection.object as HotspotMesh;
      if (mesh.userData?.isHotspot) {
        const targetSceneId = mesh.userData.targetSceneId;
        const targetIdx = scenes.findIndex((s) => s.id === targetSceneId);
        if (targetIdx >= 0) {
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
      if (!inputRef.current.isMouseDown) {
        checkHotspotIntersection(e.clientX, e.clientY);
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

    const handleMouseLeave = () => {
      inputRef.current.isMouseDown = false;
      canvas.style.cursor = 'grab';
    };

    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('mouseleave', handleMouseLeave);
    canvas.style.cursor = 'grab';
    canvas.style.touchAction = 'none';

    return () => {
      canvas.removeEventListener('mousedown', handleMouseDown);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseup', handleMouseUp);
      canvas.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [scenes]);

  // Touch input
  useEffect(() => {
    const canvas = rendererRef.current?.domElement;
    if (!canvas) return;

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 0) return;
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

    const handleTouchEnd = () => {
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
  }, []);

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
    </div>
  );
}
