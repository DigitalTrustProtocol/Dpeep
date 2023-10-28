import { memo } from 'preact/compat';
import { ArrowPathIcon } from '@heroicons/react/24/outline';
import { useEffect, useState } from 'preact/hooks';

import Events from '../../../nostr/Events';
import { STR, UID } from '@/utils/UniqueIds';
import { throttle } from 'lodash';
import repostManager from '@/dwotr/RepostManager';
import { RepostContainer } from '@/dwotr/model/ContainerTypes';
import { useIsMounted } from '@/dwotr/hooks/useIsMounted';

type RepostProps = {
  eventId: UID;
  authorId: UID;
  loadGlobal: boolean;
};

const Repost = ({ eventId, authorId, loadGlobal }: RepostProps) => {
  const { reposts, selected } = useReposts(eventId, authorId, loadGlobal);

  return (
    <a
      className={`btn-ghost btn-sm hover:bg-transparent btn content-center rounded-none ${
        selected ? 'text-iris-green' : 'hover:text-iris-green text-neutral-500'
      }`}
      onClick={(e) => doRepost(e, eventId, authorId)}
    >
      <ArrowPathIcon width={18} />
      {reposts.size || ''}
    </a>
  );
};

export default memo(Repost);

const doRepost = (e, eventId: UID, authorId: UID) => {
  e.preventDefault();
  e.stopPropagation();

  if (repostManager.hasIndex(eventId, authorId)) return; // Direct check to avoid waiting for the event to be updated

  Events.publish({
    kind: 6,
    tags: [
      ['e', STR(eventId) as string, '', 'mention'],
      ['p', STR(authorId) as string],
    ],
    content: '',
  });

  repostManager.addIndex(eventId, authorId); // Quick update to avoid waiting for the event to be updated
};

export const useReposts = (eventId: UID, myId: UID, loadGlobal: boolean) => {
  const [reposts, setReposts] = useState<Set<RepostContainer>>(new Set());
  const [selected, setSelected] = useState<boolean>(false);
  const isMounted = useIsMounted();

  useEffect(() => {
    let onUpdated = throttle(
      () => {
        if (!isMounted()) return;
        setReposts(new Set(repostManager.reposts.get(eventId)));
        setSelected(repostManager.index.get(myId)?.has(eventId) || false);
      },
      1000,
      { leading: true, trailing: false },
    );

    onUpdated(); // Set initial Replies count.
    repostManager.onEvent.addListener(eventId, onUpdated);

    if (!loadGlobal) return; // Do not subscribe on relay server as only WoT likes are showen on the event.

    // Subscribe
    //let unsub = Events.getReposts(eventId, handleReposts);

    return () => {
      repostManager.onEvent.removeListener(eventId, onUpdated);
    };
  }, [eventId]);

  return { reposts, selected };
};
