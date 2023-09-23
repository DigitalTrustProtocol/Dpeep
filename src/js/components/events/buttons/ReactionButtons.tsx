import { memo } from 'preact/compat';
import { useEffect, useState, useCallback } from 'preact/hooks';
import { Event } from 'nostr-tools';
import Show from '@/components/helpers/Show';
import localState from '@/state/LocalState.ts';

import ReactionsList from '../ReactionsList';

import Like from './Like';
import Reply from './Reply';
import Repost from './Repost';
import Zap from './Zap';
import TrustReactionButtons from '@/dwotr/components/TrustReactionButtons';
import Globe from '@/dwotr/components/buttons/Globe';
import { useIsMounted } from '@/dwotr/hooks/useIsMounted';
import { throttle } from 'lodash';
import { ID, UID } from '@/utils/UniqueIds';
import reactionManager from '@/dwotr/ReactionManager';
import Events from '@/nostr/Events';
import { decodeInvoice, formatAmount } from '@/utils/Lightning';
import { getZappingUser } from '@/nostr/utils';
import EventDB from '@/nostr/EventDB';

let settings: any = {};
localState.get('settings').on((s) => (settings = s));

const ReactionButtons = (props) => {
  const event = props.event as Event;
  const standalone = props.standalone;
  const wot = props.wot;

  const [loadGlobal, setLoadGlobal] = useState<boolean>(false);
  const { likes, onLike } = useLikes(event.id, event.pubkey, loadGlobal);
  const { zapAmountByUser, formattedZapAmount } = useZaps(event.id, loadGlobal);
  const reposts = useReposts(event.id, loadGlobal);

  return (
    <>
      {props.standalone && (
        <ReactionsList
          event={event}
          wot={wot}
          likes={likes}
          zapAmountByUser={zapAmountByUser}
          formattedZapAmount={formattedZapAmount}
          reposts={reposts}
        />
      )}
      <div className="flex gap-4">
        <Reply event={event} standalone={standalone} />
        <Show when={settings.showReposts !== false}>
          <Repost event={event} />
        </Show>
        <Show when={settings.showLikes !== false}>
          <Like standalone={props.standalone} likedBy={likes} onLike={onLike} />
        </Show>
        <Show when={settings.showZaps !== false}>
          <Zap event={event} />
        </Show>
        <TrustReactionButtons event={event} wot={wot} />
        <Globe
          onClick={setLoadGlobal}
          size={20}
          alt="Load events from outside your network"
          className="btn flex justify-end"
        />
      </div>
    </>
  );
};

export default memo(ReactionButtons);

const useLikes = (messageId: string, author: string, loadGlobal: boolean) => {
  const [likes, setLikes] = useState(new Set<UID>());
  const isMounted = useIsMounted();

  const onLike = useCallback(
    (active: boolean) => {
      const value = active ? 1 : 0;
      reactionManager.onLike(messageId, author, value);
      setLikes(new Set(reactionManager.getLikes(ID(messageId))));
    },
    [messageId],
  );

  useEffect(() => {
    const setLikesThrottle = throttle((likes: Set<UID>) => {
      if (!isMounted()) return;
      setLikes(new Set(likes)); // Update likes state with new likes set
    }, 500);

    const handleLikes = (likes: Set<UID>, downVotes: Set<UID>) => {
      setLikesThrottle(likes);
    };

    // Set initial likes
    setLikesThrottle(reactionManager.getLikes(ID(messageId)));

    if (!loadGlobal) return; // Do not subscribe on relay server as only WoT likes are showen on the event.
    // Subscribe
    let unsub = reactionManager.subscribeRelays(messageId, handleLikes);

    // Return cleanup function
    return () => {
      unsub?.();
    };
  }, [messageId, loadGlobal]);

  return { likes, onLike };
};

const useZaps = (messageId: string, loadGlobal: boolean) => {
  const [zapAmountByUser, setZapAmountByUser] = useState(new Map<string, number>());
  const [formattedZapAmount, setFormattedZapAmount] = useState('');

  const isMounted = useIsMounted();

  useEffect(() => {
    const handleZaps = (zaps) => {
      if (!isMounted()) return;

      const zapData = new Map<string, number>();
      let totalZapAmount = 0;
      const zapEvents = Array.from(zaps?.values()).map((eventId) => EventDB.get(eventId));
      zapEvents.forEach((zapEvent) => {
        const bolt11 = zapEvent?.tags.find((tag) => tag[0] === 'bolt11')?.[1];
        if (!bolt11) {
          console.log('Invalid zap, missing bolt11 tag');
          return;
        }
        const decoded = decodeInvoice(bolt11);
        const amount = (decoded?.amount || 0) / 1000;
        totalZapAmount += amount;
        const zapper = getZappingUser(zapEvent);
        if (zapper) {
          const existing = zapData.get(zapper) || 0;
          zapData.set(zapper, existing + amount);
        }
      });

      setZapAmountByUser(zapData);
      setFormattedZapAmount(totalZapAmount > 0 ? formatAmount(totalZapAmount) : '');
    };

    // Set initial zaps
    // TODO: This is not working, need to fix

    if (!loadGlobal) return; // Do not subscribe on relay server as only WoT likes are showen on the event.

    // Subscribe
    let unsub = Events.getZaps(messageId, handleZaps);

    // Return cleanup function
    return () => {
      unsub?.();
    };
  }, [messageId, loadGlobal]);

  return { zapAmountByUser, formattedZapAmount };
};

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
