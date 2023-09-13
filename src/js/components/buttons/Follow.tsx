import { useEffect, useState } from 'react';

import Key from '../../nostr/Key';
import SocialNetwork from '../../nostr/SocialNetwork';
import { translate as t } from '../../translations/Translation.mjs';

type Props = {
  id: string;
  className?: string;
};

const Follow = ({ id, className }: Props) => {
  const activeClass = 'following';
  const action = t('follow_btn');
  const actionDone = t('following_btn');
  const hoverAction = t('unfollow_btn');

  const [hover, setHover] = useState(false);
  const [isFollowed, setIsFollowed] = useState(false);

  useEffect(() => {
    SocialNetwork.getFollowedByUser(Key.getPubKey(), (follows) => {
      const hex = Key.toNostrHexAddress(id);
      const follow = hex && follows?.has(hex);
      setIsFollowed(!!follow);
    });
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
    const hex = Key.toNostrHexAddress(id);
    if (!hex) return;
    SocialNetwork.setFollowed(hex, newValue);
    setIsFollowed(newValue);
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
