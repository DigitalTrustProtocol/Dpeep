import React, { useEffect, useState } from 'react';

import SocialNetwork from '../../nostr/SocialNetwork';
import Show from '../helpers/Show';
import ProxyImg from '../ProxyImg.tsx';

import profileManager from '../../dwotr/ProfileManager';
import { useKey } from '@/dwotr/hooks/useKey';
import { useProfile } from '@/dwotr/hooks/useProfile';

type Props = {
  str: string | undefined;
  hidePicture?: boolean;
  showTooltip?: boolean;
  activity?: string;
  onClick?: () => void;
  width: number;
};

// Create a profile state object from the profile data
function getProfileState(profile: any, hasError: boolean, props: Props) {
  let hexKey = profile.key;
  let hasPic =
    profile?.picture && !hasError && !props?.hidePicture && !SocialNetwork.isBlocked(hexKey);
  let avatar = !hasPic ? profileManager.createImageUrl(hexKey, props.width) : '';
  let isActive = ['online', 'active'].includes(profile.activity || '');

  return { ...profile, hasPic, avatar, isActive, activity: props?.activity };
}

// MyAvatar - A component to display an avatar
const MyAvatar: React.FC<Props> = (props) => {
  const { hexKey } = useKey(props.str);
  const [hasError, setHasError] = useState<boolean>(false);
  const profile = useProfile(hexKey);
  const [state, setState] = useState<any>(null); // Will be set in useEffect

  useEffect(() => {
    if (!profile) return; // Will not set State before profile is ready

    setState(getProfileState(profile, hasError, props));
  }, [profile, hasError, props?.activity]);

  if(!state) return null; // Will return null in first render

  const width = props.width;
  const hasPic = state.hasPic;

  return (
    <div
      style={{
        maxWidth: `${width}px`,
        maxHeight: `${width}px`,
        cursor: props.onClick ? 'pointer' : undefined,
      }}
      className={`inline-flex flex-col flex-shrink-0 items-center justify-center relative select-none ${
        hasPic ? 'has-picture' : ''
      } ${props.showTooltip ? 'tooltip' : ''} ${state.isActive ? state.activity : ''}`}
      onClick={props.onClick}
    >
      <div>
        <Show when={hasPic}>
          <ProxyImg
            className="object-cover rounded-full"
            src={state.picture || ''}
            width={width}
            square={true}
            onError={() => setHasError(true)}
          />
        </Show>
        <Show when={!hasPic}>
          <img width={width} className="max-w-full rounded-full" src={state.avatar || ''} />
        </Show>
      </div>
      <Show when={props.showTooltip && state.name}>
        <span className="tooltiptext">{state.name}</span>
      </Show>
    </div>
  );
};


export default MyAvatar;

