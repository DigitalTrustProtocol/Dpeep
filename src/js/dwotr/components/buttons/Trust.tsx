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

const Trust = ({ id, showName = false, className, onClick }: Props) => {
  const [hover, setHover] = useState(false);
  const [isTrusted, setIsTrusted] = useState(false);

  useEffect(() => {
    setIsTrusted(graphNetwork.isTrusted(ID(id)));
  }, [id]);

  const onButtonClick = (e) => {
    e.preventDefault();
    const newValue = !isTrusted;

    let val = newValue ? 1 : 0;
    graphNetwork.publishTrust(id, val, EntityType.Key);

    onClick?.(e);
  };

  const buttonText = isTrusted ? (hover ? t('Untrust') : t('Trusted')) : t('Trust');

  return (
    <button
      className={`trust ${isTrusted ? 'trusted' : ''} ${className || 'trusted'}`}
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

export default Trust;
