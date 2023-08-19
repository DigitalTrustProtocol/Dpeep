import React, { useEffect, useState } from 'react';
import { sha256 } from '@noble/hashes/sha256';
import Identicon from 'identicon.js';

import Key from '../../nostr/Key';
import SocialNetwork from '../../nostr/SocialNetwork';
import Show from '../helpers/Show';
import SafeImg from '../SafeImg';
import profileManager from '../../dwotr/ProfileManager';
import { ProfileMemory } from '../../dwotr/model/ProfileRecord';
import { ProfileEvent } from '../../dwotr/network/ProfileEvent';
import { ID, STR } from '@/utils/UniqueIds';

type Props = {
  str: unknown;
  hidePicture?: boolean;
  showTooltip?: boolean;
  activity?: string;
  onClick?: () => void;
  width: number;
};

type State = {
  picture: string | null;
  name: string | null;
  activity: string | null;
  avatar: string | null;
  hasError: boolean;
};

  const hex = React.useMemo(() => Key.toNostrHexAddress(props.str as string), [props.str]);

  useEffect(() => {
    const updateAvatar = () => {
      const hash = sha256(hex || (props.str as string));
      const hexVal = Array.from(new Uint8Array(hash))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');

      const identicon = new Identicon(hexVal, {
        width: props.width,
        format: 'svg',
      });

      setAvatar(`data:image/svg+xml;base64,${identicon.toString()}`);
    };

    if (hex) {
      updateAvatar();

  componentDidMount() {
    const pub = this.props.str as string;
    if (!pub) {
      return;
    }

    this.updateAvatar();

    this.hex = Key.toNostrHexAddress(pub);
    if (this.hex) {
      this.unsub = SocialNetwork.getProfile(this.hex, (profile) => {
        profile &&
          this.setState({
            // TODO why profile undefined sometimes?
            picture: profile.picture,
            name: profile.name,
          });
      });
    }

      return () => unsub?.();
    }
    this.unsub?.();
  }

  const width = props.width;
  const isActive = ['online', 'active'].includes(activity || '');
  const hasPic = picture && !hasError && !props.hidePicture && !SocialNetwork.isBlocked(hex || '');

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
            src={picture || ''}
            width={width}
            square={true}
            onError={() => setHasError(true)}
          />
        </Show>
        <Show when={!hasPic}>
          <img width={width} className="max-w-full rounded-full" src={avatar || ''} />
        </Show>
      </div>
      <Show when={props.showTooltip && name}>
        <span className="tooltiptext">{name}</span>
      </Show>
    </div>
  );
};

export default MyAvatar;
