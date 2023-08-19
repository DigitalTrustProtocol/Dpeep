import React, { useEffect, useState } from 'react';

import SocialNetwork from '../../nostr/SocialNetwork';
import Show from '../helpers/Show';
import SafeImg from '../SafeImg';

import profileManager from '../../dwotr/ProfileManager';
import { ProfileMemory } from '../../dwotr/model/ProfileRecord';
import { useKey } from '@/dwotr/hooks/useKey';
import { useIsMounted } from '@/dwotr/hooks/useIsMounted';

type Props = {
  str: string | undefined;
  hidePicture?: boolean;
  showTooltip?: boolean;
  activity?: string;
  onClick?: () => void;
  width: number;
};

function getProfile(hexKey: string, profile: any, hasError: boolean, hidePicture: boolean = false, width?: number) {
  let hasPic = profile?.picture && !hasError && !hidePicture && !SocialNetwork.isBlocked(hexKey);
  let avatar = !hasPic ? profileManager.createImageUrl(hexKey, width) : '';

  return { ...profile, hasPic, avatar };
}

const MyAvatar: React.FC<Props> = (props) => {
  const isMounted = useIsMounted();
  const { hexKey, uid } = useKey(props.str);

  const [profile, setProfile] = useState<any>(
    getProfile(hexKey, profileManager.getMemoryProfile(uid), false, props?.hidePicture, props.width),
  );

  const [activity] = useState<string | null>(null); // TODO

  const [hasError, setHasError] = useState<boolean>(false);

  useEffect(() => {
    const handleEvent = (e: any) => {
      if (!isMounted()) return;
      let p = e.detail as ProfileMemory;

      setProfile(getProfile(hexKey, p, hasError, props?.hidePicture, props.width));
    };

    // uid follows the hexKey automatically
    setProfile(getProfile(hexKey, profileManager.getMemoryProfile(uid), false, props?.hidePicture, props.width));

    let unsub = profileManager.subscribe(hexKey, handleEvent);
    return () => {
      unsub?.();
    };
  }, [hexKey]);

  const width = props.width;
  const isActive = ['online', 'active'].includes(activity || '');
  const hasPic = profile?.hasPic;
  //const hasPic = picture && !hasError && !props.hidePicture && !SocialNetwork.isBlocked(hexKey || '');

  return (
    <div
      style={{
        maxWidth: `${width}px`,
        maxHeight: `${width}px`,
        cursor: props.onClick ? 'pointer' : undefined,
      }}
      className={`inline-flex flex-col flex-shrink-0 items-center justify-center relative select-none ${
        hasPic ? 'has-picture' : ''
      } ${props.showTooltip ? 'tooltip' : ''} ${isActive ? activity : ''}`}
      onClick={props.onClick}
    >
      <div>
        <Show when={hasPic}>
          <SafeImg
            className="object-cover rounded-full"
            src={profile?.picture || ''}
            width={width}
            square={true}
            onError={() => setHasError(true)}
          />
        </Show>
        <Show when={!hasPic}>
          <img width={width} className="max-w-full rounded-full" src={profile?.avatar || ''} />
        </Show>
      </div>
      <Show when={props.showTooltip && profile?.name}>
        <span className="tooltiptext">{profile?.name}</span>
      </Show>
    </div>
  );
};

export default MyAvatar;
