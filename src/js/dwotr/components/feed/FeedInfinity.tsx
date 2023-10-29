import { useState, useEffect, useRef, useCallback } from 'preact/hooks';

import { FeedOption } from '@/dwotr/network/WOTPubSub';
import EventComponent from '../events/EventComponent';
import useFeedProvider from '@/dwotr/hooks/useFeedProvider';
import { throttle } from 'lodash';

const BATCH_COUNT = 10; // The number of items to load at once

export type FeedProps = {
  feedOption?: FeedOption;
  children?: any;
  setScope?: any;
};

const FeedInfinity = ({ children, feedOption, setScope }: FeedProps) => {
  const {
    containers: items,
    status,
    hasMore,
    hasNew,
    loadNext,
  } = useFeedProvider(feedOption, BATCH_COUNT);

  const { visibleItems, topHeight, bottomHeight, measureRef } = useInfiniteScroll({
    items,
    loadMore: () => {
      if (hasMore && status == 'idle') {
        console.log('FeedInfinity:loadMore');
        loadNext();
      }
    },
  });


  useEffect(() => {
    loadNext();
  }, []);


  return (
    <>
      <div style={{ height: `${topHeight}px` }} />
      {visibleItems.map((item) => (
        <div key={item.id} data-index={item.id} ref={measureRef}>
          <EventComponent id={item.id} />
          <hr className="opacity-10 mb-2 mt-2" />
        </div>
      ))}
      <div style={{ height: `${bottomHeight}px` }} />
    </>
  );};

export default FeedInfinity;

// interface InfiniteListProps {
//   items: NoteContainer[];
//   hasMore?: boolean;
//   hasNew?: boolean;
//   status?: string;
//   loadMore: () => void;
// }

// const InfiniteList: React.FC<InfiniteListProps> = ({ items, loadMore }) => {

// };

interface UseInfiniteScrollProps {
  items: any[];
  loadMore: any;
  offset?: number;
}

interface UseInfiniteScrollResult {
  visibleItems: any[];
  topHeight: number;
  bottomHeight: number;
  measureRef: (node: HTMLElement | null) => void;
}

const useInfiniteScroll = ({
  items,
  loadMore,
  offset = 50,
}: UseInfiniteScrollProps): UseInfiniteScrollResult => {
  const [visibleItems, setVisibleItems] = useState<string[]>([]);
  const [topHeight, setTopHeight] = useState(0);
  const [bottomHeight, setBottomHeight] = useState(0);
  const itemHeights = useRef<Map<number, number>>(new Map());
  const observer = useRef<ResizeObserver | null>(null);


  const updateVisibleItems = useCallback(() => {
    const viewportTop = window.scrollY || document.documentElement.scrollTop;
    const viewportBottom = viewportTop + window.innerHeight;

    let newTopHeight = 0;
    let newBottomHeight = 0;
    let newVisibleItems: any[] = [];
    let itemTop = 0;
    let itemBottom = 0;

    items.forEach((item) => {
      const itemHeight = itemHeights.current.get(item.id) || 0; // 0 if not yet measured

      itemBottom += itemHeight;

      if (itemBottom < viewportTop) newTopHeight += itemHeight;
      else if (itemTop >= viewportBottom) newBottomHeight += itemHeight;
      else newVisibleItems.push(item);

      itemTop += itemHeight;
    });

    let visibleItemsChanged = false;
    if (visibleItems.length !== newVisibleItems.length) {
      visibleItemsChanged = true;
    } else {
      for (let i = 0; i < visibleItems.length; i++) {
        if ((visibleItems[i] as any).id !== newVisibleItems[i].id) {
          visibleItemsChanged = true;
          break;
        }
      }
    }

    if(visibleItemsChanged) { // Only update if changed, expensive to update UI
      setVisibleItems(newVisibleItems);
    }

    setTopHeight(newTopHeight); //Can change on every scroll
    setBottomHeight(newBottomHeight);

    if (viewportBottom + offset >= itemBottom) {
        loadMore();
    }

    // console.log(
    //   'Viewport',
    //   ':Top:',
    //   viewportTop,
    //   ', Bottom:',
    //   viewportBottom,
    //   ', Height:',
    //   viewportBottom - viewportTop,
    //   ' - totalHeight:',
    //   itemBottom,
    //   ' - TopHeight:',
    //   newTopHeight,
    //   ' - BottomHeight:',
    //   newBottomHeight,
    //   ' - ItemsHeight:',
    //   itemBottom - (newTopHeight + newBottomHeight),
    //   ' - ViewItems:',
    //   newVisibleItems.length,
    //   ' - TotalItems:',
    //   items.length,
    // );
  }, [items, loadMore, offset]);

  useEffect(() => {
    const handleScroll = () => {
      requestAnimationFrame(updateVisibleItems);
      //throttle(updateVisibleItems, 200);
    };

    window.addEventListener('scroll', handleScroll);
    window.addEventListener('resize', handleScroll);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
    };
  }, [updateVisibleItems]);

  const setHeight = useCallback(
    (id: number, height: number) => {
      if (id === 0) return;
      
      const prevHeight = itemHeights.current.get(id) || 0;
      if (prevHeight >= height) return;

      itemHeights.current.set(id, height);
    },
    [updateVisibleItems],
  );

  useEffect(() => {
    updateVisibleItems(); // Run once to set initial state
  }, [items]);

  useEffect(() => {
    //Create a single observer to handle all items
    observer.current = new ResizeObserver((entries) => {
      for (let entry of entries) {
        const { height } = entry.contentRect;
        setHeight(Number(entry.target.getAttribute('data-index') || 0), height);
      }
    });

    return () => {
      observer.current?.disconnect();
    };
  }, []);

  const measureRef = useCallback(
    (node: HTMLElement | null) => {
      if (!node) return;
      const index = node.getAttribute('data-index');
      if (index == null) return;

      const height = node.getBoundingClientRect().height;
      setHeight(Number(index), height);
      observer.current?.observe(node);

      return () => {
        if (node == null) return;
        observer.current?.unobserve(node);
      };
    },
    [updateVisibleItems],
  );

  return {
    visibleItems,
    topHeight,
    bottomHeight,
    measureRef,
  };
};
