import { memo } from 'preact/compat';
import { useEffect, useState, useCallback } from 'preact/hooks';
import { Event } from 'nostr-tools';
import localState from '@/state/LocalState.ts';

import ReactionsList from '../ReactionsList';

import Like from './Like';
import ReplyButton from './ReplyButton';
import Repost from './Repost';
import Zap from './Zap';
import TrustReactionButtons from '@/dwotr/components/TrustReactionButtons';
import Globe from '@/dwotr/components/buttons/Globe';
import { useIsMounted } from '@/dwotr/hooks/useIsMounted';
import { throttle } from 'lodash';
import { ID, UID } from '@/utils/UniqueIds';
import reactionManager from '@/dwotr/ReactionManager';
import Events from '@/nostr/Events';
import { useZaps } from '@/dwotr/hooks/useZaps';
import useVerticeMonitor from '@/dwotr/hooks/useVerticeMonitor';
import { useKey } from '@/dwotr/hooks/useKey';

let settings: any = {};
localState.get('settings').on((s) => (settings = s));

type Props = {
  event: any;
  standalone?: boolean;
  wot?: any;
};

const ReactionButtons = ({ event, standalone, wot }: Props) => {
  const { uid: eventId, myId } = useKey(event.id);
  const [loadGlobal, setLoadGlobal] = useState<boolean>(false);
  const { zapAmountByUser, formattedZapAmount } = useZaps(event.id, loadGlobal);
  //const reposts = useReposts(event.id, loadGlobal);

  return (
    <>
      {/* { standalone &&
        <ReactionsList
          event={event}
          wot={wot}
          likes={likes}
          zapAmountByUser={zapAmountByUser}
          formattedZapAmount={formattedZapAmount}
          reposts={reposts}
        />
      } */}
      <div className="flex">
        <ReplyButton eventId={eventId} standalone={standalone} />
        {settings.showReposts !== false && (
          <Repost eventId={eventId} authorId={myId} loadGlobal={loadGlobal} />
        )}
        {settings.showLikes !== false && (
          <Like
            eventId={eventId}
            eventAuthor={event.pubkey}
            standalone={standalone}
            loadGlobal={loadGlobal}
          />
        )}
        {settings.showZaps !== false && <Zap event={event} />}
        <TrustReactionButtons eventId={event.id} wot={wot} standalone={standalone} />
        {standalone && (
          <Globe
            onClick={setLoadGlobal}
            size={20}
            title="Load events from outside your network"
            className="btn flex justify-end"
          />
        )}
      </div>
    </>
  );
};

export default memo(ReactionButtons);

const useReposts = (messageId: string, loadGlobal: boolean) => {
  const [reposts, setReposts] = useState(new Set<string>());
  const isMounted = useIsMounted();

  useEffect(() => {
    const handleReposts = (repostedBy) => {
      if (!isMounted()) return;
      setReposts(new Set(repostedBy));
    };

    // Set initial reposts
    setReposts(Events.repostsByMessageId.get(messageId) || new Set<string>());

    if (!loadGlobal) return; // Do not subscribe on relay server as only WoT likes are showen on the event.

    // Subscribe
    let unsub = Events.getReposts(messageId, handleReposts);

    // Return cleanup function
    return () => {
      unsub?.();
    };
  }, [messageId, loadGlobal]);

  return reposts;
};
