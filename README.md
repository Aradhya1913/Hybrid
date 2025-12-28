# Hybrid Campus 360 Viewer

> A hybrid panoramic viewer combining Three.js for smooth desktop navigation with A-Frame for immersive VR/Gyro experiences.

## Features

- **Normal Mode**: Three.js-based viewer with smooth X/Y-axis rotation for desktop and mobile browsers
- **VR Mode**: A-Frame WebXR support for immersive VR headsets and Cardboard
- **Gyro Mode**: Device orientation tracking for mobile gyroscope-enabled viewing
- **Seamless Switching**: Intelligently switch between modes based on capabilities

## Running Locally

```bash
npm install
npm run dev
```

Visit `http://localhost:5173`

## Building

```bash
npm run build
npm run preview
```

## Project Structure

```
src/
├── components/
│   ├── ModeManager.tsx         # State management & orchestration
│   ├── ThreejsViewer.tsx       # Normal mode renderer
│   ├── AframeViewer.tsx        # VR/Gyro mode renderer
│   └── ModeToggleUI.tsx        # UI controls
├── hooks/
│   ├── useVRDetection.ts       # Capability detection
│   └── useDeviceMode.ts        # Mode state tracking
├── data/
│   └── scenes.ts               # Scene definitions
├── App.tsx                     # Main app
└── main.tsx                    # Entry point
```

## How It Works

1. **Capability Detection**: On load, detects WebXR and Gyroscope support
2. **Default to Three.js**: Starts in normal mode for best desktop experience
3. **Mode Switching**: Users can toggle VR or Gyro modes via UI buttons
4. **Automatic Switching**: Can be configured to auto-switch on VR headset detection
5. **Shared State**: Scene data and index managed centrally through ModeManager

## Development Notes

- **Normal Mode**: Full X/Y-axis control with smooth mouse drag and touch swipe
- **VR Mode**: WebXR session management with headset tracking
- **Gyro Mode**: Device orientation API with iOS 13+ permission handling
- **Hotspots**: Scene navigation points rendered differently in each mode
