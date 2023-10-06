import { memo } from 'react';
import { useState, useEffect } from 'preact/hooks';
import throttle from 'lodash/throttle';
import { Link } from 'preact-router';

import { ID, STR, UID } from '@/utils/UniqueIds.ts';

import Key from '../../nostr/Key';
import { translate as t } from '../../translations/Translation.mjs';
import Show from '../helpers/Show';

import Name from './Name';
import ProfileScoreLinks from '../../dwotr/components/ProfileScoreLinks';
import followManager, { FollowItem } from '@/dwotr/FollowManager';
import { useIsMounted } from '@/dwotr/hooks/useIsMounted';
import Globe from '@/dwotr/components/buttons/Globe';
import { useKey } from '@/dwotr/hooks/useKey';
import graphNetwork from '@/dwotr/GraphNetwork';
import { Event } from 'nostr-tools';
import { ContactsKind } from '@/dwotr/network/WOTPubSub';
import relayManager from '@/dwotr/RelayManager';
import relaySubscription from '@/dwotr/network/RelaySubscription';

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
        <Link href={`/followers/${bech32Key}`}>
          <b>{followedByCount}</b>
          <span className="text-neutral-500"> {t('known_followers')}</span>
        </Link>
        <ProfileScoreLinks str={hexKey} />
        <Globe
          size={24}
          onClick={setLoadGlobal}
          alt="Load global followers events"
          className="flex justify-end"
        />
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

        const item = followManager.getItem(profileId);
        if (followedByCount === item?.followedBy.size) return;

        setFollowedByCount(item?.followedBy.size || 0);

        let list: Array<string> = [];
        for (const id of item?.followedBy) {
          if (id == myId) continue;
          if (!followManager.isFollowing(id, myId)) continue;
          if (!graphNetwork.isTrusted(id)) continue;

          list.push(STR(id) as string);
        }

        setKnownFollowers(list);
      },
      500,
      { leading: true },
    );

    const contactsCallback = (item: FollowItem) => {
      if (!isMounted()) return;

      setContactsCount(item?.follows.size || 0);
    };

    let item = followManager.getItem(profileId);
    contactsCallback(item);
    followedByCallback();

    followManager.onEvent.addListener(profileId, contactsCallback);

    if (!loadGlobal) return;
    followManager.onceContacts(profileId);
    let unsubID = followManager.mapFollowedBy(profileId, followedByCallback);

    return () => {
      followManager.onEvent.removeListener(profileId, contactsCallback);
      relaySubscription.off(unsubID);
    };
  }, [profileId, loadGlobal]);

  return { contactsCount, followedByCount, knownFollowers };
};
