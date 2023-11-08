import { useEffect, useRef, useState } from 'preact/hooks';
import { Link } from 'preact-router';

import graphNetwork from '../GraphNetwork';

import ScrollView from '@/components/ScrollView';
import { useIsMounted } from '../hooks/useIsMounted';
import { Event } from 'nostr-tools';
import { throttle } from 'lodash';
import profileManager from '../ProfileManager';
import MyAvatar from '@/components/user/Avatar';
import Name from '@/components/user/Name';
import Key from '@/nostr/Key';
import { ID, STR } from '@/utils/UniqueIds';
import PubSub from '@/nostr/PubSub';

type TestDataProps = {
  path?: string;
};

const View16463 = (props: TestDataProps) => {
  const profiles = useRef<any>(Object.create(null)); // Map of profiles
  const [unsubscribe] = useState<Array<() => void>>([]);
  const [state, setState] = useState<any>(null);
  const [list, setList] = useState<Array<any>>([]); // List of entities to display

  const isMounted = useIsMounted();

  useEffect(() => {
    setState({ message: 'Loading...' });
    graphNetwork.whenReady(() => {
      // Make sure we have the profiles for the test users

      const updateList = throttle(() => {
        let newList = Object.values(profiles.current);
        setList(newList); // Only update the list once per second
      }, 1000); 

      // TrustKind 16463
      const callback = (event: Event): void => {
        if (!isMounted()) return;

        //let edge = eventManager.parseTrustEvent(event);
        //const flaggedUsers = JSON.parse(event.content).map(ID);

        if (profiles.current[event.pubkey]) return;
        
        profiles.current[event.pubkey] = {
            key: event.pubkey,
            npub: Key.toNostrBech32Address(event.pubkey, 'npub') as string,
            // p: Object.create(null),
            // e: Object.create(null),
            flags : JSON.parse(event.content).map(ID),
            time: 0,
            history: [],
            profile: profileManager.getMemoryProfile(ID(event.pubkey)),
          };
        
        updateList();
      }

      let unsub = PubSub.subscribe({ kinds: [16463]}, callback);

      unsubscribe.push(unsub);
      setState({ message: 'Listening for events...' });
    });
    return () => {
      unsubscribe.forEach((u) => u?.());
    };
  }, []);

//-------------------------------------------------------------------------
  // Set the search parameters
  //-------------------------------------------------------------------------
  function setSearch(params: any) {
    const p = {
      ...params,
    };
    return `/${p.npub}`;
  }


  const renderFlag = (id: number) => {

    const npub = Key.toNostrBech32Address(STR(id), 'npub') as string;
    return (
      <div className="flex w-full py-2" key={npub}>
      <Link href={setSearch({ npub })} className="flex flex-1 gap-2">

      <MyAvatar str={npub} width={49} />
      <div>
        <Name pub={npub} />
      </div>
    </Link>
    </div>
    );
  } 

  const renderFlags = (flags: any) => {
    return (
      <div className="flex flex-col w-full gap-4">
        {flags.map((id: number) => renderFlag(id))}
      </div>
    );

  }

  const renderProfile = (p: any) => {
    return (
      <div className="flex w-full py-2" key={p.key}>
        <Link href={setSearch({ npub: p.npub })} className="flex flex-1 gap-2">

          <MyAvatar str={p.npub} width={49} />
          <div>
            <Name pub={p.npub} />
          </div>
        </Link>
        <div className="flex flex-1 gap-2 flex-col">
          <span className="text-sm">Flags: {p.flags?.length || 0}</span> 
          {renderFlags(p.flags)}
        </div>
      </div>
    );
  };

  const renderProfiles = () => {
    if (list.length == 0) return <div className="text-center">{'No results'}</div>;

    return <>{list.map((p) => renderProfile(p))}</>;
  };

  return (
    <>
      List of all events created with kind:16463 (Flag kind)
      <div className="flex flex-wrap gap-4">Status: {state?.message}</div>
      <div className="flex flex-col w-full gap-4">
        <ScrollView>{renderProfiles()}</ScrollView>
      </div>
    </>
  );
};

export default View16463;
