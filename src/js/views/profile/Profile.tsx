import { useEffect, useMemo, useState } from 'preact/hooks';
import { route } from 'preact-router';

import SimpleImageModal from '@/components/modal/Image.tsx';

import { getEventReplyingTo, isRepost } from '@/nostr/utils.ts';
import useLocalState from '@/state/useLocalState.ts';
import ProfileHelmet from '@/views/profile/Helmet.tsx';

import Feed from '../../components/feed/Feed.tsx';
import Show from '../../components/helpers/Show.tsx';
import { shouldSkipProxy } from '../../components/ProxyImg.tsx';
import ProfileCard from '../../components/user/ProfileCard.tsx';
import Key from '../../nostr/Key.ts';
import { translate as t } from '../../translations/Translation.mjs';
import View from '../View.tsx';
import { useProfile } from '@/dwotr/hooks/useProfile.ts';
import { useKey } from '@/dwotr/hooks/useKey.tsx';
import blockManager from '@/dwotr/BlockManager.ts';
import { ID, UID } from '@/utils/UniqueIds.ts';
import followManager from '@/dwotr/FollowManager.ts';
import { FeedOptions } from '@/dwotr/network/WOTPubSub.ts';
import { ReactionMemoryCursor } from '@/dwotr/network/ReactionMemoryCursor.ts';

function getNpub(id: string) {
  if (!id) return Key.getPubKey(); // Default to my profile
  if (id.startsWith('npub')) return id; // Already a npub
  return '';
}

function getSource(profileId: UID) {
  if (profileId === ID(Key.getPubKey())) return 'memory'; // My profile
  
  return followManager.isAllowed(profileId) ? 'memory' : 'network';
}

function Profile(props) {
  const [npub, setNpub] = useState(getNpub(props.id));
  const { hexKey: hexPub, bech32Key, uid, isMe } = useKey(npub, false); //
  const { profile } = useProfile(uid) as any;

  const [blocked, setBlocked] = useState(false);
  const [bannerModalOpen, setBannerModalOpen] = useState(false);
  const setIsMyProfile = useLocalState('isMyProfile', false)[1];

  // many of these hooks should be moved to useProfile or hooks directory
  const banner = useMemo(() => {
    if (!profile) return;

    let bannerURL;

    try {
      bannerURL = profile.banner && new URL(profile.banner).toString();
      if (!bannerURL) {
        return;
      }

      bannerURL = shouldSkipProxy(bannerURL)
        ? bannerURL
        : `https://imgproxy.iris.to/insecure/rs:fit:948:948/plain/${bannerURL}`;

      return bannerURL;
    } catch (e) {
      console.log('Invalid banner URL', profile.banner);
      return '';
    }
  }, [profile?.banner]);

  useEffect(() => {
    setIsMyProfile(isMe);
    setBlocked(blockManager.isBlocked(ID(hexPub)));

    // SocialNetwork.getBlockedUsers((blockedUsers) => {
    //   setBlocked(blockedUsers.has(hexPub));
    // });
  }, [hexPub]);

  useEffect(() => {
    if (npub) return; // Already set

    let nostrAddress = props.id; // npub or nostr address

    if (!nostrAddress.match(/.+@.+\..+/)) {
      if (nostrAddress.match(/.+\..+/)) {
        nostrAddress = '_@' + nostrAddress;
      } else {
        nostrAddress = nostrAddress + '@iris.to';
      }
    }

    Key.getPubKeyByNip05Address(nostrAddress).then((pubKey) => {
      if (pubKey) {
        setNpub(pubKey.npub);
      } else {
        route(`/`, true); // Redirect to home if profile not found
      }
    });

    setTimeout(() => {
      window.prerenderReady = true;
    }, 1000);

    return () => {
      setIsMyProfile(false);
    };
  }, [npub]);

  

  const filterOptions = useMemo(() => {
    return [
      {
        id: 'posts'+hexPub,
        name: t('posts'),
        filter: { authors: [hexPub], kinds: [1, 6], limit: 10 },
        filterFn: (event) => !getEventReplyingTo(event) || isRepost(event),
        eventProps: { showRepliedMsg: true },
        source: getSource(uid), // All non followed users are loaded from network
      } as FeedOptions,
      {
        id: 'replies'+hexPub,
        name: t('posts_and_replies'),
        filter: { authors: [hexPub], kinds: [1, 6], limit: 10 },
        eventProps: { showRepliedMsg: true, fullWidth: false },
        source: getSource(uid),
      } as FeedOptions,
      {
        id: 'reactions'+hexPub,
        name: t('likes'),
        filter: { authors: [hexPub], kinds: [7], limit: 10 },
        source: getSource(uid),
        cursor: () => new ReactionMemoryCursor(uid),
      } as FeedOptions,
    ];
  }, [hexPub]);

  if (!hexPub) {
    return <div></div>;
  }

  if (!profile) return null; // Profile not ready yet or not found

  const title = profile.display_name || profile.name || 'Profile';
  const ogTitle = `${title} | Iris`;
  const description = `Latest posts by ${profile.display_name || profile.name || 'user'}. ${
    profile.about || ''
  }`;

  const showBanner = banner && !blocked;

  return (
    <View>
      <div
        className={`mb-4 h-48 bg-cover bg-center ${showBanner ? 'cursor-pointer' : ''}`}
        style={{
          backgroundImage: showBanner
            ? `url(${banner})`
            : 'linear-gradient(120deg, #010101 0%, #1f0f26 50%, #010101 100%)',
        }}
        onClick={() => showBanner && setBannerModalOpen(true)}
      ></div>
      <Show when={bannerModalOpen}>
        <SimpleImageModal imageUrl={profile.banner} onClose={() => setBannerModalOpen(false)} />
      </Show>
      <div>
        <ProfileHelmet
          title={title}
          description={description}
          picture={profile.picture}
          ogTitle={ogTitle}
        />
        <ProfileCard npub={bech32Key} hexPub={hexPub} />
        <Show when={!blocked}>
          <Feed key={`posts${hexPub}`} filterOptions={filterOptions} />
        </Show>
      </div>
    </View>
  );
}

export default Profile;
