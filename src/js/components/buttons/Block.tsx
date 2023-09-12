import { useEffect, useState } from 'react';

import { translate as t } from '../../translations/Translation.mjs';
import Name from '../user/Name';
import blockManager from '@/dwotr/BlockManager';
import { useKey } from '@/dwotr/hooks/useKey';

type Props = {
  id: string;
  showName?: boolean;
  className?: string;
  onClick?: (e) => void;
};

const Block = ({ id, showName = false, className, onClick }: Props) => {
  const { uid } = useKey(id);

  const [hover, setHover] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);

  useEffect(() => {
    setIsBlocked(blockManager.isBlocked(uid));
  }, [id]);

  const onButtonClick = (e) => {
    e.preventDefault();
    const newValue = !isBlocked;

    blockManager.onProfileBlock(uid, newValue);

    setIsBlocked(newValue);

    onClick?.(e);
  };

  const buttonText = isBlocked ? (hover ? t('unblock') : t('blocked')) : t('block');

  return (
    <button
      className={`block-btn ${isBlocked ? 'blocked' : ''} ${className || ''}`}
      onClick={onButtonClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <span>
        {buttonText} {showName && <Name pub={id} hideBadge={true} />}
      </span>
    </button>
  );
};

export default Block;
