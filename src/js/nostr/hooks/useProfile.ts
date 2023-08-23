import { useEffect, useState } from 'react';

import { ID } from '../../utils/UniqueIds.ts';
import SocialNetwork from '../SocialNetwork.ts';

export const useProfile = (pub: string) => {
  const [profile, setProfile] = useState(SocialNetwork.profiles.get(ID(pub)) || {});

  useEffect(() => {
    if (!pub) return;

    return SocialNetwork.getProfile(pub, (p) => {
      if (p && p.created_at !== profile.created_at) {
        setProfile(p);
      }
    });
  }, [pub]);

  return profile;
};
