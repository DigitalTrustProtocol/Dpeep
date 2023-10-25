import { useEffect, useState } from 'react';
import { ArrowPathIcon } from '@heroicons/react/24/outline';
import { Event } from 'nostr-tools';
import { Link } from 'preact-router';

import { getRepostedEventId } from '@/nostr/utils';

import Key from '../../nostr/Key';
import { translate as t } from '../../translations/Translation.mjs';
import Name from '../user/Name';

import EventComponent from './EventComponent';
import noteManager from '@/dwotr/NoteManager';
import { ID, STR } from '@/utils/UniqueIds';
import repostManager from '@/dwotr/RepostManager';
import eventManager from '@/dwotr/EventManager';
import { RepostContainer } from '@/dwotr/model/ContainerTypes';

interface Props {
  event: Event;
  notification?: boolean;
  fullWidth?: boolean;
}

export default function Repost(props: Props) {
  const [allReposts, setAllReposts] = useState<string[]>([]);
  const [repostedEvent, setRepostedEvent] = useState<Event | undefined>(undefined);

  useEffect(() => {
    if (!props.event) return;
    let repostEvent = props.event;

    let repostContainer = eventManager.containers.get(ID(repostEvent.id)) as RepostContainer;

    if (!repostContainer?.repostOf) return;
    const e = noteManager.notes.get(repostContainer.repostOf!); // At this point noteManager should have the reposted event
    setRepostedEvent(e);

    if (props.notification) {
      let reposters = [...(repostManager.reposts.get(repostContainer.repostOf!) || new Set<RepostContainer>())].map(
        (e) => STR(e.authorId) as string,
      );
      setAllReposts(reposters);
    }
  }, [props.event]);

  if (!repostedEvent) return null;

  return (
    <div>
      <div className="flex gap-1 items-center text-sm text-neutral-500 px-2 pt-2">
        <p>Repost</p>
        <i>
          <ArrowPathIcon width={18} />
        </i>
        <Link href={`/${Key.toNostrBech32Address(props.event.pubkey, 'npub')}`}>
          <Name pub={props.event?.pubkey} hideBadge={true} />
        </Link>
        <span>
          {allReposts.length > 1 && `and ${allReposts.length - 1} others`} {t('reposted')}
        </span>
      </div>
      <EventComponent
        key={repostedEvent.id + props.event.id}
        id={repostedEvent.id}
        event={repostedEvent}
        fullWidth={props.fullWidth}
      />
    </div>
  );
}
