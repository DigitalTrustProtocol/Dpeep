import { useRef, Fragment } from 'react';
import { Event } from 'nostr-tools';

import Show from '@/components/helpers/Show';
import useFeed from '@/dwotr/hooks/useFeed';
import { FeedOption } from '@/dwotr/network/WOTPubSub';
import ShowNewEvents from '@/components/feed/ShowNewEvents';
import useVirtual from 'react-cool-virtual';
import eventManager from '@/dwotr/EventManager';
import { ID } from '@/utils/UniqueIds';
import EventComponent from '../events/EventComponent';
import useFillViewportHeight from '@/dwotr/hooks/useFillViewportHeight';
import ToTopButton from './ToTopButton';
import { set } from 'lodash';

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

  //const [filterOptionIndex, setFilterOptionIndex] = useHistoryState(0, 'filterOptionIndex');
  

  const [viewportRef, viewportHeight] = useFillViewportHeight<HTMLDivElement>();
  //const [scrollRef, isScrolled] = useScrollDetection<HTMLDivElement>();

  // when giving params to Feed, be careful that they don't unnecessarily change on every render
  const { events, hasMore, hasRefresh, isLoading, isDone, loadMore, refresh } =
    useFeed(feedOption);

  const containers = events.map((event) => eventManager.containers.get(ID(event.id))) || [];

  const batchLoaded = useRef<Array<boolean>>([]);

  //  const [comments, setComments] = useState([]);
  const { outerRef, innerRef, items, scrollTo, startItem } = useVirtual<HTMLDivElement, HTMLDivElement>({
    // Provide the number of comments
    itemCount: events.length,
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
      const cb = (list: Event[]) => {
        //console.log('loadMore:list.length:', list.length);
        if (list.length === 0) return;

        batchLoaded.current[e.loadIndex] = true;
      };

      loadMore(cb); // Loads more data into the items array
    },

    //scrollDuration: (distance) => distance * 0.05,
    scrollDuration: 1500,
    // Using "easeInOutBack" effect (default = easeInOutSine), see: https://easings.net/#easeInOutSine
    scrollEasingFunction: (x) => {
      return 1 - Math.pow(1 - x, 5);
    },
  });

  const refreshClick = (e) => {
    let count = refresh(); // Add new events
    startItem(count);
    scrollTo({ offset: 0, smooth: true });
    //setScope('local'+Date.now()); // force re-render
  };

  if(!feedOption) return null;

  return (
    <>
    <div
      style={{ height: viewportHeight, overflow: 'auto' }}
      ref={(el) => {
        outerRef.current = el; // Set the element to the `outerRef`
        viewportRef.current = el; // Share the element for viewport calculation
      }}
    >
      {children} {/* Render the children within the scroll window */}

      <Show when={hasRefresh}>
        <ShowNewEvents onClick={refreshClick} />
      </Show>

      <hr className="opacity-10" />

      <div ref={innerRef}>
        {items.length ? (
          items.map(({ index, size, width, measureRef }) => {
            const isEndOfList = index === containers.length - 1;
            const showLoading = hasMore && isEndOfList;
            const showNoMore = !hasMore && isEndOfList;

            let container = containers[index];
            if (!container) {
              return null;
            }

            return (
              <div
                key={'FeedItem' + index}
                ref={measureRef}
                style={{ minHeight: size, minWidth: width }}
              >
                <Fragment key={`Virtual${container?.id!}`}>
                  <EventComponent container={container} />
                  <hr className="opacity-10 mb-2 mt-2" />
                  <Show when={showNoMore}>
                    <p className="text-center">
                      <b>No more messages</b>&nbsp;
                      {/* <ToTopButton onClick={() => scrollTo({ offset: 0, smooth: true })} /> */}
                    </p>
                  </Show>
                  <Show when={showLoading}>
                    <Loading />
                  </Show>
                </Fragment>
              </div>
            );
          })
        ) : (
          <>
            <Show when={isLoading}>
              <Loading />
            </Show>
            <Show when={isDone}>
              <p className="text-center">
                <b>No messages</b>
              </p>
            </Show>
          </>
        )}
      </div>
    </div>
    </>
  );
};

export default FeedVirtual;

