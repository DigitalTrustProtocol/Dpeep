import { useState, useRef, useEffect } from 'react';

function useScrollDetection<T extends HTMLElement>(): [React.RefObject<T>, boolean] {
  const ref = useRef<T>(null);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (ref.current) {
        const isContentScrolled = ref.current.scrollTop > 0;
        setIsScrolled(isContentScrolled);
      }
    };

    if (ref.current) {
      ref.current.addEventListener('scroll', handleScroll);
    }

    return () => {
      if (ref.current) {
        ref.current.removeEventListener('scroll', handleScroll);
      }
    };
  }, [ref]);

  return [ref, isScrolled];
}

export default useScrollDetection;
