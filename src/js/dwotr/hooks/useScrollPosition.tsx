import { useState, useEffect } from 'react';
import debounce from 'lodash/debounce';

// let isInitialLoad = true;
// const listener = function () {
//   isInitialLoad = false;
//   window.removeEventListener('popstate', listener);
// };
// window.addEventListener('popstate', listener);

export function useScrollYPosition() {
  const [positionY, setScrollYPosition] = useState<number>(window.scrollY);

  useEffect(() => {
     const restoreScrollPosition = () => {
      const currentHistoryState = window.history.state;
      const position = currentHistoryState?.scrollPosition || 0;
      setScrollYPosition(position);
    };

    restoreScrollPosition();

    // if (!isInitialLoad) {
    //   restoreScrollPosition();
    // } else {
    //   isInitialLoad = false;
    // }

    const saveScrollPosition = debounce(() => {
      const position = window.scrollY || document.documentElement.scrollTop;
      const currentHistoryState = window.history.state;
      const newHistoryState = {
        ...currentHistoryState,
        scrollPosition: position,
      };
      window.history.replaceState(newHistoryState, '');
    }, 100);

    window.addEventListener('scroll', saveScrollPosition);

    return () => {
      window.removeEventListener('scroll', saveScrollPosition);
    };
  }, []);

  return positionY;
}

// export function useScrollXPosition(): number {
//   const { x } = useScrollPosition();
//   return x;
// }

// export function useScrollYPosition(): number {
//   const { y } = useScrollPosition();
//   return y;
// }

// import debounce from 'lodash/debounce';
// import { useEffect } from 'preact/hooks';

// let isInitialLoad = true;
// const listener = function () {
//   isInitialLoad = false;
//   window.removeEventListener('popstate', listener);
// };
// window.addEventListener('popstate', listener);

// const InfiniteScroll = ({ children }) => {
//   const restoreScrollPosition = () => {
//     const currentHistoryState = window.history.state;
//     const position = currentHistoryState?.scrollPosition || 0;
//     window.scrollTo(0, position);
//   };

//   const saveScrollPosition = debounce(() => {
//     const position = window.scrollY || document.documentElement.scrollTop;
//     const currentHistoryState = window.history.state;
//     const newHistoryState = {
//       ...currentHistoryState,
//       scrollPosition: position,
//     };
//     window.history.replaceState(newHistoryState, '');
//   }, 100);

//   useEffect(() => {
//     if (!isInitialLoad) {
//       restoreScrollPosition();
//     } else {
//       isInitialLoad = false;
//     }
//     window.addEventListener('scroll', saveScrollPosition);

//     return () => {
//       window.removeEventListener('scroll', saveScrollPosition);
//     };
//   }, []);

//   return (

//   );
// };

// export default InfiniteScroll;
