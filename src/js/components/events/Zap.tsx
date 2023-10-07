import { useEffect, useState } from 'react';
import { BoltIcon } from '@heroicons/react/24/solid';
import { Event } from 'nostr-tools';
import { route } from 'preact-router';

import { getZappingUser } from '@/nostr/utils';
import zapManager, { Zap as ZapClass } from '@/dwotr/ZapManager';

import Key from '../../nostr/Key';
import Name from '../user/Name';

import EventComponent from './EventComponent';
import noteManager from '@/dwotr/NoteManager';
import { ID } from '@/utils/UniqueIds';

interface Props {
  event: Event;
}

export default function Zap(props: Props) {
  const [allZaps, setAllZaps] = useState<string[]>([]);
  const zappedId = ZapClass.decodeEventId(props.event);
  if (!zappedId) {
    return null;
  }
  const zappedEvent = noteManager.notes.get(ID(zappedId));
  if (!zappedEvent) {
    return null;
  }
  const authorIsYou = Key.isMine(zappedEvent?.pubkey);
  const mentioned = zappedEvent?.tags?.find((tag) => tag[0] === 'p' && Key.isMine(tag[1]));
  const zappedText = authorIsYou
    ? 'zapped your note'
    : mentioned
    ? 'zapped a note where you were mentioned'
    : 'zapped a note';

  useEffect(() => {
    const item = zapManager.zaps.get(ID(zappedId));
    if (!item) return;
    setAllZaps([...item.amountPerUser.keys()]);
  }, [zappedId]);

  if (!zappedId) {
    return null;
  }

  let zappingUser = null as string | null;
  try {
    zappingUser = getZappingUser(props.event);
  } catch (e) {
    console.error('no zapping user found for event', props.event.id, e);
    return '';
  }
  const userLink = `/${zappingUser}`;

  return (
    <div>
      <div onClick={(e) => messageClicked(e, zappedId || '')}>
        <div className="flex gap-1 items-center text-sm text-neutral-500 px-2 pt-2">
          <i className="zap-btn text-iris-orange">
            <BoltIcon width={18} height={18} />
          </i>
          <div>
            <a href={userLink}>
              <Name pub={zappingUser || ''} />
            </a>
            {allZaps.length > 1 && <span> and {allZaps.length - 1} others </span>} {zappedText}
          </div>
        </div>
        <EventComponent
          key={zappedId + props.event.id}
          id={zappedId}
          fullWidth={false}
          event={props.event}
        />
      </div>
    </div>
  );
}

const messageClicked = (e: MouseEvent, zappedId: string) => {
  const target = e.target as HTMLElement;
  if (['A', 'BUTTON', 'TEXTAREA', 'IMG', 'INPUT'].find((tag) => target.closest(tag))) {
    return;
  }
  if (window.getSelection()?.toString()) {
    return;
  }
  e.stopPropagation();
  route(`/${Key.toNostrBech32Address(zappedId, 'note')}`);
};
