import { useState, useEffect, useRef, useCallback } from 'preact/hooks';

import { FeedOption } from '@/dwotr/network/WOTPubSub';
import EventComponent from '../events/EventComponent';
import useFeedProvider from '@/dwotr/hooks/useFeedProvider';
import ShowNewEvents from '@/components/feed/ShowNewEvents';
import { last, throttle } from 'lodash';

const BATCH_COUNT = 10; // The number of items to load at once

export type FeedProps = {
  feedOption?: FeedOption;
  setScope?: any;
  children?: any;
};

const FeedInfinity = ({ feedOption }: FeedProps) => {
  const [loadMoreRequest, setLoadMoreRequest] = useState<boolean>(false);

  const {
    containers,
    status,
    hasMore,
    hasNew,
    loadMore,
    reset: resetFeedProvider,
  } = useFeedProvider(feedOption, BATCH_COUNT);

  const {
    items,
    topHeight,
    bottomHeight,
    measureRef,
    resetItems: resetInfiniteScroll,
  } = useInfiniteScroll({
    itemCount: containers.length,
    loadMore: () => setLoadMoreRequest(true),
  });

  useEffect(() => {
    if (!loadMoreRequest) return; // No request to load more
    if (!hasMore) return; // No more items to load
    if (status != 'idle') return; // Already loading, or something else

    setLoadMoreRequest(false); // Reset the request
    loadMore(); // Load more items
  }, [loadMoreRequest, status, hasMore]);

  const loadNew = useCallback(
    (e) => {
      e.preventDefault();

      // Reset all so we can load the new events on top
      window.scrollTo(window.scrollX, 0);
      resetInfiniteScroll();
      resetFeedProvider();
    },
    [items],
  );

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
      {!hasMore && items.length > 0 && status == 'idle' && (
        <p style={{ textAlign: 'center' }}>
          <b>No more notes</b>
        </p>
      )}
      {!items.length && !hasMore && status == 'idle' && (
        <p style={{ textAlign: 'center' }}>
          <b>No notes</b>
        </p>
      )}
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
  resetItems: () => void;
}

class Item {
  index: number;
  height: number = 0;
  width: number = 0;
  top: number = 0; // 0 means not measured yet
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

  const itemViewPort = useRef({ top: 0, bottom: 0 });

  const updateVisibleItems = useCallback(() => {
    const viewportTop = window.scrollY || document.documentElement.scrollTop;
    const viewportBottom = viewportTop + window.screen.height;

    // Optimization: Only update if the "virtual" itemViewPort has changed do the to the scroll
    // Check if the screen viewport is within the item viewport, if so don't update
    // if (viewportTop >= itemViewPort.current.top && viewportBottom <= itemViewPort.current.bottom) {
    //   // Check for loadMore when the viewport is within the item viewport
    //   ///checkForLoadMore();
      
    //   return;
    // }
    //console.log("ViewPoirTop: ", viewportTop, " ViewPortBottom: ", viewportBottom);
    
    let newTopHeight = 0;
    let newBottomHeight = 0;
    let inViewItems: Item[] = [];

    let itemTop = 82;

    let newItems = false;
    let inViewItemsChanged = false;
    let overflowCountdown = 5; // Optimization: render overflow items for better scroll experience

    //console.time('updateVisibleItems item loop: ' + itemCount + ' items');
    console.log('updateVisibleItems item loop: ' + itemCount + ' items');

    for (let index = 0; index < itemCount; index++) {
      const item = getItem(index);


      //console.log('itemBottom: ' + itemBottom + ' viewportTop: ' + viewportTop, ' inView: ', item.inView);

      let isInView = item.inView;
      item.inView = false;

      if(item.height == 0) {
        inViewItems.push(item);  // Add the item to the list so it can be measured
        inViewItemsChanged = true;
        newItems = true;
        continue; 
      }

      let itemBottom = itemTop + item.height;
      if (itemBottom < viewportTop) {
        newTopHeight += item.height;
        itemTop += item.height;
        continue;
      } 

      item.inView = itemTop <= viewportBottom;
      inViewItemsChanged = inViewItemsChanged || isInView !== item.inView;


      if (!item.inView) { // && overflowCountdown-- < 0 Optimization: render overflow items for better scroll experience
        newBottomHeight += item.height;
        itemTop += item.height;
        continue;
      } 
      
      // Finally add the item to the list
      inViewItems.push(item);
      itemTop += item.height;

      //if (item.inView !== isInView) inViewItemsChanged = true;
      //item.inView = isInView;

    }
    let lastItem = getItem(itemCount - 1);

    //console.timeEnd('updateVisibleItems item loop: ' + itemCount + ' items');
    //console.log("inViewItemsChanged: ", inViewItemsChanged, ' TopDiv:', newTopHeight, ' BottomDiv:', newBottomHeight, ' -lastItem in View', lastItem.inView, ' lastItem top', itemTop - lastItem.height);

    // Only update if changed, expensive to update UI
    //if (inViewItemsChanged) {
      setItems(inViewItems);
//      console.log('updateVisibleItems full render');
    //}

    // Update the heights of the empty div space above and below the items
    setTopHeight(newTopHeight); //Can change on every scroll
    setBottomHeight(newBottomHeight);

    if (inViewItems.length == 0) {
      itemViewPort.current.top = 0; // No items in view, reset the "virtual" item viewport
      itemViewPort.current.bottom = 0;
      return; // No items in view, exit method
    }

    // Update the "virtual" item viewport
    //itemViewPort.current.top = inViewItems[0]?.top || 0;
    //let lastItem = inViewItems[inViewItems.length - 1];
    //itemViewPort.current.bottom = lastItem?.top || 0; // Use top of last item as the bottom of the viewport, force a loadMore when the last item is in view

    if(lastItem.inView && !newItems)  {
      console.log('loadMore');
      loadMore();
    }
  }, [itemCount, loadMore, loadMoreWithin]);

  // const checkForLoadMore = useCallback(() => {
  //   let item = getItem(itemCount - (loadMoreWithin + 1));
  //   if (item.inView && item.height > 100) {
  //     // Load more when the item is in view and has a height
    
  //   }
  // }, [itemCount, loadMore, loadMoreWithin]);

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
    [itemMap.current],
  );

  const resetItems = useCallback(() => {
    itemMap.current.clear();
    itemViewPort.current = { top: 0, bottom: 0 };
    setItems([]);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      requestAnimationFrame(updateVisibleItems);
      //throttle(updateVisibleItems, 100, { leading: false, trailing: true })(); // Throttle to 10fps
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
        if (item.height < height) item.height = height;

        item.top = node.offsetTop;
        item.bottom = item.top + item.height;
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
      if (item.height < height) item.height = height;

      item.top = node.offsetTop;
      item.bottom = item.top + item.height;

      // Handles images, videos, etc that change the height of the item asynchronously
      observer.current?.observe(node);

      return () => {
        if (node == null) return;
        observer.current?.unobserve(node);
      };
    },
    [itemMap.current],
  );

  return {
    items,
    topHeight,
    bottomHeight,
    measureRef,
    resetItems,
  };
};
