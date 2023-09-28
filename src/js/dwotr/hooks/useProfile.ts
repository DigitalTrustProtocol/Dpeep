import { useEffect, useState } from 'react';
import profileManager from '../ProfileManager';
import { ProfileMemory } from '../model/ProfileRecord';
import { ID } from '@/utils/UniqueIds';
import { useIsMounted } from './useIsMounted';
import { getNostrTime } from '../Utils';
import Key from '@/nostr/Key';

// Address can be of type hex of BECH32
export const useProfile = (address: string, kinds = [0], delay = 1000 ) => {

  const isMounted = useIsMounted();
  
  const [profile, setProfile] = useState<ProfileMemory>();
  const [updatedFromRelays, setUpdatedFromRelays] = useState(false);

  useEffect(() => {

    let authorId = address ? ID(address) : ID(Key.getPubKey());

    // const handleEvent = (e: any) => {
    //   if(!isMounted()) return; // ignore events after unmount, however should not happen

    //   // At this point the profile should be loaded into memory from the event
    //   let p = profileManager.getMemoryProfile(authorId);

    //   p.relayLastUpdate = getNostrTime();

    //   if (profile && p.created_at <= profile.created_at) return; // ignore older events

    //   setProfile({ ...p }); // Make sure to copy the object, otherwise React may not re-render
    //   setUpdatedFromRelays(true);
    // };

    let mem = profileManager.getMemoryProfile(authorId);
    setProfile(mem);

    //wotPubSub.getAuthorEvent(authorId, kinds, handleEvent, delay); // delay 1 sec

  }, [address, profile, kinds, delay]);

  return { profile, updatedFromRelays };
};


