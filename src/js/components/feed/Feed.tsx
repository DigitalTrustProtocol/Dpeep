import { useEffect, useRef, useState } from 'react';

import EventComponent from '@/components/events/EventComponent';
import FilterOptionsSelector from '@/components/feed/FilterOptionsSelector';

import Show from '@/components/helpers/Show';
import useHistoryState from '@/state/useHistoryState.ts';
import Helpers from '@/utils/Helpers';

import InfiniteScroll from 'react-infinite-scroll-component';
import useFeed from '@/dwotr/hooks/useFeed';
import { FeedOptions } from '@/dwotr/network/WOTPubSub';
import NewEventsButton from '@/dwotr/components/NewEventsButton';
import ShowNewEvents from './ShowNewEvents';

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

const Feed = ({ showDisplayAs, filterOptions }: FeedProps) => {
  //const fetchEvents = props.fetchEvents || useSubscribe;
  const feedTopRef = useRef<HTMLDivElement>(null);

  const displayAsParam = Helpers.getUrlParameter('display') === 'grid' ? 'grid' : 'feed';

  const [filterOptionIndex, setFilterOptionIndex] = useHistoryState(0, 'filterOptionIndex');
  const [displayAs, setDisplayAs] = useHistoryState(displayAsParam, 'display');
  const [infiniteScrollKey, setInfiniteScrollKey] = useState(0);

  const filterOption = filterOptions[filterOptionIndex];

  // when giving params to Feed, be careful that they don't unnecessarily change on every render
  const { events, hasMore, hasRefresh, loadMore, refresh } = useFeed(filterOption);

  // const hiddenEvents = useMemo(() => {
  //   const hiddenEvents = new Set<string>();
  //   if (!filterOption.mergeReposts) {
  //     return hiddenEvents;
  //   }
  //   const seenReposts = new Set<string>();
  //   for (const event of events) {
  //     if (isRepost(event)) {
  //       for (const tag of event.tags) {
  //         if (tag[0] === 'e') {
  //           if (seenReposts.has(tag[1])) {
  //             hiddenEvents.add(event.id);
  //             continue;
  //           }
  //           seenReposts.add(tag[1]);
  //         }
  //       }
  //     } else if (seenReposts.has(event.id)) {
  //       hiddenEvents.add(event.id);
  //     }
  //   }
  //   return hiddenEvents;
  // }, [events]);

  useEffect(() => {
    if (events.length === 0 && hasRefresh) {
      refresh(); // Auto refresh to show new events
      return;
    }

    // 10 should be enough to fill the screen
    if (events.length < 10 && hasMore) {
      loadMore(); // Auto load more to fill the screen
      return;
    }
  }, [events.length, hasRefresh, hasMore]);

  const refreshClick = (e) => {
    if (feedTopRef.current) {
      const currentScrollTop = document.documentElement.scrollTop || document.body.scrollTop;

      // only scroll up
      if (currentScrollTop > feedTopRef.current.offsetTop) {
        feedTopRef.current.scrollIntoView({ behavior: 'smooth' });
      }
    }
    setInfiniteScrollKey(infiniteScrollKey + 1);

    refresh(); // Add new events
  };

  const infiniteScrollKeyString = `${infiniteScrollKey}-${displayAs}-${filterOption.name}`;

  //let items = events.filter((event) => !hiddenEvents.has(event.id));
  let items = events;

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
        <InfiniteScroll
          dataLength={items.length} //This is important field to render the next data
          next={loadMore}
          hasMore={hasMore}
          loader={
            <div className="justify-center items-center flex w-full mt-4 mb-4">
              <div className="loading">🔄</div>
            </div>
          }
          endMessage={
            <p style={{ textAlign: 'center' }}>
              <b>No more notes</b>
            </p>
          }
          // below props only if you need pull down functionality

          refreshFunction={refresh}
          pullDownToRefresh
          pullDownToRefreshThreshold={50}
          pullDownToRefreshContent={
            <h3 style={{ textAlign: 'center' }}>&#8595; Pull down to refresh</h3>
          }
          releaseToRefreshContent={
            <h3 style={{ textAlign: 'center' }}>&#8593; Release to refresh</h3>
          }
        >
          {items.map((event) => {
            return (
              <EventComponent
                key={`${event.id}EC`}
                id={event.id}
                event={event}
                {...filterOption.eventProps}
              />
            );
          })}
        </InfiniteScroll>
      </Show>
    </>
  );
};

export default Feed;
