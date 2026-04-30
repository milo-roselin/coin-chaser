// Mobile fullscreen utility functions
export const isMobileDevice = (): boolean => {
  return window.innerWidth <= 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

export const requestFullscreen = (): Promise<void> => {
  if (!isMobileDevice()) return Promise.resolve();

  const element = document.documentElement;
  
  try {
    if (element.requestFullscreen) {
      return element.requestFullscreen().catch((error) => {
        console.log('Fullscreen request failed:', error);
        return Promise.resolve();
      });
    } else if ((element as any).webkitRequestFullscreen) {
      const promise = (element as any).webkitRequestFullscreen();
      return promise ? promise.catch((error: any) => {
        console.log('Webkit fullscreen request failed:', error);
        return Promise.resolve();
      }) : Promise.resolve();
    } else if ((element as any).mozRequestFullScreen) {
      const promise = (element as any).mozRequestFullScreen();
      return promise ? promise.catch((error: any) => {
        console.log('Firefox fullscreen request failed:', error);
        return Promise.resolve();
      }) : Promise.resolve();
    } else if ((element as any).msRequestFullscreen) {
      const promise = (element as any).msRequestFullscreen();
      return promise ? promise.catch((error: any) => {
        console.log('IE fullscreen request failed:', error);
        return Promise.resolve();
      }) : Promise.resolve();
    }
  } catch (error) {
    console.log('Fullscreen request failed:', error);
  }
  return Promise.resolve();
};

export const exitFullscreen = (): Promise<void> => {
  try {
    if (document.exitFullscreen) {
      return document.exitFullscreen().catch((error) => {
        console.log('Exit fullscreen failed:', error);
        return Promise.resolve();
      });
    } else if ((document as any).webkitExitFullscreen) {
      const promise = (document as any).webkitExitFullscreen();
      return promise ? promise.catch((error: any) => {
        console.log('Webkit exit fullscreen failed:', error);
        return Promise.resolve();
      }) : Promise.resolve();
    } else if ((document as any).mozCancelFullScreen) {
      const promise = (document as any).mozCancelFullScreen();
      return promise ? promise.catch((error: any) => {
        console.log('Firefox exit fullscreen failed:', error);
        return Promise.resolve();
      }) : Promise.resolve();
    } else if ((document as any).msExitFullscreen) {
      const promise = (document as any).msExitFullscreen();
      return promise ? promise.catch((error: any) => {
        console.log('IE exit fullscreen failed:', error);
        return Promise.resolve();
      }) : Promise.resolve();
    }
  } catch (error) {
    console.log('Exit fullscreen failed:', error);
  }
  return Promise.resolve();
};

export const isFullscreen = (): boolean => {
  return !!(
    document.fullscreenElement ||
    (document as any).webkitFullscreenElement ||
    (document as any).mozFullScreenElement ||
    (document as any).msFullscreenElement
  );
};

export const initializeMobileFullscreen = (): void => {
  if (!isMobileDevice()) return;

  // Apply mobile fullscreen class to body
  document.body.classList.add('mobile-fullscreen');
  
  // Set viewport meta for better mobile experience
  let viewport = document.querySelector('meta[name=viewport]');
  if (viewport) {
    viewport.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover');
  }

  // Auto-request fullscreen on first user interaction
  const autoRequestFullscreen = () => {
    if (!isFullscreen()) {
      requestFullscreen().catch(() => {
        // Silently handle fullscreen request failures
      });
    }
    // Remove listener after first interaction
    document.removeEventListener('touchstart', autoRequestFullscreen);
    document.removeEventListener('click', autoRequestFullscreen);
  };

  document.addEventListener('touchstart', autoRequestFullscreen, { once: true });
  document.addEventListener('click', autoRequestFullscreen, { once: true });

  // Handle orientation and resize changes
  const handleViewportChange = () => {
    setTimeout(() => {
      // Re-apply mobile fullscreen styles
      document.body.classList.add('mobile-fullscreen');
      
      // Try to maintain fullscreen
      if (!isFullscreen()) {
        requestFullscreen().catch(() => {
          // Silently handle fullscreen request failures
        });
      }
      
      // Force viewport height update for iOS
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
    }, 100);
  };

  // Listen for viewport changes
  window.addEventListener('orientationchange', handleViewportChange);
  window.addEventListener('resize', handleViewportChange);

  // Initial viewport height calculation
  const vh = window.innerHeight * 0.01;
  document.documentElement.style.setProperty('--vh', `${vh}px`);

  // Prevent scrolling and zooming
  document.addEventListener('touchmove', (e) => {
    if (e.target === document.body || e.target === document.documentElement) {
      e.preventDefault();
    }
  }, { passive: false });

  document.addEventListener('gesturestart', (e) => {
    e.preventDefault();
  });

  document.addEventListener('gesturechange', (e) => {
    e.preventDefault();
  });

  document.addEventListener('gestureend', (e) => {
    e.preventDefault();
  });
};