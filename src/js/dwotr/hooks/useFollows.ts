import { useEffect, useState } from 'react';

import Key from '@/nostr/Key.ts';
import { ID, STR } from '@/utils/UniqueIds.ts';
import followManager from '../FollowManager';

export const useFollows = (key = Key.getPubKey()) => {
  
  const [followedUsers, setFollowedUsers] = useState<Array<string>>([]);

  useEffect(() => {
    let onEvent = () => {

      let users = followManager.getFollows(ID(key));
      setFollowedUsers([...users].map((n) => STR(n) as string));
    };

    onEvent();
    followManager.onEvent.addListener(ID(key), onEvent);

    return () => {
      followManager.onEvent.removeListener(ID(key), onEvent);
    };

  }, [key]);

  return followedUsers;
};
