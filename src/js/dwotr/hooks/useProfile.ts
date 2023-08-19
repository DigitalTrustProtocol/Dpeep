import { useEffect, useState } from 'react';
import profileManager from '../ProfileManager';
import ProfileRecord, { ProfileMemory } from '../model/ProfileRecord';
import { ID } from '@/utils/UniqueIds';
import { useIsMounted } from './useIsMounted';


// Address can be of type hex of BECH32
export const useProfile = (address: string) => {

  const isMounted = useIsMounted();

  const [profile, setProfile] = useState<ProfileRecord>(() => profileManager.getMemoryProfile(ID(address)));

  useEffect(() => {
    let id = ID(address);

    let mem = profileManager.getMemoryProfile(id);
    if(profile.created_at != mem.created_at) {
      setProfile(mem);
    }

    const handleEvent = (e: any) => {
      if(!isMounted()) return; // ignore events after unmount
      let p = e.detail as ProfileMemory;
      if(!p || p.id != id) return; // not for me

      setProfile(prevProfile => {
        if (p.created_at <= prevProfile.created_at) return prevProfile; // ignore older events
        return { ...p }; // Make sure to copy the object, otherwise React may not re-render
      });
    };

    return profileManager.subscribe(address, handleEvent);
  }, [address]);

  return profile;
};


