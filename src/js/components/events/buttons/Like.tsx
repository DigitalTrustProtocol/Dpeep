import { HeartIcon } from '@heroicons/react/24/outline';
import { HeartIcon as HeartIconFull } from '@heroicons/react/24/solid';

import { useState, useEffect } from 'preact/hooks';

import Key from '@/nostr/Key';
import { ID } from '@/utils/UniqueIds';

const Like = ({ likedBy, onLike, standalone }) => {
 
  const [liked, setLiked] = useState(false);

  useEffect(() => {
    if (likedBy.has(ID(Key.getPubKey()))) 
      setLiked(true);
  }, [likedBy]);

  const likeBtnClicked = (e, newValue) => {
     e.preventDefault();
     e.stopPropagation();

     onLike(newValue);
     setLiked(newValue);
  }
     
  return (
    <a
      className={`btn-ghost btn-sm justify-center hover:bg-transparent btn content-center rounded-none ${
        liked ? 'text-iris-red' : 'hover:text-iris-red text-neutral-500'
      }`}
      onClick={(e) => likeBtnClicked(e, !liked)}
    >
      {liked ? <HeartIconFull width={18} /> : <HeartIcon width={18} />}
      {!standalone ? likedBy.size || '' : ''}
    </a>
  );
};

export default Like;
