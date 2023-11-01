import { useEffect, useState } from 'react';
import { FeedOption } from '@/dwotr/network/WOTPubSub';
import { Filter } from 'nostr-tools';

import { ID } from '@/utils/UniqueIds';

import FeedInfinity from './FeedInfinity';
import { RepliesCursor } from '@/dwotr/network/provider/RepliesCursor';

type RepliesFeedProps = {
  eventId: string;
};

export const RepliesFeed = ({ eventId }: RepliesFeedProps) => {
  const [localScope, setScope] = useState<string>('local');
  const [option, setOption] = useState<FeedOption>();

  useEffect(() => {
    let opt = {
      id: 'repliesFeed' + eventId, // Unique ID for this feed
      name: 'Replies',
      eventId: ID(eventId),
      includeReplies: true,
      showReplies: 0,
      filter: {
        '#e': [eventId],
        kinds: [1],
        //limit: 1000,
        // until: getNostrTime(), // Load events from now
        // since: event.created_at, // Replies cannot be created before the note
      } as Filter,
      cursor: RepliesCursor,
    } as FeedOption;

    setOption(opt);
  }, [eventId]);

  return (
    <>
      <hr className="opacity-10 mt-2" />
      <FeedInfinity key={localScope} feedOption={option} setScope={setScope} />
    </>
  );
};
