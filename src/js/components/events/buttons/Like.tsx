import { memo } from 'preact/compat';
import { HeartIcon } from '@heroicons/react/24/outline';
import { HeartIcon as HeartIconFull } from '@heroicons/react/24/solid';

import { useState, useEffect, useCallback } from 'preact/hooks';

import Key from '@/nostr/Key';
import { ID, STR, UID } from '@/utils/UniqueIds';
import { useIsMounted } from '@/dwotr/hooks/useIsMounted';
import reactionManager from '@/dwotr/ReactionManager';
import { throttle } from 'lodash';
import relaySubscription from '@/dwotr/network/RelaySubscription';
import Helpers from '@/utils/Helpers';

type LikeProps = {
  eventId: UID;
  eventAuthor: string;
  loadGlobal?: boolean;
  standalone?: boolean;
};

const Like = ({ eventId, eventAuthor, standalone, loadGlobal }:LikeProps) => {
  
  const { likes, liked, onLike } = useLikes(eventId, eventAuthor, !!loadGlobal);

  const likeBtnClicked = (e, newValue) => {
     e.preventDefault();
     e.stopPropagation();

     onLike(newValue);
  }
     
  return (
    <a
      className={`btn-ghost btn-sm justify-center hover:bg-transparent btn content-center rounded-none ${
        liked ? 'text-iris-red' : 'hover:text-iris-red text-neutral-500'
      }`}
      onClick={(e) => likeBtnClicked(e, !liked)}
    >
      {liked ? <HeartIconFull width={18} /> : <HeartIcon width={18} />}
      {Helpers.formatAmount(likes.size) || ''}
    </a>
  );
};

export default memo(Like);


export const useLikes = (eventId: UID, eventAuthor: string, loadGlobal: boolean) => {
  const [likes, setLikes] = useState(new Set<UID>());
  //const [downVotes, setDownVotes] = useState(new Set<UID>()); 
  const [liked, setLiked] = useState(false);
  const isMounted = useIsMounted();

  const onLike = useCallback((active: boolean) => {
      const value = active ? 1 : 0;
      reactionManager.submitLike(STR(eventId) as string, eventAuthor, value);
      setLikes(new Set(reactionManager.getLikes(eventId)));
      setLiked(active);
    },
    [eventId, eventAuthor, setLikes, setLiked]
  );

  useEffect(() => {
    const setLikesThrottle = throttle(() => {
      if (!isMounted()) return;
      const likes = reactionManager.getLikes(eventId);
      setLikes(new Set(likes)); // Update likes state with new likes set
    }, 500, { leading: true, trailing: true });

    // Set initial likes
    setLikesThrottle();

    reactionManager.onEvent.addListener(eventId, setLikesThrottle);

    // Set initial liked state
    setLiked(reactionManager.getLikes(eventId).has(ID(Key.getPubKey())));

    if (!loadGlobal) return; // Do not subscribe on relay server as only WoT likes are showen on the event.
    // Subscribe
    let unsub = reactionManager.subscribeRelays(eventId);

    // Return cleanup function
    return () => {
      relaySubscription.off(unsub); // Unsubscribe from relay server
      reactionManager.onEvent.removeListener(eventId, setLikesThrottle);
    };
  }, [eventId, loadGlobal, setLikes, setLiked]);


  return { likes, liked, onLike };
};
