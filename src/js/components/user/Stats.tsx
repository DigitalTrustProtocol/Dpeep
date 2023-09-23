import { memo } from 'react';
import { useState, useEffect } from 'preact/hooks';
import throttle from 'lodash/throttle';
import { Link } from 'preact-router';

import { STR, UID } from '@/utils/UniqueIds.ts';

import Key from '../../nostr/Key';
import { translate as t } from '../../translations/Translation.mjs';
import Show from '../helpers/Show';

import Name from './Name';
import ProfileScoreLinks from '../../dwotr/components/ProfileScoreLinks';
import followManager from '@/dwotr/FollowManager';
import { useIsMounted } from '@/dwotr/hooks/useIsMounted';
import Globe from '@/dwotr/components/buttons/Globe';
import { useKey } from '@/dwotr/hooks/useKey';
import graphNetwork from '@/dwotr/GraphNetwork';

const ProfileStats = ({ address }) => {
  const { uid: profileId, myId, bech32Key, hexKey, isMe } = useKey(address);

  const [loadGlobal, setLoadGlobal] = useState<boolean>(false);
  const { contactsCount, followedByCount, knownFollowers } = useProfileFollows(
    profileId,
    myId,
    loadGlobal,
  );

  return (
    <div>
      <div className="text-sm flex gap-4">
        <Link href={`/follows/${bech32Key}`}>
          <b>{contactsCount}</b>
          <span className="text-neutral-500"> {t('following')}</span>
        </Link>
        <Globe size={16} onClick={setLoadGlobal} alt="Load global followers events" />
        <Link href={`/followers/${bech32Key}`}>
          <b>{followedByCount}</b>
          <span className="text-neutral-500"> {t('known_followers')}</span>
        </Link>
        <ProfileScoreLinks str={hexKey} />
      </div>
      <Show when={!isMe && knownFollowers.length > 0}>
        <div className="text-neutral-500">
          <small>
            Followed by&nbsp;
            {knownFollowers.slice(0, 3).map((follower, index) => (
              <span key={follower}>
                <Show when={index > 0}>{', '}</Show>
                <Link
                  className="hover:underline"
                  href={`/${Key.toNostrBech32Address(follower, 'npub')}`}
                >
                  <Name pub={follower} hideBadge={true} />
                </Link>
                &nbsp;
              </span>
            ))}
            <Show when={knownFollowers.length > 3}>
              <span>
                &nbsp; and <b>{knownFollowers.length - 3}</b> other users in your network
              </span>
            </Show>
          </small>
        </div>
      </Show>
      <Show when={followManager.isFollowingMe(profileId)}>
        <div className="text-neutral-500">
          <small>{t('follows_you')}</small>
        </div>
      </Show>
    </div>
  );
};

export default memo(ProfileStats);

const useProfileFollows = (profileId: UID, myId: UID, loadGlobal: boolean) => {
  const [contactsCount, setContactsCount] = useState<number>(0);
  const [followedByCount, setFollowedByCount] = useState<number>(0);
  const [knownFollowers, setKnownFollowers] = useState<string[]>([]);

  const isMounted = useIsMounted();

  useEffect(() => {
    const followedByCallback = throttle(
      () => {
        if (!isMounted()) return;
        let item = followManager.getItem(profileId);
        if (!item) return;

        setFollowedByCount(item?.followedBy.size || 0);


        let list: Array<string> = [];
        for(const id of item?.followedBy) {
          if(id == myId) continue;
          if(!followManager.isFollowing(id, myId)) continue;
          if(!graphNetwork.isTrusted(id)) continue;

          list.push(STR(id));
        }

        setKnownFollowers(list);
      },
      500,
      { leading: true },
    );

    const contactsCallback = throttle(
      () => {
        if (!isMounted()) return;
        let item = followManager.getItem(profileId);
        if (!item) return;

        setContactsCount(item?.follows.size || 0);
      },
      500,
      { leading: true },
    );

    contactsCallback();
    followedByCallback();

    if (!loadGlobal) return;
    let sub1 = followManager.subscribeContacts(profileId, contactsCallback);
    let sub2 = followManager.subscribeFollowedBy(profileId, followedByCallback);

    return () => {
      sub1?.();
      sub2?.();
    };
  }, [profileId, loadGlobal]);

  return { contactsCount, followedByCount, knownFollowers };
};


