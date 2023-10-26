import { useRef, Fragment } from 'react';

import Show from '@/components/helpers/Show';
import { FeedOption } from '@/dwotr/network/WOTPubSub';
import ShowNewEvents from '@/components/feed/ShowNewEvents';
import useVirtual from 'react-cool-virtual';
import EventComponent from '../events/EventComponent';
import useFillViewportHeight from '@/dwotr/hooks/useFillViewportHeight';
import useFeedProvider from '@/dwotr/hooks/useFeedProvider';
import { EventContainer } from '@/dwotr/model/ContainerTypes';

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

  // when giving params to Feed, be careful that they don't unnecessarily change on every render
  //const { events, hasMore, hasRefresh, isLoading, isDone, loadMore, refresh } = useFeed(feedOption);
  const { containers, status, hasMore, hasNew, loadNext } = useFeedProvider(feedOption);

  const batchLoaded = useRef<Array<boolean>>([]);

  //  const [comments, setComments] = useState([]);
  const { outerRef, innerRef, items } = useVirtual<HTMLDivElement, HTMLDivElement>({
    // Provide the number of comments
    itemCount: containers.length + (children ? 1 : 0),
    itemSize: 150,
    //itemCount: 10,
    // Starts to pre-fetch data when the user scrolls within every 5 items
    // e.g. 1 - 5, 6 - 10 and so on (default = 15)
    loadMoreCount: 10,
    // Provide the loaded state for a batch items to tell the hook
    // whether the `loadMore` should be triggered or not
    isItemLoaded: (loadIndex) => {
      //console.log('isItemLoaded: ', loadIndex, " - batchLoaded.current[loadIndex]: ", batchLoaded.current[loadIndex], " - hasMore: ", hasMore);
      return batchLoaded.current[loadIndex]; // || !hasMore
    },
    // The callback will be invoked when more data needs to be loaded
    loadMore: (e) => {
      const cb = (list: EventContainer[]) => {
        if (list.length === 0) return;

        batchLoaded.current[e.loadIndex] = true;
      };

      loadNext(cb); // Loads more data into the items array
    },

    //scrollDuration: (distance) => distance * 0.05,
    scrollDuration: 1500,
    // Using "easeInOutBack" effect (default = easeInOutSine), see: https://easings.net/#easeInOutSine
    scrollEasingFunction: (x) => {
      return 1 - Math.pow(1 - x, 5);
    },
  });

  const refreshClick = () => {
    //reset(); // Reset the provider, to load new data
    setScope('local' + Date.now()); // force re-render, reload the data and feed
  };

  if (!feedOption) return null;

  return (
    <>
      <div
        style={{ height: viewportHeight, overflow: 'auto' }}
        ref={(el) => {
          outerRef.current = el; // Set the element to the `outerRef`
          viewportRef.current = el; // Share the element for viewport calculation
        }}
      >
        <Show when={hasNew}>
          <ShowNewEvents onClick={refreshClick} />
        </Show>
        <hr className="opacity-10" />
        <div ref={innerRef}>
          {children}
          {items.map(({ index, size, width, measureRef }) => {
            // const isEndOfList = index === containers.length - 1;
            // const showLoading = hasMore && isEndOfList;
            // const showNoMore = !hasMore && isEndOfList;

            let container = containers[index];
            if (!container) return null;

            return (
              <div
                key={'FeedItem' + index}
                ref={measureRef}
                style={{ minHeight: size, minWidth: width }}
              >
                <Fragment key={`Virtual${container?.id!}`}>
                  <EventComponent container={container} />
                  <hr className="opacity-10 mb-2 mt-2" />
                </Fragment>
              </div>
            );
          })}
          <Show when={status == 'loading'}>
            <Loading />
          </Show>
          <p className="text-center">
            <Show when={items.length && !hasMore}>
              <b>No more messages</b>&nbsp;
              {/* <ToTopButton onClick={() => scrollTo({ offset: 0, smooth: true })} /> */}
            </Show>
            <Show when={!items.length && !hasMore}>
              <b>No messages</b>
            </Show>
          </p>
        </div>
      </div>
    </>
  );
};

export default FeedVirtual;
