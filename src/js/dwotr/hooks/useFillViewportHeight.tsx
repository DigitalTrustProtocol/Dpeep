import { useEffect, useState, useRef } from 'react';

/**
 * Custom hook that adjusts an element's height to fill the viewport.
 */
function useFillViewportHeight<T extends HTMLElement>(): [React.RefObject<T>, string] {
  const ref = useRef<T>(null);
  const [height, setHeight] = useState<string>('auto');

  useEffect(() => {
    const handleResize = () => {
      if (!ref.current) return;
        const elementTop = ref.current.offsetTop;
        const newHeight = window.innerHeight - elementTop;
        setHeight(`${newHeight}px`);
    }

    // Initial call to set height
    handleResize();

    // Add the event listener
    window.addEventListener('resize', handleResize);

    // Cleanup on unmount
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return [ref, height];
}

export default useFillViewportHeight;