# Hybrid Campus 360 Architecture Plan

## Overview
Create a unified application that intelligently switches between **Three.js** (for desktop/normal mode with superior X/Y-axis rotation) and **A-Frame** (for VR/Gyro mode) based on user interaction.

---

## Current State Analysis

### Three.js Implementation (Three/campus_3)
✅ **Strengths:**
- Perfect X-axis (yaw) and Y-axis (pitch) rotation handling
- Smooth mouse drag and touch swipe navigation
- Clean three.js scene management
- Good inertia/momentum for smooth motion
- Touch events properly handled

❌ **Weaknesses:**
- Poor WebXR VR support (half-implemented)
- Gyroscope integration is unreliable
- VR mode detection is ineffective

### A-Frame Implementation (Aframe/campus-360)
✅ **Strengths:**
- Excellent native VR support via WebXR
- Built-in gyroscope handling (device orientation)
- Native look-controls component
- Robust device orientation tracking
- Better mobile device compatibility for immersive modes

❌ **Weaknesses:**
- Y-axis rotation not working on desktop
- Touch swipes inconsistent on phones (only gets X-axis from look-controls)
- Manual Y-axis pitch handling is buggy

---

## Proposed Hybrid Architecture

### Core Strategy
```
User visits website
    ↓
[Normal Mode - Three.js]
- Desktop mouse drag → smooth XY rotation
- Mobile touch swipe → smooth XY rotation with inertia
- Full navigation control
    ↓
User clicks "Enter VR" or device detects auto-VR mode
    ↓
[Check Device Capabilities]
- Has WebXR support? → Switch to A-Frame VR
- Has Gyroscope? → Switch to A-Frame Gyro mode
- Fallback to Cardboard stereo mode
    ↓
[Immersive Mode - A-Frame]
- VR headset or Cardboard mode with gyroscope
- Excellent head-tracking and device orientation
    ↓
User clicks "Exit VR"
    ↓
[Back to Normal Mode - Three.js]
```

---

## Implementation Structure

### New Project Layout
```
campus/
├── Hybrid/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ModeManager.tsx          [NEW] - Detects mode & switches
│   │   │   ├── ThreejsViewer.tsx        [FROM Three/] - Desktop/normal mode
│   │   │   ├── AframeViewer.tsx         [FROM Aframe/] - VR/Gyro mode
│   │   │   └── ModeToggleUI.tsx         [NEW] - VR/Gyro buttons
│   │   ├── hooks/
│   │   │   ├── useVRDetection.ts        [NEW] - Detect VR capability
│   │   │   └── useDeviceMode.ts         [NEW] - Track current mode
│   │   ├── data/
│   │   │   └── scenes.ts                [SHARED]
│   │   ├── App.tsx                      [NEW] - Main orchestrator
│   │   ├── main.tsx
│   │   └── styles.css
│   ├── index.html
│   ├── vite.config.ts
│   ├── tsconfig.json
│   ├── package.json
│   └── public/
│       ├── panos/
│       └── ui/
```

---

## Key Components to Build

### 1. **ModeManager.tsx** (Orchestrator)
```typescript
- Manages state: 'normal' | 'vr' | 'gyro'
- Detects device capabilities (WebXR, Gyroscope, VR headset)
- Handles switching between Three.js and A-Frame renderers
- Shares panorama data between both viewers
- Manages scene transitions
```

### 2. **useVRDetection.ts** (Hook)
```typescript
- Checks for WebXR support: navigator.xr
- Checks for Gyroscope: DeviceOrientationEvent
- Detects VR headset presence
- iOS 13+ permission handling (requestPermission)
- Returns: { hasWebXR, hasGyro, canVR, isVRHeadsetConnected }
```

### 3. **useDeviceMode.ts** (Hook)
```typescript
- Tracks current viewing mode
- Listens for VR session start/end
- Handles auto-exit if device orientation changes
- Emits mode change callbacks
```

### 4. **ThreejsViewer.tsx**
- Copy from Three/campus_3/src/components/SceneViewer.tsx
- Extract as isolated component
- Remove VR code (use ModeManager instead)
- Keep all mouse/touch handling intact

### 5. **AframeViewer.tsx**
- Copy from Aframe/campus-360/src/components/SceneViewer.tsx
- Extract as isolated component
- Keep all A-Frame look-controls and VR handling
- Feed same scene data from ModeManager

### 6. **ModeToggleUI.tsx** (New Button UI)
```typescript
- "Enter VR" button - if WebXR available
- "Enable Gyro" button - if Device Orientation available
- Show current mode indicator
- Handle permission requests (iOS)
```

---

## Data Flow

```
ModeManager (State)
├── currentMode: 'normal' | 'vr' | 'gyro'
├── scenes: SceneDef[]
├── currentSceneIndex: number
├── capabilities: VRCapabilities
└── Passes to:
    ├── ThreejsViewer (if mode = 'normal')
    │   - Receives: scenes, currentIndex, callbacks for scene change
    │   - Provides: onSceneChange, onEnterVR, onEnterGyro
    │
    └── AframeViewer (if mode = 'vr' or 'gyro')
        - Receives: scenes, currentIndex, callbacks
        - Provides: onExitVR, onSceneChange
```

---

## State Transitions

```
[NORMAL] ←→ [VR]
↕           ↕
[GYRO] → [NORMAL]

Normal Mode:
- User clicks "Enter VR" → Switch to VR
- User enables gyroscope → Switch to Gyro (stays in A-Frame)

VR Mode:
- User clicks "Exit VR" → Back to Normal
- Device orientation detected → Stay in VR but switch A-Frame mode

Gyro Mode:
- User disables gyroscope → Back to Normal (if no VR headset)
- User clicks "Enter VR" → Switch to full VR in A-Frame
```

---

## Implementation Phases

### Phase 1: Setup & Data Sharing
1. Create new Hybrid project folder
2. Copy shared files (scenes.ts, public assets)
3. Create ModeManager and hooks
4. Ensure scene data flows correctly

### Phase 2: Extract & Integrate Three.js
1. Extract ThreejsViewer component
2. Remove VR-specific code
3. Integrate with ModeManager
4. Test normal mode (mouse, touch, navigation)

### Phase 3: Extract & Integrate A-Frame
1. Extract AframeViewer component
2. Connect to ModeManager for scene changes
3. Ensure VR/Gyro handlers intact
4. Test VR and Gyro modes

### Phase 4: Mode Switching & UI
1. Build ModeToggleUI with buttons
2. Implement VR capability detection
3. Handle iOS 13+ permission requests
4. Test transitions between modes

### Phase 5: Polish & Optimization
1. Shared state cleanup between modes
2. Transition animations
3. Mobile responsive UI
4. Cross-browser testing

---

## Technical Decisions

### State Management
- **Option 1: React Context** (Recommended)
  - Lightweight, built-in, no extra dependencies
  - Good for mode switching and scene data
  
- **Option 2: Zustand**
  - If state becomes complex

### Scene Data Sharing
- Same `scenes.ts` loaded in both viewers
- Shared `currentIndex` managed by ModeManager
- Both viewers receive immutable scene objects

### DOM Structure
```html
<div id="root">
  <ModeManager>
    {mode === 'normal' && <ThreejsViewer />}
    {(mode === 'vr' || mode === 'gyro') && <AframeViewer />}
    <ModeToggleUI />
  </ModeManager>
</div>
```

---

## Testing Strategy

### Normal Mode (Three.js)
- [ ] Mouse drag left/right → yaw rotation
- [ ] Mouse drag up/down → pitch rotation
- [ ] Touch swipe left/right → yaw rotation
- [ ] Touch swipe up/down → pitch rotation
- [ ] Touch inertia working
- [ ] Navigation buttons work
- [ ] Scene transitions smooth

### VR Mode (A-Frame)
- [ ] VR entry button appears (if WebXR available)
- [ ] VR mode activates and shows stereo view
- [ ] Headset tracking works
- [ ] Scene transitions in VR work
- [ ] Exit VR button functional

### Gyro Mode (A-Frame)
- [ ] Gyro button appears (if DeviceOrientationEvent available)
- [ ] iOS 13+ permission request works
- [ ] Device orientation updates camera
- [ ] Scene transitions with gyro enabled
- [ ] Can exit back to normal mode

### Transitions
- [ ] Normal → VR → Normal works
- [ ] Normal → Gyro → Normal works
- [ ] VR → Normal maintains scene position
- [ ] No viewer remnants left after switch

---

## Benefits of This Architecture

✅ **Users get best of both worlds:**
- Desktop: Three.js precision rotation
- Mobile VR: A-Frame's native WebXR support
- Gyro: Device orientation tracking

✅ **Maintainability:**
- Each viewer is independent component
- Clear separation of concerns
- Easy to swap or update individual viewers

✅ **Performance:**
- Only one renderer active at a time
- Efficient resource cleanup on mode switch
- Lazy loading of A-Frame only when needed

✅ **User Experience:**
- Seamless switching between modes
- Automatic capability detection
- No duplicate code/logic

---

## Potential Challenges & Solutions

| Challenge | Solution |
|-----------|----------|
| Hotspots in both viewers | Pass hotspots through ModeManager |
| Camera state persistence | Save yaw/pitch in ModeManager |
| Memory cleanup | Proper dispose() calls on viewer unmount |
| A-Frame load time | Lazy load with React.lazy() |
| iOS gyro permissions | Show permission request UI before enabling |
| Texture sharing | Use same TextureLoader references or preload |

---

## Next Steps

1. **Confirm this architecture meets your needs**
2. **Choose implementation timeline**
3. **Decide on state management library**
4. **Set up Hybrid project structure**
5. **Begin Phase 1 implementation**

Would you like me to proceed with implementing this architecture?
