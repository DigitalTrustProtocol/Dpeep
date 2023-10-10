import { useEffect, useState } from 'react';
import { translate as t } from '../../translations/Translation.mjs';
import followManager from '@/dwotr/FollowManager';
import { useKey } from '@/dwotr/hooks/useKey';
import profileManager from '@/dwotr/ProfileManager';

type Props = {
  id: string;
  className?: string;
};

const Follow = ({ id, className }: Props) => {
  let { uid, myId } = useKey(id);

  const activeClass = 'following';
  const action = t('follow_btn');
  const actionDone = t('following_btn');
  const hoverAction = t('unfollow_btn');

  const [hover, setHover] = useState(false);
  const [isFollowed, setIsFollowed] = useState(false);

  useEffect(() => {
    setIsFollowed(followManager.getItem(myId)?.follows?.has(uid) || false);
  }, [id]);

  const handleMouseEnter = () => {
    setHover(true);
  };

  const handleMouseLeave = () => {
    setHover(false);
  };

  const onClick = (e) => {
    e.preventDefault();
    const newValue = !isFollowed;
    if(newValue) {
      followManager.follow([uid]);
          // Load profile from start
      profileManager.mapProfiles([uid], undefined, undefined, true);
    } else {
      followManager.unfollow([uid]);

      // Remove profile from feed!?
    }
    followManager.publish();

  };

  let buttonText;
  if (isFollowed && hover) {
    buttonText = hoverAction;
  } else if (isFollowed && !hover) {
    buttonText = actionDone;
  } else {
    buttonText = action;
  }

  return (
    <button
      className={`btn ${className} ${isFollowed ? activeClass : ''}`}
      onClick={onClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {t(buttonText)}
    </button>
  );
};

export default Follow;
