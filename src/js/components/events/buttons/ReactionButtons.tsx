import { memo } from 'preact/compat';
import { useEffect, useState, useCallback } from 'preact/hooks';
import { Event } from 'nostr-tools';
import Show from '@/components/helpers/Show';
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


let settings: any = {};
localState.get('settings').on((s) => (settings = s));

const ReactionButtons = (props) => {
  const event = props.event as Event;
  const standalone = props.standalone;
  const wot = props?.wot;

  const [loadGlobal, setLoadGlobal] = useState<boolean>(false);
  const { likes, onLike } = useLikes(event.id, event.pubkey, loadGlobal);
  const { zapAmountByUser, formattedZapAmount } = useZaps(event.id, loadGlobal);
  const reposts = useReposts(event.id, loadGlobal);



  return (
    <>
      <Show when={standalone}>
        <ReactionsList
          event={event}
          wot={wot}
          likes={likes}
          zapAmountByUser={zapAmountByUser}
          formattedZapAmount={formattedZapAmount}
          reposts={reposts}
        />
      </Show>
      <div className="flex">
        <ReplyButton event={event} standalone={standalone} />
        <Show when={settings.showReposts !== false}>
          <Repost event={event} />
        </Show>
        <Show when={settings.showLikes !== false}>
          <Like standalone={standalone} likedBy={likes} onLike={onLike} />
        </Show>
        <Show when={settings.showZaps !== false}>
          <Zap event={event} />
        </Show>
        <TrustReactionButtons event={event} />
        <Show when={standalone}>
        <Globe
          onClick={setLoadGlobal}
          size={20}
          title="Load events from outside your network"
          className="btn flex justify-end"
        />
        </Show>
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
      reactionManager.submitLike(messageId, author, value);
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
