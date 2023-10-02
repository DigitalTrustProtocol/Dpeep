import { useEffect, useState } from 'preact/hooks';
import graphNetwork from '../GraphNetwork';
import Key from '../../nostr/Key';
import Modal from '@/components/modal/Modal';
import { useKey } from '../hooks/useKey';
import StatusIcon from '../components/StatusIcon';
import profileManager from '../ProfileManager';
import muteManager from '../MuteManager';
import blockManager from '../BlockManager';
import followManager from '../FollowManager';
import reactionManager from '../ReactionManager';
import noteManager from '../NoteManager';
import { Event } from 'nostr-tools';
import { getNostrTime } from '../Utils';

type InitializeWoTProps = {
  path?: string;
  setInitialized: (val: any) => void;
};

//type loadindState = "waiting" | "loading" | "loaded";

// Show loading page for DWoTR setup, when ready, render the rest of the app
// The user have to be logged in to use the view
const InitializeWoT = (props: InitializeWoTProps) => {
  const { hexKey } = useKey(Key.getPubKey());

  const [state, setState] = useState<any>({
    dbStatus: 'waiting',
    networkStatus: 'waiting',
    subscribeStatus: 'waiting',
  });

  const loadDB = async () => {
    setState((state: any) => ({ ...state, dbStatus: 'loading' }));

    await graphNetwork.init(hexKey);
    await profileManager.loadAllProfiles();
    muteManager.load();
    await blockManager.load();
    await followManager.load();
    await reactionManager.load();
    await noteManager.load();

    console.log('loadDB done');

    setState((state: any) => ({ ...state, dbStatus: 'done' }));
  };

  const loadNetwork = async () => {
    setState((state: any) => ({ ...state, networkStatus: 'loading' }));

    let note = noteManager.notes.values().next().value as Event;

    // Make sure we only load notes since the last note in the database
    let since = note?.created_at || getNostrTime();
    if (note)
      console.log(
        'Last note loaded from Database:',
        new Date(note.created_at * 1000).toLocaleString(),
      );
    else console.log('No notes loaded from Database');

    await profileManager.subscribeMyselfOnce(since);
    await followManager.subscribeOnce(since);
    await graphNetwork.subscribeOnce(since);

    console.log('loadNetwork done');
    //await graphNetwork.load();
    setState((state: any) => ({ ...state, networkStatus: 'done' }));
  };

  const subscribe = () => {
    setState((state: any) => ({ ...state, subscribeStatus: 'loading' }));

    profileManager.subscribeMyself();
    followManager.subscribeToRelays();
    graphNetwork.subscribeMap();

    console.log('subscribe done');

    setState((state: any) => ({ ...state, subscribeStatus: 'done' }));
  };

  useEffect(() => {
    let load = async () => {
      await loadDB();
      await loadNetwork();

      subscribe();
    };

    load();

    return () => {};
  }, []);

  if (
    state.dbStatus === 'done' &&
    state.networkStatus === 'done' &&
    state.subscribeStatus === 'done'
  )
    props.setInitialized(true);

  // Wot Graph
  // Profiles
  // Mutes & Blocks
  // Events and Subscriptions

  return (
    <Modal centerVertically={true} showContainer={true} onClose={() => {}}>
      <h1>Initalizing Application Context</h1>
      <div className="flex flex-col space-y-2 text-base">
        <div className="flex items-center space-x-2">
          <StatusIcon status={state.dbStatus} />
          <span>Loading from local database</span>
        </div>
        <div className="flex items-center space-x-2">
          <StatusIcon status={state.networkStatus} />
          <span>Fetching data from relay servers</span>
        </div>
        <div className="flex items-center space-x-2">
          <StatusIcon status={state.subscribeStatus} />
          <span>Subscribing to relay servers</span>
        </div>
      </div>
    </Modal>
  );
};

export default InitializeWoT;
