import { useEffect, useRef } from 'react';

import FilterOptionsSelector from '@/components/feed/FilterOptionsSelector';

import Show from '@/components/helpers/Show';
import useHistoryState from '@/state/useHistoryState.ts';
import Helpers from '@/utils/Helpers';

import InfiniteScroll from 'react-infinite-scroll-component';
import useFeed from '@/dwotr/hooks/useFeed';
import { FeedOptions } from '@/dwotr/network/WOTPubSub';
import NewEventsButton from '@/dwotr/components/NewEventsButton';
import ShowNewEvents from '@/components/feed/ShowNewEvents';
import EventComponent from '../events/EventComponent';
import eventManager from '@/dwotr/EventManager';
import { ID } from '@/utils/UniqueIds';
import { EventContainer } from '@/dwotr/model/DisplayEvent';

export type FeedProps = {
  filterOptions: FeedOptions[];
  showDisplayAs?: boolean;
  emptyMessage?: string;
  fetchEvents?: any;
};

const Feed = ({ showDisplayAs, filterOptions }: FeedProps) => {
  //const fetchEvents = props.fetchEvents || useSubscribe;
  const feedTopRef = useRef<HTMLDivElement>(null);

  const displayAsParam = Helpers.getUrlParameter('display') === 'grid' ? 'grid' : 'feed';

  const [filterOptionIndex, setFilterOptionIndex] = useHistoryState(0, 'filterOptionIndex');
  const [displayAs, setDisplayAs] = useHistoryState(displayAsParam, 'display');

  const filterOption = filterOptions[filterOptionIndex];

  // when giving params to Feed, be careful that they don't unnecessarily change on every render
  const { events, hasMore, hasRefresh, loadMore, refresh } = useFeed(filterOption);

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
    //setInfiniteScrollKey(infiniteScrollKey + 1);

    refresh(); // Add new events
  };

  //const infiniteScrollKeyString = `${infiniteScrollKey}-${displayAs}-${filterOption.name}`;

  //let items = events.filter((event) => !hiddenEvents.has(event.id));
  let items = events.map((event) => eventManager.containers.get(ID(event.id))) || [];

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
          {items.map((item: EventContainer | undefined) => {
            if (!item) return null;
            return (
              <>
              <EventComponent key={`${item?.id!}EC`} container={item} />
              <hr className="opacity-10 mb-2 mt-2" />
              </>
            );
          })}
        </InfiniteScroll>
      </Show>
    </>
  );
};

export default Feed;
