import { useEffect, useState } from 'react';

import { translate as t } from '../../translations/Translation.mjs';
import Name from '../user/Name';
import muteManager from '@/dwotr/MuteManager';
import { useKey } from '@/dwotr/hooks/useKey';

type Props = {
  id: string;
  showName?: boolean;
  className?: string;
  onClick?: (e) => void;
};

const Mute = ({ id, showName = false, className, onClick }: Props) => {
  const { uid } = useKey(id);
  const [hover, setHover] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  useEffect(() => {
    setIsMuted(muteManager.isMuted(uid));
  }, [id]);

  const onButtonClick = (e) => {
    e.preventDefault();
    const newValue = !isMuted;

    muteManager.onMute(uid, newValue, false, false);

    setIsMuted(newValue);

    onClick?.(e);
  };

  const buttonText = isMuted ? (hover ? t('unmute') : t('muted')) : t('mute');

  return (
    <button
      className={`mute-btn ${isMuted ? 'muted' : ''} ${className || ''}`}
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

export default Mute;
