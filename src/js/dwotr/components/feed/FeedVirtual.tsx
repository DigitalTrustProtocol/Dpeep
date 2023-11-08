//import { memo } from 'preact/compat';
import { Fragment, useCallback, useRef } from 'react';

import { FeedOption } from '@/dwotr/network/provider';
//import ShowNewEvents from '@/components/feed/ShowNewEvents';
import useVirtual from 'react-cool-virtual';
import EventComponent from '../events/EventComponent';
import useFillViewportHeight from '@/dwotr/hooks/useFillViewportHeight';
import useFeedProvider from '@/dwotr/hooks/useFeedProvider';
import { NoteContainer } from '@/dwotr/model/ContainerTypes';
//import Show from '@/components/helpers/Show';

const BATCH_COUNT = 30; // The number of items to load at once

export type FeedProps = {
  feedOption?: FeedOption;
  filterOptions?: FeedOption[];
  showDisplayAs?: boolean;
  emptyMessage?: string;
  fetchEvents?: any;
  children?: any;
  setScope?: any;
};

const Loading = () => (
  <div className="justify-center items-center flex w-full mt-4 mb-4">
    <div className="loading">🔄</div>
  </div>
);

const FeedVirtual = ({ children, feedOption, setScope }: FeedProps) => {
  const [viewportRef, viewportHeight] = useFillViewportHeight<HTMLDivElement>();
  const containerCheck = useRef<NoteContainer[]>([]);

  // when giving params to Feed, be careful that they don't unnecessarily change on every render
  //const { events, hasMore, hasRefresh, isLoading, isDone, loadMore, refresh } = useFeed(feedOption);
  const { containers, status, hasMore, hasNew, loadNext } = useFeedProvider(
    feedOption,
    BATCH_COUNT,
  );

  //  const [comments, setComments] = useState([]);
  const { outerRef, innerRef, items } = useVirtual<HTMLDivElement, HTMLDivElement>({
    // Provide the number of comments
    itemCount: containers.length, // + (children ? 1 : 0),
    itemSize: 150, // Set default size for all items
    overscanCount: 2, // (default = 5) The number of items (rows or columns) to render before and after the visible items
    //useIsScrolling: true, // (default = false) Set it to `true` if you want to optimize the render for scrolling
    //useIsScrolling: (speed) => speed > 50, // Use it based on the scroll speed (more user friendly)
    // Starts to pre-fetch data when the user scrolls within every 5 items
    // e.g. 1 - 5, 6 - 10 and so on (default = 15)
    loadMoreCount: 1,
    // Provide the loaded state for a batch items to tell the hook
    // whether the `loadMore` should be triggered or not
    isItemLoaded: (loadIndex) => {
      if (!hasMore) return true; // stop loading when we reach the end of the feed
      let totalBatch = Math.floor(containers.length / BATCH_COUNT);
      let isLoaded = loadIndex < totalBatch;
      // console.log(
      //   'isItemLoaded: ',
      //   isLoaded,
      //   ' - LoadIndex: ',
      //   loadIndex,
      //   ' - totalBatch: ',
      //   totalBatch,
      //   ' - containers.length: ',
      //   containers.length,
      //   ' - hasMore: ',
      //   hasMore,
      // );
      return isLoaded;
    },
    // The callback will be invoked when more data needs to be loaded
    loadMore: (e) => {
      //console.log('loadMore2: ', e.loadIndex, ' - hasMore: ', hasMore);
      if (hasMore) loadNext(e); // Loads more data into the items array
    },

    scrollDuration: (distance) => distance * 0.05,
    //scrollDuration: 1500,
    // Using "easeInOutBack" effect (default = easeInOutSine), see: https://easings.net/#easeInOutSine
    // scrollEasingFunction: (x) => {
    //   return 1 - Math.pow(1 - x, 5);
    // },
  });

  const refreshClick = () => {
    //reset(); // Reset the provider, to load new data
    setScope('local' + Date.now()); // force re-render, reload the data and feed
  };

  const RenderContainer = useCallback(
    ({ index, size, width, measureRef, isScrolling = false }) => {
      const isFirstItem = index === 0;
      const isEndOfList = index === containers.length - 1;
      // key={'container' + container.id}

      let container = containers[index];

      // if (isScrolling)
      //   return (
      //     <Fragment key={index}>
      //       <div> Scrolling... </div>
      //     </Fragment>
      //   );

      return (
        <Fragment key={index}>
          {/* {isFirstItem && children} */}
          <div ref={measureRef} style={{ minHeight: size, minWidth: width }}>
            <EventComponent id={container.id} />
            <hr className="opacity-10 mb-2 mt-2" />
          </div>
          {/* {isEndOfList && <RenderStatus />} */}
        </Fragment>
      );
    },
    [containers],
  );

  // const RenderStatus = useCallback(() => {
  //   return (
  //     <>
  //       {status == 'loading' && <Loading />}
  //       <p className="text-center">
  //         {items.length && !hasMore && <b>End of feed</b>}
  //         {!items.length && !hasMore && <b>No messages</b>}
  //       </p>
  //     </>
  //   );
  // }, [status, items, hasMore]);

  // console.log(
  //   'StartIndex:',
  //   items[0]?.index,
  //   ' - EndIndex:',
  //   items[items.length - 1]?.index,
  //   ' - Total:',
  //   items.length,
  //   ' - Containers:',
  //   containers.length,
  // );

  // if (containerCheck.current !== containers) {
  //   console.log('Container changed:Length:', containers.length);
  //   containerCheck.current = containers;
  // }

  return (
    <div
      style={{ height: viewportHeight, overflow: 'auto' }}
      ref={(el) => {
        outerRef.current = el; // Set the element to the `outerRef`
        viewportRef.current = el; // Share the element for viewport calculation
      }}
    >
      {/* <Show when={hasNew}>
        <ShowNewEvents onClick={refreshClick} />
      </Show> */}
      {/* <hr className="opacity-10" /> */}
      <div ref={innerRef}>
        {items.length > 0 ? (
          items.filter(({ index }) => index < containers.length).map(RenderContainer)
        ) : (
          <p>Items.length == 0</p>
        )}
      </div>
    </div>
  );
};

export default FeedVirtual;

{
  /* <ToTopButton onClick={() => scrollTo({ offset: 0, smooth: true })} /> */
}

// const TempComponent =() => {
//   return (
//     <div className={`px-2 md:px-4 pb-2 flex flex-col`}>
//       {/* <InlineAuthor container={container} showTools={true} /> */}
//       <div className="flex flex-row">
//         <div className="flex flex-col items-center flex-shrink-0 min-w-[40px] min-h-[40px] mr-2">
//           {true && <div className="border-l-2 border-neutral-700 h-full">Inner</div>}
//         </div>

//         <div className={`flex-grow`}>Demo</div>
//       </div>
//     </div>
//   );
// };

// if (!container)
//   return (
//     <Fragment>
//       <div
//         key={'container' + index}
//         ref={measureRef}
//         style={{ minHeight: size, minWidth: width }}
//       >
//         <p>No container</p>
//         <hr className="opacity-10 mb-2 mt-2" />
//       </div>
//     </Fragment>
//   ); // stop rendering when we reach the end of the containers
