import { useEffect, useState } from 'react';

import Key from '@/nostr/Key.ts';
import { ID, STR } from '@/utils/UniqueIds.ts';
import followManager from '../FollowManager';

export const useFollows = (key = Key.getPubKey()) => {
  
  const [followedUsers, setFollowedUsers] = useState<Array<string>>([]);

  useEffect(() => {
    let users = followManager.getFollows(ID(key));

    setFollowedUsers([...users].map((n) => STR(n)));
  }, [key]);


  // useEffect(() => {
  //   const unsub = SocialNetwork.getFollowedByUser(
  //     Key.getPubKey(),
  //     (newFollowedUsers) => {
  //       setFollowedUsers(Array.from(newFollowedUsers));
  //     },
  //     includeSelf,
  //   );

  //   return () => {
  //     unsub?.();
  //   };
  // }, [key, includeSelf]);

  return followedUsers;
};
