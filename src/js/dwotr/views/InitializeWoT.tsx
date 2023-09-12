import { useEffect, useState } from 'preact/hooks';
import graphNetwork from '../GraphNetwork';
import Key from '../../nostr/Key';
import Modal from '@/components/modal/Modal';
import { useKey } from '../hooks/useKey';
import StatusIcon, { Status } from '../components/StatusIcon';
import profileManager from '../ProfileManager';
import muteManager from '../MuteManager';
import blockManager from '../BlockManager';

type InitializeWoTProps = {
  path?: string;
  setInitialized: (val: any) => void;
};

//type loadindState = "waiting" | "loading" | "loaded";

// Show loading page for DWoTR setup, when ready, render the rest of the app
// The user have to be logged in to use the view
const InitializeWoT = (props: InitializeWoTProps) => {
  const { hexKey } = useKey(Key.getPubKey());

  const [graphStatus, setGraphStatus] = useState<Status>('waiting');
  const [profileStatus, setProfileStatus] = useState<Status>('waiting');
  const [muteStatus, setMuteStatus] = useState<Status>('waiting');
  const [blockStatus, setBlockStatus] = useState<Status>('waiting');

  useEffect(() => {
    setGraphStatus('loading');

    graphNetwork.whenReady(() => {
      setGraphStatus('done');

      setProfileStatus('loading');
      profileManager.loadAllProfiles().then(() => {
        setTimeout(() => {
          setProfileStatus('done');

          muteManager.load();
          setMuteStatus('done');

          setBlockStatus('loading');
          blockManager.load().then(() => {
            setTimeout(() => {
              setBlockStatus('done');
            }, 0);
          });

    
        }, 0);
      });

    });

    setTimeout(() => {
      graphNetwork.init(hexKey);
    }, 1);

    return () => {};
  }, []);

  if(graphStatus === "done" && profileStatus === "done" && muteStatus === "done" && blockStatus === "done")
    props.setInitialized(true);

  // Wot Graph
  // Profiles
  // Mutes & Blocks
  // Events and Subscriptions


  return (
    <Modal centerVertically={true} showContainer={true} onClose={() => {}}>
      <h1>Initalizing Application Context</h1>
      <div className="flex flex-col space-y-2">
        <div className="flex items-center space-x-2">
          <StatusIcon status={graphStatus} />
          <span>WoT network</span>
        </div>
        <div className="flex items-center space-x-2">
          <StatusIcon status={profileStatus} />
          <span>Profiles</span>
        </div>
        <div className="flex items-center space-x-2">
          <StatusIcon status={muteStatus} />
          <span>Mute list</span>
        </div>
        <div className="flex items-center space-x-2">
          <StatusIcon status={blockStatus} />
          <span>Block list</span>
        </div>


      </div>
    </Modal>
  );
};

export default InitializeWoT;
