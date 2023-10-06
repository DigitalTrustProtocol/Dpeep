import { useEffect, useState } from 'react';
import { route } from 'preact-router';

import localState from '../../state/LocalState.ts';
import { translate as t } from '../../translations/Translation.mjs';
import Helpers from '../../utils/Helpers';
import Follow from '../buttons/Follow';
import Show from '../helpers/Show';
import HyperText from '../HyperText';

import Avatar from './Avatar';
import ProfileDropdown from './Dropdown';
import Name from './Name';
import ProfilePicture from './ProfilePicture';
import TrustProfileButtons from '../../dwotr/components/TrustProfileButtons';
import Stats from './Stats';
import blockManager from '@/dwotr/BlockManager.ts';
import { useKey } from '@/dwotr/hooks/useKey.tsx';
import { useProfile } from '@/dwotr/hooks/useProfile.ts';

type ProfileCardProps = {
  hexPub: string;
  npub: string;
};

const ProfileCard = (props: ProfileCardProps) => {
  const { hexPub, npub } = props;
  const { uid, isMe } = useKey(hexPub);
  const { profile } = useProfile(uid, true);

  const [lightning, setLightning] = useState<string>();
  const [website, setWebsite] = useState<string>('');
  const [loggedIn, setLoggedIn] = useState<boolean>(false);
  const [nostrAddress, setNostrAddress] = useState<string>('');
  const [rawDataJson, setRawDataJson] = useState<string>('');
  const [isMyProfile, setIsMyProfile] = useState<boolean>(false);
  const [blocked, setBlocked] = useState<boolean>(false);


  useEffect(() => {
    setIsMyProfile(isMe);
    setBlocked(blockManager.isBlocked(uid));

    const unsubLoggedIn = localState.get('loggedIn').on((loggedIn) => {
      setLoggedIn(loggedIn);
    });

    return () => {
      unsubLoggedIn();
    };
  }, [hexPub]);

  useEffect(() => {
    if (!profile) return;
    setLightning(getLightning(profile));
    setWebsite(getWebsite(profile?.website));
  }, [profile]);

  const profilePicture = !blocked ? (
    <ProfilePicture
      key={`${hexPub}picture`}
      picture={profile?.picture}
      onError={() => /* Handle error here */ null}
    />
  ) : (
    <Avatar key={`${npub}avatar`} str={npub} hidePicture={true} width={128} />
  );
  const onClickHandler = () => !loggedIn && localState.get('showLoginModal').put(true);

  return (
    <div key={`${hexPub}details`}>
      <div className="mb-2 mx-2 md:px-4 md:mx-0 flex flex-col gap-2">
        <div className="flex flex-row">
          <div className="-mt-24" style={{ 'max-width': '136px' }}>
            {profilePicture}
          </div>
          <div className="flex-1 justify-end items-center flex gap-2">
            <div onClick={onClickHandler}>
              {/* <a href={'/history/' + hexPub} className="link px-2">
                History
              </a> */}
              <a href={'/graph/' + npub} className="link px-2">
                Web of Trust
              </a>
              <Show when={isMyProfile}>
                <a className="btn btn-sm btn-neutral" href="/profile/edit">
                  {t('edit_profile')}
                </a>
              </Show>

              <Show when={!isMyProfile}>
                <Follow key={`${hexPub}follow`} id={hexPub} />
                <button
                  className="btn btn-neutral btn-sm"
                  onClick={() => loggedIn && route(`/chat/${npub}`)}
                >
                  {t('send_message')}
                </button>
              </Show>
            </div>
            <ProfileDropdown
              hexPub={hexPub}
              npub={npub}
              rawDataJson={rawDataJson}
              isMyProfile={isMyProfile}
            />
          </div>
        </div>
        <div>
          <div className="flex-1">
            <span className="text-xl mr-2">
              <Name pub={hexPub} />
            </span>
            <small
              className={`inline-block text-iris-green ${
                profile?.nip05 && profile?.nip05valid ? 'visible' : 'invisible'
              }`}
            >
              {profile?.nip05?.replace(/^_@/, '')}
            </small>
          </div>
          <Stats address={hexPub} />
          <div className="py-2">
            <p className="text-sm">
              <HyperText textOnly={true}>{profile?.about?.slice(0, 500) || ''}</HyperText>
            </p>
            <div className="flex flex-1 flex-row align-center justify-center mt-4">
              <Show when={!isMyProfile}>
                <TrustProfileButtons str={hexPub} />
              </Show>
              <Show when={lightning}>
                <div className="flex-1">
                  <a
                    className="btn btn-sm btn-neutral"
                    href={lightning}
                    onClick={(e) => Helpers.handleLightningLinkClick(e)}
                  >
                    ⚡ {t('tip_lightning')}
                  </a>
                </div>
              </Show>
              <Show when={website}>
                <div className="flex-1">
                  <a href={website} target="_blank" rel="noopener noreferrer" className="link">
                    {website?.replace(/^https?:\/\//, '')}
                  </a>
                </div>
              </Show>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileCard;

function getWebsite(websiteProfile?: string) {
  if (!websiteProfile) return '';
  try {
    const tempWebsite = websiteProfile.match(/^https?:\/\//)
      ? websiteProfile
      : 'http://' + websiteProfile;
    const url = new URL(tempWebsite);
    return url.href.endsWith('/') ? url.href.slice(0, -1) : url.href;
  } catch (e) {
    return '';
  }
}

function getLightning(profile: any) {
  let lightning = profile.lud16 || profile.lud06;
  if (lightning && !lightning.startsWith('lightning:')) {
    lightning = 'lightning:' + lightning;
  }
  return lightning;
}
