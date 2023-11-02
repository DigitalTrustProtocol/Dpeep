import { useState, useEffect, useRef, useCallback } from 'preact/hooks';

import { FeedOption } from '@/dwotr/network/WOTPubSub';
import EventComponent from '../events/EventComponent';
import useFeedProvider from '@/dwotr/hooks/useFeedProvider';
import ShowNewEvents from '@/components/feed/ShowNewEvents';

const BATCH_COUNT = 20; // The number of items to load at once

export type FeedProps = {
  feedOption?: FeedOption;
  setScope?: any;
  children?: any;
};

const FeedInfinity = ({ feedOption, setScope }: FeedProps) => {
  const { containers, status, hasMore, hasNew, loadMore, reset } = useFeedProvider(
    feedOption,
    BATCH_COUNT,
  );

  const { items, topHeight, bottomHeight, measureRef } = useInfiniteScroll({
    itemCount: containers.length,
    loadMore: () => {
      if (hasMore && status == 'idle') {
        console.log('FeedInfinity:loadMore: Status is', status, 'and hasMore:', hasMore, '- loading more...');
        loadMore();
      }
    },
  });

  const loadNew = useCallback((e) => {
    e.preventDefault();

    //setScope('local'+Date.now()); // Force a new scope to trigger a reload
    window.scrollTo(window.scrollX, 0);
    reset();
  }, [items]);

  return (
    <>
      <div style={{ height: `${topHeight}px` }} />
      {items.map((item) => {
        let id = containers[item.index]?.id;
        if (id == undefined) return null;

        return (
          <div key={id} data-index={item.index} ref={measureRef} style={{ minHeight: item.height }}>
            <EventComponent id={id} showReplies={feedOption?.showReplies} />
            <hr className="opacity-10 mb-2 mt-2" />
          </div>
        );
      })}
      <div style={{ height: `${bottomHeight}px` }} />
      {status == 'loading' && (
        <div className="justify-center items-center flex w-full mt-4 mb-4">
          <div className="loading">🔄</div>
        </div>
      )}
      {!hasMore && items.length > 0 && status == 'idle' &&
        <p style={{ textAlign: 'center' }}>
          <b>No more notes</b>
        </p>
      }
      {!items.length && !hasMore && status == 'idle' &&
        <p style={{ textAlign: 'center' }}>
          <b>No notes</b>
        </p>
      }
      {hasNew && <ShowNewEvents onClick={loadNew} />}
    </>
  );
};

export default FeedInfinity;

interface UseInfiniteScrollProps {
  itemCount: number;
  loadMore: any;
  loadMoreWithin?: number;
}

interface UseInfiniteScrollResult {
  items: Item[];
  topHeight: number;
  bottomHeight: number;
  measureRef: (node: HTMLElement | null) => void;
}

class Item {
  index: number;
  height: number = 0;
  width: number = 0;
  top: number = 0;
  bottom: number = 0;
  inView: boolean = false;
  constructor(index: number) {
    this.index = index;
  }

  setTop(top: number) {
    this.top = top;
    this.bottom = top + this.height;
  }
}

const useInfiniteScroll = ({
  itemCount,
  loadMore,
  loadMoreWithin = 3,
}: UseInfiniteScrollProps): UseInfiniteScrollResult => {
  const [items, setItems] = useState<Item[]>([]);
  const [topHeight, setTopHeight] = useState(0);
  const [bottomHeight, setBottomHeight] = useState(0);
  const itemMap = useRef<Map<number, Item>>(new Map());
  const observer = useRef<ResizeObserver | null>(null);

  const updateVisibleItems = useCallback(() => {
    const viewportTop = window.scrollY || document.documentElement.scrollTop;
    const viewportBottom = viewportTop + window.innerHeight;

    let newTopHeight = 0;
    let newBottomHeight = 0;
    let inViewItems: Item[] = [];
    let itemTop = 0;
    let itemBottom = 0;
    let inViewItemsChanged = false;

    for (let index = 0; index < itemCount; index++) {
      const item = getItem(index);

      itemBottom += item.top + item.height;

      let isInView = false;

      if (itemBottom < viewportTop) newTopHeight += item.height;
      else if (itemTop >= viewportBottom) newBottomHeight += item.height;
      else {
        inViewItems.push(item);
        isInView = true;
      }

      if (item.inView !== isInView) inViewItemsChanged = true;
      item.inView = isInView;

      itemTop += item.height;
    }

    if (inViewItemsChanged) { // Only update if changed, expensive to update UI
      setItems(inViewItems);
    }

    setTopHeight(newTopHeight); //Can change on every scroll
    setBottomHeight(newBottomHeight);

    let item = getItem(itemCount - loadMoreWithin);
    if (item.inView && item.height > 100) { // Load more when the item is in view and has a height
      console.log('useInfiniteScroll:loadMore:ItemCount:', itemCount);
      loadMore();
    }

  }, [itemCount, loadMore, loadMoreWithin]);

  const getItem = useCallback(
    (index: number, height = 0): Item => {
      let item = itemMap.current.get(index);
      if (!item) {
        item = new Item(index);
        item.height = height;
        if (index >= 0) itemMap.current.set(index, item);
      }
      return item;
    },
    [updateVisibleItems],
  );

  useEffect(() => {
    const handleScroll = () => {
      requestAnimationFrame(updateVisibleItems);
    };

    window.addEventListener('scroll', handleScroll);
    window.addEventListener('resize', handleScroll);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
    };
  }, [updateVisibleItems]);


  useEffect(() => {
    updateVisibleItems(); // Run once to set initial state
  }, [itemCount]);



  useEffect(() => {
    //Create a single observer to handle all items
    observer.current = new ResizeObserver((entries) => {
      for (let entry of entries) {

        let node = entry.target as HTMLElement;
        let index = node.getAttribute('data-index') || 0;

        const { height } = entry.contentRect;

        let item = getItem(Number(index));
        if (item.height < height)
          item.height = height;
  
        item.top = node.offsetTop;
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

      const { height } = node.getBoundingClientRect();

      let item = getItem(Number(index));
      //if (item.height < height)
      item.height = height;

      item.top = node.offsetTop;

      // Handles images, videos, etc that change the height of the item asynchronously
      observer.current?.observe(node);

      return () => {
        if (node == null) return;
        observer.current?.unobserve(node);
      };
    },
    [updateVisibleItems],
  );

  return {
    items,
    topHeight,
    bottomHeight,
    measureRef,
  };
};
