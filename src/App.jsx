import React from 'react';

import DesktopApp from './components/DesktopApp';
import { useIsMobile } from './hooks/useMediaQuery';
import MobileApp from './mobile/MobileApp';

// Main App component - routes between Desktop and Mobile
const App = () => {
  const isMobile = useIsMobile();
  return isMobile ? <MobileApp /> : <DesktopApp />;
};

export default App;
