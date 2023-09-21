import { memo } from 'react';
import { FireIcon } from '@heroicons/react/24/solid';
import { Event, nip19 } from 'nostr-tools';
import { Link } from 'preact-router';

import RelativeTime from '../RelativeTime';
import Avatar from '../user/Avatar';
import Name from '../user/Name';
import muteManager from '@/dwotr/MuteManager';
import { ID } from '@/utils/UniqueIds';

const SmallEvent = memo(({ event }: { event: Event }) => (
  <div key={event.id} className="flex gap-4 w-full break-words">
    <div className="flex-shrink-0 min-w-[30px] min-h-[30px]" alt="">
      <Link href={`/${nip19.npubEncode(event.pubkey)}`}>
        <Avatar str={event.pubkey} width={30} />
      </Link>
    </div>
    <Link href={`/${nip19.noteEncode(event.id)}`} className="w-full">
      <b>
        <Name pub={event.pubkey} />
      </b>
      {' | '}
      <span className="text-neutral-400">
        <RelativeTime date={new Date(event.created_at * 1000)} />
        <br />
        {event.content?.length > 80 ? `${event.content?.slice(0, 80)}...` : event.content}
      </span>
    </Link>
  </div>
));

const SmallFeed = ({ events }: { events: Event[] }) => {
  return (
    <div className="card-body p-2">
      <h2 className="card-title">
        <FireIcon width={20} className="text-iris-orange" />
        Trending 24h
      </h2>

      <hr className="opacity-10" />

      <div className="flex flex-wrap gap-6 text-xs overflow-x-hidden">
        {events
          .filter((event) => !muteManager.isMuted(ID(event.pubkey)))
          .map((event) => (
            <SmallEvent event={event} />
          ))}
      </div>
    </div>
  );
};

export default memo(SmallFeed);
