import { useEffect, useRef, useState } from 'react';
import InfiniteScroll from 'react-infinite-scroll-component';
import useFeed from '@/dwotr/hooks/useFeed';
import { FeedOption } from '@/dwotr/network/WOTPubSub';
import { Filter } from 'nostr-tools';

import { ID } from '@/utils/UniqueIds';
import { RepliesCursor } from '@/dwotr/network/RepliesCursor';
import replyManager from '@/dwotr/ReplyManager';

import NewEventsButton from '@/dwotr/components/NewEventsButton';
import Show from '@/components/helpers/Show';
import EventComponent from '../events/EventComponent';
import eventManager from '@/dwotr/EventManager';

type RepliesFeedProps = {
  eventId: string;
};

export const RepliesFeed = ({ eventId }: RepliesFeedProps) => {
  const feedTopRef = useRef<HTMLDivElement>(null);
  const [filterOption, setFilterOption] = useState<FeedOption>();

  const { events, hasMore, hasRefresh, loadMore, refresh } = useFeed(filterOption);

  useEffect(() => {
    let opt = {
      id: 'repliesFeed' + eventId, // Unique ID for this feed
      name: 'Replies',
      eventId: ID(eventId),
      filter: {
        '#e': [eventId],
        kinds: [1],
        limit: 1000,
        // until: getNostrTime(), // Load events from now
        // since: event.created_at, // Replies cannot be created before the note
      } as Filter,
      cursor: RepliesCursor,
    } as FeedOption;

    // let cursor = new RepliesCursor(opt);
    
    // // Preload replies to the cursor buffer, if any
    // cursor.buffer = replyManager.getEventReplies(ID(eventId));

    // opt.cursor = () => cursor;

    setFilterOption(opt);
  }, [eventId]);

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

  if(!events) return null;

  let items = events.map((event) => eventManager.containers.get(ID(event.id))) || [];

  return (
    <>
      <div ref={feedTopRef} />
      <Show when={hasRefresh}>
        <NewEventsButton onClick={refreshClick} />
        <hr className="opacity-10" />
      </Show>
      <InfiniteScroll
        dataLength={events.length} //This is important field to render the next data
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
      >
        {items.map((container) => {
          if (!container) return null;
          return (
            <>
              <EventComponent key={`${container?.id!}RF`} id={container.id} showReplies={0} />
              <hr className="opacity-10 mb-2 mt-2" />
            </>
          );
        })}
      </InfiniteScroll>
    </>
  );
};
