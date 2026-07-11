import React, { lazy, Suspense } from 'react';

import { useIsMobile } from './hooks/useMediaQuery';

const DesktopApp = lazy(() => import('./components/DesktopApp'));
const MobileApp = lazy(() => import('./mobile/MobileApp'));

// 端末判定後に必要な画面だけを読み込む
const App = () => {
  const isMobile = useIsMobile();
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-950" />}>
      {isMobile ? <MobileApp /> : <DesktopApp />}
    </Suspense>
  );
};

export default App;
