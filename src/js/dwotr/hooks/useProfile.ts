import { useEffect, useState } from 'react';
import profileManager from '../ProfileManager';
import { ProfileMemory } from '../model/ProfileRecord';
import { ID } from '@/utils/UniqueIds';
import { useIsMounted } from './useIsMounted';
import wotPubSub from '../network/WOTPubSub';
import { throttle } from 'lodash';


// Address can be of type hex of BECH32
export const useProfile = (address: string) => {

  const isMounted = useIsMounted();
  
  const [profile, setProfile] = useState<ProfileMemory>();

  useEffect(() => {
    if(!address) return; // ignore empty address

    let authorId = ID(address);

    let mem = profileManager.getMemoryProfile(authorId);
    if(!profile || profile.created_at != mem.created_at) {
      setProfile(mem);
    }

    const handleEvent = (e: any) => {
      if(!isMounted()) return; // ignore events after unmount, however should not happen

      // At this point the profile should be loaded into memory
      let p = profileManager.getMemoryProfile(authorId);
      //if(!p || p.id != authorId) return; // not for me

      if (profile && p.created_at <= profile.created_at) return; // ignore older events

      setProfile({ ...p }); // Make sure to copy the object, otherwise React may not re-render
    };

    // const sub = throttle(() => {
    //   wotPubSub.getAuthorEvent(authorId, [0], handleEvent);
    //   console.log("Subscribing to profile info:", address);
    // }, 1000 * 60, { leading: true, trailing: false }); // 1 minute throttle so we don't spam the network

    // sub();

  }, [address, profile]);

  return profile;
};


