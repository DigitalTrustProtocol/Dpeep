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
import zapManager from '../ZapManager';
import eventDeletionManager from '../EventDeletionManager';
import relayManager from '../ServerManager';
import replyManager from '../ReplyManager';
import repostManager from '../RepostManager';

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

    // Filtering events - blocks out unwanted events
    muteManager.load(); // Only me
    await eventDeletionManager.load(); 
    
    // Content events
    await graphNetwork.init(hexKey); 
    await blockManager.load(); // Not the best place for this, but currently nessessary
    await profileManager.loadAllProfiles();
    await noteManager.load();
    await replyManager.load();

    // Meta events - augments content events
    await followManager.load();
    await reactionManager.load();
    await zapManager.load();

    // System events
    await relayManager.load();

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
    await followManager.subscribeFollowsOnce(since);
    await graphNetwork.subscribeOnce(since);

    console.log('loadNetwork done');
    //await graphNetwork.load();
    setState((state: any) => ({ ...state, networkStatus: 'done' }));
  };

  const subscribe = () => {
    setState((state: any) => ({ ...state, subscribeStatus: 'loading' }));

    profileManager.subscribeMyself();
    followManager.subscribeFollowsMap();
    graphNetwork.subscribeMap();

    console.log('subscribe done');

    setState((state: any) => ({ ...state, subscribeStatus: 'done' }));
  };

  useEffect(() => {
    let load = async () => {
      await loadDB(); // Load from local database (Slow)
      await loadNetwork(); // Load from relay servers (Slow)

      subscribe(); // Subscribe to relay servers (Fast)
    };

    // Register handlers first (Fast)
    noteManager.registerHandlers();
    repostManager.registerHandlers();

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
