import { debounce } from 'lodash';
import ErrorBoundary from './helpers/ErrorBoundary';

import { PropsWithChildren, useEffect, useState } from 'react';

let isInitialLoad = true;
const listener = function () {
  isInitialLoad = false;
  window.removeEventListener('popstate', listener);
};
window.addEventListener('popstate', listener);

type ScrollViewProps = {};

export const ScrollView = (props: PropsWithChildren<ScrollViewProps>) => {
  const [observer, setObserver] = useState<ResizeObserver | null>(null);

  let scrollPosition = 0;

  useEffect(() => {
    let saveScrollPosition = debounce(() => {
      const scrollPosition = window.scrollY || document.documentElement.scrollTop;
      window.history.replaceState(
        {
          ...window.history.state,
          scrollPosition,
        },
        '',
      );
    }, 100);

    window.addEventListener('scroll', saveScrollPosition);
    restoreScrollPosition();

    return () => {
      if (observer) observer.disconnect();

      window.removeEventListener('scroll', saveScrollPosition);
    };
  }, []); // Run on mount only

  function restoreScrollPosition(observe = true) {
    const currentHistoryState = window.history.state;
    const previousHistoryState = window.history.state?.previousState;

    if (!isInitialLoad && currentHistoryState !== previousHistoryState) {
      if (observe) observeScrollElement();

      if (!scrollPosition) scrollPosition = window.history.state?.scrollPosition;

      if (scrollPosition) window.scrollTo(0, scrollPosition);
    } else {
      const oldState = window.history.state || {};
      const newHistoryState = {
        ...oldState,
        previousState: currentHistoryState,
      };
      window.history.replaceState(newHistoryState, '');
    }
  }

  let observeScrollElement = () => {
    setObserver(
      new ResizeObserver((entries) => {
        entries.forEach(() => {
          restoreScrollPosition(false);
        });
      }),
    );

    observer?.observe(document.body);
    setTimeout(() => {
      if (observer) observer.disconnect();
    }, 1000);
  };

  return (
    <>
      <div>
        <ErrorBoundary>{props.children}</ErrorBoundary>
      </div>
    </>
  );
};

export default ScrollView;
