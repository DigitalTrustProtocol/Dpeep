import { HeartIcon } from '@heroicons/react/24/outline';
import { HeartIcon as HeartIconFull } from '@heroicons/react/24/solid';
import { useEffect } from 'preact/hooks';

import { useState, useCallback } from 'preact/hooks';

import reactionManager from '@/dwotr/ReactionManager';
import Key from '@/nostr/Key';
import { ID, UID } from '@/utils/UniqueIds';

const Like = ({ event, standalone }) => {
  const [state, setState] = useState({
    likes: 0,
    liked: false,
    likedBy: new Set<UID>(),
  });

  const getLikes = useCallback(() => {
    const likedBy = reactionManager.getLikes(ID(event.id));
    const likes = likedBy.size;
    const liked = likedBy.has(ID(Key.getPubKey()));

    return {
      likes,
      liked,
      likedBy,
    };
  }, [setState, event.id]);

  useEffect(() => {
    // Do not subscribe on relay server as only WoT likes are showen on the event.
    // For loading all likes on the event, view the event in standalone mode

    setState(getLikes());
  }, [event]);

  const likeBtnClicked = (e) => {
    e.preventDefault();
    e.stopPropagation();

    const liked = !state.liked;
    let value = liked ? 1 : 0;
    reactionManager.onLike(event.id, event.pubkey, value);
    setState(getLikes());
  };

  return (
    <a
      className={`btn-ghost btn-sm justify-center hover:bg-transparent btn content-center gap-2 rounded-none ${
        state.liked ? 'text-iris-red' : 'hover:text-iris-red text-neutral-500'
      }`}
      onClick={(e) => likeBtnClicked(e)}
    >
      {state.liked ? <HeartIconFull width={18} /> : <HeartIcon width={18} />}
      {!standalone ? state.likes || '' : ''}
    </a>
  );
};

export default Like;
