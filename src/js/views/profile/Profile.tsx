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
import SocialNetwork from '../../nostr/SocialNetwork.ts';
import { translate as t } from '../../translations/Translation.mjs';
import View from '../View.tsx';
import { useProfile } from '@/dwotr/hooks/useProfile.ts';
import { useKey } from '@/dwotr/hooks/useKey.tsx';

function Profile(props) {
  const [npub, setNpub] = useState(props.id);
  const { hexKey: hexPub, bech32Key, isMe } = useKey(npub);
  const profile = useProfile(hexPub) as any;
  // many of these hooks should be moved to useProfile or hooks directory
  const banner = useMemo(() => {
    if (!profile) {
      return;
    }
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
  }, [profile.banner]);
  const [blocked, setBlocked] = useState(false);
  const [bannerModalOpen, setBannerModalOpen] = useState(false);
  const setIsMyProfile = useLocalState('isMyProfile', false)[1];

  useEffect(() => {
    setIsMyProfile(isMe);
    SocialNetwork.getBlockedUsers((blockedUsers) => {
      setBlocked(blockedUsers.has(hexPub));
    });
  }, [hexPub]);

  useEffect(() => {
    try {
      if (bech32Key !== props.id) {
        route(`/${bech32Key}`, true);
        return;
      }
    } catch (e) {
      let nostrAddress = props.id;

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
          route(`/`, true);
        }
      });
    }

    setTimeout(() => {
      window.prerenderReady = true;
    }, 1000);

    return () => {
      setIsMyProfile(false);
    };
  }, [props.id]);

  const filterOptions = useMemo(() => {
    return [
      {
        name: t('posts'),
        filter: { authors: [hexPub], kinds: [1, 6], limit: 10 },
        filterFn: (event) => !getEventReplyingTo(event) || isRepost(event),
        eventProps: { showRepliedMsg: true },
      },
      {
        name: t('posts_and_replies'),
        filter: { authors: [hexPub], kinds: [1, 6], limit: 5 },
        eventProps: { showRepliedMsg: true, fullWidth: false },
      },
      {
        name: t('likes'),
        filter: { authors: [hexPub], kinds: [7], limit: 5 },
      },
    ];
  }, [hexPub]);

  if (!hexPub) {
    return <div></div>;
  }

  const title = profile.display_name || profile.name || 'Profile';
  const ogTitle = `${title} | Iris`;
  const description = `Latest posts by ${profile.display_name || profile.name || 'user'}. ${
    profile.about || ''
  }`;

  return (
    <View>
      <div
        className="mb-4 h-48 bg-cover bg-center cursor-pointer"
        style={{
          backgroundImage:
            banner && !blocked
              ? `url(${banner})`
              : 'linear-gradient(120deg, #010101 0%, #1f0f26 50%, #010101 100%)',
        }}
        onClick={() => banner && !blocked && setBannerModalOpen(true)}
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
        <ProfileCard npub={npub} hexPub={hexPub} />
        <Show when={!blocked}>
          <Feed key={`posts${hexPub}`} filterOptions={filterOptions} />
        </Show>
      </div>
    </View>
  );
}

export default Profile;