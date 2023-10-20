import { useEffect, useState, useRef } from 'react';
import profileManager from '../ProfileManager';
import { ProfileMemory } from '../model/ProfileRecord';
import { UID } from '@/utils/UniqueIds';
import followManager from '../FollowManager';


export const useProfile = (profileId: UID, loadOnDefault = false) => {
  const [profile, setProfile] = useState<ProfileMemory>(profileManager.getMemoryProfile(profileId));
  const isMounted = useRef(true)


  useEffect(() => {
    let onEvent = (profile: ProfileMemory) => {
      if(!isMounted.current) return;
      setProfile({...profile});
    }

    // Subscribe to profile updates
    profileManager.onEvent.addListener(profileId, onEvent);

    if(profile.isDefault && loadOnDefault) {
      profileManager.once(profileId); // Load from relay
      followManager.onceContacts(profileId);
    }

    return () => {
      isMounted.current = false;
      // Unsubscribe from profile updates
      profileManager.onEvent.removeListener(profileId, onEvent);
    }

  }, [profileId, loadOnDefault]);

  return { profile };
};
