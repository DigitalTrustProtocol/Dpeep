import { useEffect, useRef, useState } from 'react';
import InfiniteScroll from '@/components/helpers/InfiniteScroll';
import useFeed from '@/dwotr/hooks/useFeed';
import { FeedOptions } from '@/dwotr/network/WOTPubSub';
import { Filter, Event } from 'nostr-tools';
import EventComponent from './EventComponent';
import noteManager from '@/dwotr/NoteManager';
import { EventRelayCursor } from '@/dwotr/network/EventRelayCursor';
import { ID } from '@/utils/UniqueIds';
import eventManager from '@/dwotr/EventManager';

type RepliesFeedProps = {
  eventId: string;
  showReplies: number;
  standalone?: boolean;
};

export const RepliesFeed = ({ eventId, showReplies, standalone }: RepliesFeedProps) => {
  const [filterOption, setFilterOption] = useState<FeedOptions>();

  const { events, hasMore, hasRefresh, loadMore, refresh } = useFeed(filterOption);

  useEffect(() => {
    let opt = {
      id: 'repliesFeed' + eventId, // Unique ID for this feed
      name: 'Replies',
      filter: {
        '#e': [eventId],
        kinds: [1],
        limit: showReplies,
      } as Filter,
      //source: 'network',
      //cursor: () => undefined,
    } as FeedOptions;


    let cursor = new EventRelayCursor(opt);

    // Preload replies to the cursor buffer, if any
    for(const replyId of noteManager.replies.get(ID(eventId)) || []) {
        let event = eventManager.eventIndex.get(replyId);
        if(event) 
            cursor.buffer.push(event);
    }

    opt.cursor = () => cursor;

    setFilterOption(opt);
  }, [eventId, showReplies]);

  return (
    <>
      <InfiniteScroll>
        {events.slice(0, showReplies).map((r) => (
          <EventComponent
            key={r.id}
            id={r.id}
            isReply={true}
            isQuoting={!standalone}
            showReplies={1}
            event={r}
          />
        ))}
      </InfiniteScroll>
    </>
  );
};
