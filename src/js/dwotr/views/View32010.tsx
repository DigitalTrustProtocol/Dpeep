import { useEffect, useRef, useState } from 'preact/hooks';
import { Link } from 'preact-router';
import { Event } from 'nostr-tools';

import graphNetwork from '../GraphNetwork';

import ScrollView from '@/components/ScrollView';
import { Trust1Kind } from '../network/provider';
import { useIsMounted } from '../hooks/useIsMounted';
import { throttle } from 'lodash';
import MyAvatar from '@/components/user/Avatar';
import Name from '@/components/user/Name';
import trustManager from '../TrustManager';
import Key from '@/nostr/Key';
import profileManager from '../ProfileManager';
import { ID } from '@/utils/UniqueIds';
import serverManager from '../ServerManager';
import { Sub } from 'nostr-tools';

type TestDataProps = {
  path?: string;
};

const View32010 = (props: TestDataProps) => {
  const { state, list } = useLoadTrust();

  //-------------------------------------------------------------------------
  // Set the search parameters
  //-------------------------------------------------------------------------
  function setSearch(params: any) {
    const p = {
      ...params,
    };
    return `/${p.npub}`;
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
          <span className="text-sm">Keys: {Object.values(p.p).length}</span>
          <span className="text-sm">Notes: {Object.values(p.e).length}</span>
          <span className="text-sm">History: {p.history.length}</span>
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
      List of all events created with kind:32010 (Trust1)
      <div className="flex flex-wrap gap-4">Status: {state?.message}</div>
      <div className="flex flex-col w-full gap-4">
        <ScrollView>{renderProfiles()}</ScrollView>
      </div>
    </>
  );
};

export default View32010;

const useLoadTrust = () => {
  const [state, setState] = useState<any>(null);
  const [list, setList] = useState<Array<any>>([]); // List of entities to display
  const isMounted = useIsMounted();

  const items = useRef<any>(Object.create(null)); // Map of profiles

  useEffect(() => {
    let sub: Sub | null = null;
    setState({ message: 'Loading...' });
    graphNetwork.whenReady(() => {
      // Make sure we have the profiles for the test users

      const updateList = throttle(() => {
        let newList = Object.values(items.current);
        newList.sort((a: any, b: any) => b.history.length - a.history.length);
        setList(newList);
      }, 1000);

      // TrustKind 32010
      let filters = [
        {
          kinds: [Trust1Kind],
        },
      ];

      let onEvent = (event: Event) => {
        if (!isMounted()) return;

        let { pubKey, p: pTags, e: eTags } = trustManager.parseTrustEvent(event);

        if (!items.current[pubKey])
          items.current[pubKey] = {
            key: pubKey,
            npub: Key.toNostrBech32Address(pubKey, 'npub') as string,
            p: Object.create(null),
            e: Object.create(null),
            time: 0,
            history: [],
            profile: profileManager.getMemoryProfile(ID(pubKey)),
          };

        let user = items.current[pubKey];

        for (const p of pTags) {
          user.p[p] = true;
        }
        for (const e of eTags) {
          user.e[e] = true;
        }
        user.history.push(event);

        updateList();
      };

      sub = serverManager.pool.sub([], filters, undefined);
      sub.on('event', onEvent);
      
    });
    return () => {
      if (sub) sub.unsub();
    };
  }, []);

  return { state, list };
};
