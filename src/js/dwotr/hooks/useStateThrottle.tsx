import { useState, useEffect, useRef } from 'react';

const useStateThrottle = (initialValue: any, interval = 1000) => {
  const [state, setState] = useState(initialValue);
  const lastUpdate = useRef(0);
  const latestValue = useRef(initialValue);

  useEffect(() => {
    const timer = setInterval(() => {
      if (Date.now() - lastUpdate.current >= interval) {
        // if (typeof latestValue.current === 'function') {
        //   setState((prevState) => latestValue.current(prevState));
        // } else {
          setState(latestValue.current);
        //}
        lastUpdate.current = Date.now();
      }
    }, interval);

    return () => {
      clearInterval(timer);
    };
  }, [interval]);

  const setThrottledState = (newValue: any) => {
    if (typeof latestValue.current === 'function') {
      latestValue.current = latestValue.current(latestValue.current);
    } else {
      latestValue.current = newValue;
    }
  };

  return [state, setThrottledState];
};

export default useStateThrottle;
