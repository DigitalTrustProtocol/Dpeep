import { memo } from 'preact/compat';
import { HeartIcon } from '@heroicons/react/24/outline';
import { HeartIcon as HeartIconFull } from '@heroicons/react/24/solid';

import { useState, useEffect, useCallback } from 'preact/hooks';

import Key from '@/nostr/Key';
import { ID, STR, UID } from '@/utils/UniqueIds';
import { useIsMounted } from '@/dwotr/hooks/useIsMounted';
import reactionManager from '@/dwotr/ReactionManager';
import { throttle } from 'lodash';

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
      {!standalone ? likes.size || '' : ''}
    </a>
  );
};

export default memo(Like);


export const useLikes = (eventId: UID, eventAuthor: string, loadGlobal: boolean) => {
  const [likes, setLikes] = useState(new Set<UID>());
  //const [downVotes, setDownVotes] = useState(new Set<UID>()); 
  const [liked, setLiked] = useState(false);
  const isMounted = useIsMounted();

  const onLike = useCallback(
    (active: boolean) => {
      const value = active ? 1 : 0;
      //const container = eventManager.get(eventId);
      reactionManager.submitLike(STR(eventId) as string, eventAuthor, value);
      setLikes(new Set(reactionManager.getLikes(eventId)));
      setLiked(active);
    },
    [eventId, eventAuthor]
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
    setLikesThrottle(reactionManager.getLikes(eventId));

    if (likes.has(ID(Key.getPubKey()))) 
      setLiked(true);


    if (!loadGlobal) return; // Do not subscribe on relay server as only WoT likes are showen on the event.
    // Subscribe
    let unsub = reactionManager.subscribeRelays(STR(eventId) as string, handleLikes);

    // Return cleanup function
    return () => {
      unsub?.();
    };
  }, [eventId, loadGlobal]);

  return { likes, liked, onLike };
};
