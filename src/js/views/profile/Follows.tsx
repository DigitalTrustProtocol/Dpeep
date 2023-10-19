import { memo, useEffect,  useState } from 'react';
import throttle from 'lodash/throttle';
import { Link } from 'preact-router';

import InfiniteScroll from '@/components/helpers/InfiniteScroll.tsx';
import View from '@/views/View.tsx';

import Follow from '../../components/buttons/Follow.tsx';
import Show from '../../components/helpers/Show.tsx';
import Avatar from '../../components/user/Avatar.tsx';
import Name from '../../components/user/Name.tsx';
import Key from '../../nostr/Key.ts';
import { translate as t } from '../../translations/Translation.mjs';
import { STR, UID } from '../../utils/UniqueIds.ts';
import { useKey } from '@/dwotr/hooks/useKey.tsx';
import { useIsMounted } from '@/dwotr/hooks/useIsMounted.tsx';
import followManager, { FollowItem } from '@/dwotr/FollowManager.ts';
import { Event } from 'nostr-tools';

const FollowedUser = memo(({ id }: { id: UID }) => {
  const hexKey = STR(id) as string;
  const npub = Key.toNostrBech32Address(hexKey, 'npub') || '';
  return (
    <div key={npub} className="flex w-full">
      <Link href={`/${npub}`} className="flex flex-1 gap-4">
        <Avatar str={npub} width={49} />
        <div>
          <Name pub={npub} />
          <br />
          <span className="text-neutral-500 text-sm">
            {followManager.getItem(id).followedBy?.size || 0}
            <i> </i>
            followers
          </span>
        </div>
      </Link>
      {Key.isMine(hexKey) && <Follow id={hexKey} />}
    </div>
  );
});

type Props = {
  id?: string;
  followers?: boolean;
  path: string;
};

const Follows: React.FC<Props> = (props) => {
  const { uid, myId } = useKey(props.id);

  const [items, setItems] = useState<any>([]);

  const isMounted = useIsMounted();


  // const sortByName = useCallback((aK, bK) => {
  //   const aName = SocialNetwork.profiles.get(ID(aK))?.name;
  //   const bName = SocialNetwork.profiles.get(ID(bK))?.name;
  //   if (!aName && !bName) return aK.localeCompare(bK);
  //   if (!aName) return 1;
  //   if (!bName) return -1;
  //   return aName.localeCompare(bName);
  // }, []);

  // const sortByFollowDistance = useCallback(
  //   (aK, bK) => {
  //     const aDistance = SocialNetwork.followDistanceByUser.get(ID(aK));
  //     const bDistance = SocialNetwork.followDistanceByUser.get(ID(bK));
  //     if (aDistance === bDistance) return sortByName(aK, bK);
  //     if (aDistance === undefined) return 1;
  //     if (bDistance === undefined) return -1;
  //     return aDistance < bDistance ? -1 : 1;
  //   },
  //   [sortByName],
  // );

  // const updateSortedFollows = useCallback(
  //   throttle(() => {
  //     const comparator = (a, b) =>
  //       props.followers ? sortByFollowDistance(a, b) : sortByName(a, b);
  //     setFollows(Array.from(followsRef.current).sort(comparator));
  //   }, 1000),
  //   [props.followers, sortByFollowDistance, sortByName],
  // );

  // const getContacts = () => {

  // };

  // const getFollowers = () => {
  //   const hex = Key.toNostrHexAddress(props.id!) || '';
  //   if (hex) {
  //     SocialNetwork.getFollowersByUser(hex, (newFollowers) => {
  //       followsRef.current = newFollowers;
  //       updateSortedFollows();
  //     });
  //   }
  // };

  const followAll = () => {
    if (confirm(`${t('follow_all')} (${items.length})?`)) {
      followManager.follow(items.map((hexKey) => STR(hexKey) as string), true)
    }
  };

  useEffect(() => {

    const callback = throttle(() => {
      if (!isMounted()) return;
      let item = followManager.getItem(uid)

      if(props.followers) {
        setItems([...item?.followedBy]);
      } else {
        setItems([...item?.follows]);
      }

    }, 500, { leading: true });

    callback();

    followManager.onEvent.addListener(uid, callback);

    if(props.followers) {
      followManager.mapFollowedBy(uid);
    } else {
      followManager.onceContacts(uid);
    }

    return () => {
      followManager.onEvent.removeListener(uid, callback);
    }
  }, [props.id, props.followers]);

  if (!props.id) {
    return null;
  }

  const showFollowAll = items.length > 1 && !(uid === myId && !props.followers);

  return (
    <View>
      <div className="px-4 mb-4">
        <div className="flex justify-between mb-4">
          <span className="text-xl font-bold">
            <a className="link" href={`/${props.id}`}>
              <Name pub={props.id} />
            </a>
            :<i> </i>
            <span style={{ flex: 1 }} className="ml-1">
              {props.followers ? t('followers') : t('following')}
            </span>
          </span>
          <Show when={showFollowAll}>
            <span style={{ textAlign: 'right' }} className="hidden md:inline">
              <button className="btn btn-sm btn-neutral" onClick={followAll}>
                {t('follow_all')} ({items.length})
              </button>
            </span>
          </Show>
        </div>
        <Show when={showFollowAll}>
          <p style={{ textAlign: 'right' }} className="inline md:hidden">
            <button className="btn btn-sm btn-neutral" onClick={followAll}>
              {t('follow_all')} ({items.length})
            </button>
          </p>
        </Show>
        <div className="flex flex-col w-full gap-4">
          <InfiniteScroll>
            {items.map((key) => (
              <FollowedUser key={key} id={key} />
            ))}
          </InfiniteScroll>
          {items.length === 0 ? '—' : ''}
        </div>
      </div>
    </View>
  );
};

export default Follows;
