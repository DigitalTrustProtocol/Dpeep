import debounce from 'lodash/debounce';
import { useLayoutEffect } from 'preact/hooks';

const useRestoreScrollPosition = () => {
  const restoreScrollPosition = () => {
    const currentHistoryState = window.history.state;
    const position = currentHistoryState?.scrollPosition || 0;
    window.scrollTo(0, position);
  };

  const saveScrollPosition = debounce(() => {
    const position = window.scrollY || document.documentElement.scrollTop;
    const currentHistoryState = window.history.state;
    const newHistoryState = {
      ...currentHistoryState,
      scrollPosition: position,
    };
    window.history.replaceState(newHistoryState, '');
  }, 100);

  useLayoutEffect(() => {
    restoreScrollPosition();
    window.addEventListener('scroll', saveScrollPosition);

    return () => {
      window.removeEventListener('scroll', saveScrollPosition);
    };
  }, []);
};
