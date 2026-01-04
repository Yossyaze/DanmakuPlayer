import { useEffect, useState } from 'react';

/**
 * Device types
 */
export const DeviceType = {
  PHONE: 'phone',
  TABLET: 'tablet',
  DESKTOP: 'desktop',
};

/**
 * Breakpoints for screen size detection
 */
const BREAKPOINTS = {
  PHONE_MAX_WIDTH: 768, // Phone: <= 768px
  TABLET_MAX_WIDTH: 1024, // Tablet: 769px - 1024px
  // Desktop: > 1024px
};

/**
 * Detect if device has touch capability
 */
const isTouchDevice = () => {
  if (typeof window === 'undefined') return false;
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
};

/**
 * Detect device type based on touch capability and screen size
 */
const detectDeviceType = () => {
  if (typeof window === 'undefined') return DeviceType.DESKTOP;

  const width = window.innerWidth;
  const height = window.innerHeight;
  const isTouch = isTouchDevice();
  const isPortrait = height > width;

  // Phone detection: Touch device with small screen or portrait orientation on small-medium screen
  if (
    isTouch &&
    (width <= BREAKPOINTS.PHONE_MAX_WIDTH || (isPortrait && width <= BREAKPOINTS.TABLET_MAX_WIDTH))
  ) {
    return DeviceType.PHONE;
  }

  // Tablet detection: Touch device with medium screen
  if (isTouch && width <= BREAKPOINTS.TABLET_MAX_WIDTH) {
    return DeviceType.TABLET;
  }

  // Large touch device (e.g., iPad Pro in landscape) -> treated as tablet
  if (isTouch && width > BREAKPOINTS.TABLET_MAX_WIDTH) {
    return DeviceType.TABLET;
  }

  // Non-touch device -> desktop
  return DeviceType.DESKTOP;
};

/**
 * Custom hook to detect device type
 * Returns: { deviceType, isPhone, isTablet, isDesktop, isTouch }
 */
export const useDeviceType = () => {
  const [deviceType, setDeviceType] = useState(() => detectDeviceType());
  const [isTouch, setIsTouch] = useState(() => isTouchDevice());

  useEffect(() => {
    const handleResize = () => {
      setDeviceType(detectDeviceType());
      setIsTouch(isTouchDevice());
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  return {
    deviceType,
    isPhone: deviceType === DeviceType.PHONE,
    isTablet: deviceType === DeviceType.TABLET,
    isDesktop: deviceType === DeviceType.DESKTOP,
    isTouch,
  };
};

/**
 * Legacy hook for backward compatibility
 * Returns true for phone (mobile) layout
 */
export const useIsMobile = () => {
  const { isPhone } = useDeviceType();
  return isPhone;
};

export default useIsMobile;
