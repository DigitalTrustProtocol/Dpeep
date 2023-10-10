import { Fragment, useEffect, useRef } from 'react';

import EventComponent from '@/components/events/EventComponent';
import FilterOptionsSelector from '@/components/feed/FilterOptionsSelector';

import Show from '@/components/helpers/Show';
import useHistoryState from '@/state/useHistoryState.ts';
import Helpers from '@/utils/Helpers';

//import InfiniteScroll from 'react-infinite-scroll-component';
import useFeed from '@/dwotr/hooks/useFeed';
import { FeedOptions } from '@/dwotr/network/WOTPubSub';
import NewEventsButton from '@/dwotr/components/NewEventsButton';
import ShowNewEvents from '@/components/feed/ShowNewEvents';
import useVirtual, { LoadMore } from 'react-cool-virtual';

export type FeedProps = {
  filterOptions: FeedOptions[];
  showDisplayAs?: boolean;
  //filterFn?: (event: any) => boolean;
  emptyMessage?: string;
  fetchEvents?: any;
  // (opts: any) => {
  //   events: Event[];
  //   hasMore: boolean;
  //   hasRefresh: boolean;
  //   loadMore: () => void;
  //   refresh: () => void;
  //   loadAll: () => void;
  // };
};

// const TOTAL_COMMENTS = 500;
// const BATCH_COMMENTS = 5;

// We only have 50 (500 / 5) batches of items, so set the 51th (index = 50) batch as `true`
// to avoid the `loadMore` callback from being invoked, yep it's a trick 😉

let currentIndex = -1;

const Loading = ({ show }) => {
  if (!show) return null;
  return <div className="item">⏳ Loading...</div>;
};

const Feed = ({ showDisplayAs, filterOptions }: FeedProps) => {
  //const fetchEvents = props.fetchEvents || useSubscribe;
  const feedTopRef = useRef<HTMLDivElement>(null);

  const displayAsParam = Helpers.getUrlParameter('display') === 'grid' ? 'grid' : 'feed';

  const [filterOptionIndex, setFilterOptionIndex] = useHistoryState(0, 'filterOptionIndex');
  const [displayAs, setDisplayAs] = useHistoryState(displayAsParam, 'display');
  //const [infiniteScrollKey, setInfiniteScrollKey] = useState(0);

  const filterOption = filterOptions[filterOptionIndex];

  // when giving params to Feed, be careful that they don't unnecessarily change on every render
  const { events, hasMore, hasRefresh, loadMore, refresh } = useFeed(filterOption);

  const batchLoaded = useRef<Array<boolean>>([]);

  //  const [comments, setComments] = useState([]);
  const { outerRef, innerRef, items } = useVirtual({
    // Provide the number of comments
    itemCount: events.length,
    // Starts to pre-fetch data when the user scrolls within every 5 items
    // e.g. 1 - 5, 6 - 10 and so on (default = 15)
    loadMoreCount: 10,
    // Provide the loaded state for a batch items to tell the hook
    // whether the `loadMore` should be triggered or not
    isItemLoaded: (loadIndex) => batchLoaded[loadIndex] || !hasMore,
    // The callback will be invoked when more data needs to be loaded
    loadMore: (e) => {
      //console.log('Load more: ', e);
      loadMore(); // Loads more data into the items array
      batchLoaded.current[e.loadIndex] = true;
    },
  });

  // useEffect(() => {
  //   if (events.length === 0 && hasRefresh) {
  //     refresh(); // Auto refresh to show new events
  //     return;
  //   }

  //   // 10 should be enough to fill the screen
  //   if (events.length < 10 && hasMore) {
  //     loadMore(); // Auto load more to fill the screen
  //     return;
  //   }
  // }, [events.length, hasRefresh, hasMore]);

  const refreshClick = (e) => {
    if (feedTopRef.current) {
      const currentScrollTop = document.documentElement.scrollTop || document.body.scrollTop;

      // only scroll up
      if (currentScrollTop > feedTopRef.current.offsetTop) {
        feedTopRef.current.scrollIntoView({ behavior: 'smooth' });
      }
    }

    refresh(); // Add new events
  };

  //let items = events;

  return (
    <>
      <div ref={feedTopRef} />
      <Show when={hasRefresh}>
        <ShowNewEvents onClick={refreshClick} />
      </Show>
      <Show when={filterOptions.length > 1}>
        <FilterOptionsSelector
          filterOptions={filterOptions}
          activeOption={filterOption}
          onOptionClick={(index) => {
            setFilterOptionIndex(index);
          }}
        />
      </Show>
      {/* <Show when={showDisplayAs !== false}>
        <DisplaySelector
          onDisplayChange={(displayAs) => {
            setDisplayAs(displayAs);
            Helpers.setUrlParameter('display', displayAs === 'grid' ? 'grid' : null);
          }}
          activeDisplay={displayAs}
        />
      </Show> */}
      {/* <Show when={showEmptyMessage}>
        <div className="m-2 md:mx-4">{emptyMessage || t('no_posts_yet')}</div>
      </Show> */}
      {/* <Show when={displayAs === 'grid'}>
        <ImageGrid key={infiniteScrollKeyString} events={events} loadMore={loadMore} />
      </Show> */}

      <hr className="opacity-10" />
      <Show when={hasRefresh}>
        <NewEventsButton onClick={refreshClick} />
        <hr className="opacity-10" />
      </Show>

      <Show when={displayAs === 'feed'}>
        <div
          className="h-screen overflow-auto"
          ref={outerRef as any}
        >
          <div ref={innerRef as any}>
            {items.length ? (
              items.map(({ index, measureRef }) => {
                const showLoading = index === events.length - 1;

                let item = events[index];
                console.log('item index: ', index, " - item.length: ", items.length);
 
                return (
                  <Fragment key={'Feed' + item.id}>
                    <div ref={measureRef}>
                      <EventComponent
                        
                        id={item.id}
                        event={item}
                        {...filterOption.eventProps}
                      />
                    </div>

                    <Loading show={showLoading} />
                  </Fragment>
                );
              })
            ) : (
              <Loading show={true} />
            )}
          </div>
        </div>
      </Show>
    </>
  );
};

export default Feed;
