import Name from '@/components/user/Name';
import { useEffect, useState } from 'react';
import { translate as t } from '../../../translations/Translation.mjs';
import graphNetwork from '@/dwotr/GraphNetwork';
import { ID } from '@/utils/UniqueIds';
import { EntityType } from '@/dwotr/model/Graph';


type Props = {
  id: string;
  showName?: boolean;
  className?: string;
  onClick?: (e) => void;
};

const Distrust = ({ id, showName = false, className, onClick }: Props) => {
  const [hover, setHover] = useState(false);
  const [isDistrusted, setIsDistrusted] = useState(false);

  useEffect(() => {
    setIsDistrusted(graphNetwork.isDistrusted(ID(id)));
  }, [id]);

  const onButtonClick = (e) => {
    e.preventDefault();
    const newValue = !isDistrusted;

    let val = newValue ? -1 : 0;
    graphNetwork.publishTrust(id, val, EntityType.Key);

    onClick?.(e);
  };

  const buttonText = isDistrusted ? (hover ? t('Undistrust') : t('Distrusted')) : t('Distrust');

  return (
    <button
      className={`distrust ${isDistrusted ? 'distrusted' : ''} ${className || 'distrusted'}`}
      onClick={onButtonClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <span>
        {buttonText} {showName ? <Name pub={id} hideBadge={true} /> : ''}
      </span>
    </button>
  );
};

export default Distrust;
