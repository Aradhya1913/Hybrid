import { useEffect, useState } from 'react';

export type VRCapabilities = {
  hasWebXR: boolean;
  hasGyroscope: boolean;
  canRequestPermission: boolean; // iOS 13+
  isVRHeadsetConnected: boolean;
};

export function useVRDetection() {
  const [capabilities, setCapabilities] = useState<VRCapabilities>({
    hasWebXR: false,
    hasGyroscope: false,
    canRequestPermission: false,
    isVRHeadsetConnected: false,
  });

  useEffect(() => {
    const detect = async () => {
      // Check WebXR
      const hasWebXR = !!(navigator as any).xr;

      // Check Gyroscope / Device Orientation
      const hasGyroscope =
        typeof DeviceOrientationEvent !== 'undefined' &&
        (window as any).DeviceOrientationEvent !== undefined;

      // Check for iOS 13+ requestPermission method
      const canRequestPermission =
        typeof DeviceOrientationEvent !== 'undefined' &&
        (DeviceOrientationEvent as any).requestPermission !== undefined;

      // Try to detect VR headset (simplified check)
      let isVRHeadsetConnected = false;
      if (hasWebXR) {
        try {
          const supported = await (navigator as any).xr?.isSessionSupported?.('immersive-vr');
          isVRHeadsetConnected = supported === true;
        } catch (e) {
          console.warn('[VR Detection] WebXR check failed:', e);
        }
      }

      setCapabilities({
        hasWebXR,
        hasGyroscope,
        canRequestPermission,
        isVRHeadsetConnected,
      });
    };

    detect();
  }, []);

  return capabilities;
}
