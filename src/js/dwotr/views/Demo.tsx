import { JSX } from 'react';
import { useEffect, useState } from 'preact/hooks';
import Key from '../../nostr/Key';
import graphNetwork from '../GraphNetwork';
import Header from '../../components/header/Header';
import profileManager from '../ProfileManager';
import { toTimestamp } from '../Utils';
import Name from '../../components/user/Name';
import InfoList from '../components/Display/InfoList';
import ProfileRecord from '../model/ProfileRecord';
import { Edge } from '../model/Graph';
import SocialNetwork from '../../nostr/SocialNetwork';
import { resetWoTDatabase } from '../network/DWoTRDexie';
import { bytesToHex } from '@noble/hashes/utils';
import { mnemonicToSeedSync } from '@scure/bip39';
import { HDKey } from '@scure/bip32';
import { ID } from '@/utils/UniqueIds';

const mnemonic = 'zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo wrong';

export function privateKeyFromSeedWords(mnemonic: string, passphrase?: string): string {
  let root = HDKey.fromMasterSeed(mnemonicToSeedSync(mnemonic, passphrase));
  let privateKey = root.derive(`m/44'/1237'/0'/0/0`).privateKey;
  if (!privateKey) throw new Error('could not derive private key');
  return bytesToHex(privateKey);
}

export function getHDKey(mnemonic: string, passphrase?: string): HDKey {
  let root = HDKey.fromMasterSeed(mnemonicToSeedSync(mnemonic, passphrase));
  return root;
}


export function derivedKey(root: HDKey, seed: number): HDKey {
  return root.derive(`m/44'/1237'/0'/0/${seed}`);
}


export function getRootKey(passphrase: string): HDKey {
  return getHDKey(mnemonic, passphrase);
}




export function generatePrivateKey(passphrase: string): string {
  return privateKeyFromSeedWords(mnemonic, passphrase);
}

async function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

type TestDataProps = {
  id?: string;
  path?: string;
};

interface EdgeItem {
  from: string;
  to: string;
  val: number;
}

// npub1dergggklka99wwrs92yz8wdjs952h2ux2ha2ed598ngwu9w7a6fsh9xzpc

// Use exiting users for better visualisation
const RealTestUsers = [
  'npub1sn0wdenkukak0d9dfczzeacvhkrgz92ak56egt7vdgzn8pv2wfqqhrjdv9', // snowden
  'npub1sg6plzptd64u62a878hep2kev88swjh3tw00gjsfl8f237lmu63q0uf63m', // jack
  'npub1a2cww4kn9wqte4ry70vyfwqyqvpswksna27rtxd8vty6c74era8sdcw83a', // Lyn Alden
  'npub15dqlghlewk84wz3pkqqvzl2w2w36f97g89ljds8x6c094nlu02vqjllm5m', // saylor
  'npub1g53mukxnjkcmr94fhryzkqutdz2ukq4ks0gvy5af25rgmwsl4ngq43drvk', // sirius
  'npub1z4m7gkva6yxgvdyclc7zp0vz4ta0s2d9jh8g83w03tp5vdf3kzdsxana6p', // yegorpetrov
  'npub1az9xj85cmxv8e9j9y80lvqp97crsqdu2fpu3srwthd99qfu9qsgstam8y8', // nvk
  'npub180cvv07tjdrrgpa0j7j7tmnyl2yr6yr7l8j4s3evf6u64th6gkwsyjh6w6', // fiatjaf
  'npub1hu3hdctm5nkzd8gslnyedfr5ddz3z547jqcl5j88g4fame2jd08qh6h8nh', // carla
];

const snowden = 'npub1sn0wdenkukak0d9dfczzeacvhkrgz92ak56egt7vdgzn8pv2wfqqhrjdv9';
const jack = 'npub1sg6plzptd64u62a878hep2kev88swjh3tw00gjsfl8f237lmu63q0uf63m';
const lyn = 'npub1a2cww4kn9wqte4ry70vyfwqyqvpswksna27rtxd8vty6c74era8sdcw83a';
const saylor = 'npub15dqlghlewk84wz3pkqqvzl2w2w36f97g89ljds8x6c094nlu02vqjllm5m';
const sirius = 'npub1g53mukxnjkcmr94fhryzkqutdz2ukq4ks0gvy5af25rgmwsl4ngq43drvk';
const yegorpetrov = 'npub1z4m7gkva6yxgvdyclc7zp0vz4ta0s2d9jh8g83w03tp5vdf3kzdsxana6p';
const nvk = 'npub1az9xj85cmxv8e9j9y80lvqp97crsqdu2fpu3srwthd99qfu9qsgstam8y8';
const fiatjaf = 'npub180cvv07tjdrrgpa0j7j7tmnyl2yr6yr7l8j4s3evf6u64th6gkwsyjh6w6';
const carla = 'npub1hu3hdctm5nkzd8gslnyedfr5ddz3z547jqcl5j88g4fame2jd08qh6h8nh';

const jackGraphData = [
  { from: jack, to: lyn, val: 1 },
  { from: jack, to: saylor, val: 1 },
  { from: jack, to: sirius, val: 1 },
  { from: jack, to: yegorpetrov, val: 1 },
  { from: jack, to: nvk, val: 1 },
  { from: jack, to: fiatjaf, val: 1 },
  { from: jack, to: carla, val: 1 },
];

const lynGraphData = [
  { from: lyn, to: jack, val: 1 },
  { from: lyn, to: saylor, val: 1 },
  { from: lyn, to: sirius, val: 1 },
  { from: lyn, to: yegorpetrov, val: 1 },
  { from: lyn, to: nvk, val: 1 },
  { from: lyn, to: fiatjaf, val: 1 },
  { from: lyn, to: carla, val: 1 },
];

const saylorGraphData = [
  { from: saylor, to: jack, val: 1 },
  { from: saylor, to: lyn, val: 1 },
  { from: saylor, to: sirius, val: 1 },
  { from: saylor, to: yegorpetrov, val: 1 },
  { from: saylor, to: nvk, val: 1 },
  { from: saylor, to: fiatjaf, val: 1 },
  { from: saylor, to: carla, val: 1 },
];

const siriusGraphData = [
  { from: sirius, to: jack, val: -1 },
  { from: sirius, to: lyn, val: -1 },
  { from: sirius, to: saylor, val: -1 },
  { from: sirius, to: yegorpetrov, val: -1 },
  { from: sirius, to: nvk, val: -1 },
  { from: sirius, to: fiatjaf, val: 1 },
  { from: sirius, to: carla, val: 1 },
];

const yegorpetrovGraphData = [
  { from: yegorpetrov, to: jack, val: -1 },
  { from: yegorpetrov, to: lyn, val: -1 },
  { from: yegorpetrov, to: saylor, val: -1 },
  { from: yegorpetrov, to: sirius, val: -1 },
  { from: yegorpetrov, to: nvk, val: -1 },
  { from: yegorpetrov, to: fiatjaf, val: 1 },
];

const nvkGraphData = [{ from: nvk, to: jack, val: -1 }];

async function addEdge(props: any) {
  let { from, to } = props;
  //from = Key.toNostrHexAddress(from) as string;
  //to = Key.toNostrHexAddress(to) as string;

  return await graphNetwork.setTrust({ ...props, from, to }, true);
}

function trust(from: string, to: string, val: number) {
  return { from, to, val, entityType: 1, context: 'nostr', note: '', timestamp: toTimestamp() };
}

function loadGraphData(data: Array<EdgeItem>) {
  Object.values(data).forEach((e) => {
    addEdge(trust(e.from, e.to, e.val));
  });
}

const Demo = (props: TestDataProps) => {
  const [state, setState] = useState<any>(null);
  const [unsubscribe] = useState<Array<() => void>>([]);

  const pub = (Key.toNostrHexAddress(props.id as string) as string) || Key.getPubKey();
  const npub = Key.toNostrBech32Address(pub as string, 'npub') as string;

  useEffect(() => {
    graphNetwork.whenReady(() => {
      // Make sure we have the profiles for the test users
      loadProfiles();
    });
    return () => {
      unsubscribe.forEach((u) => u?.());
    };
  }, [pub]);

  async function loadProfiles() {
    let profiles = await profileManager.getProfiles(RealTestUsers);
    //unsubscribe.push(unsub);

    let profileIndex = {};
    profiles.forEach((p) => {
      profileIndex[ID(p.key)] = p;
    });

    let edgesCount = Object.values(graphNetwork.g.edges).length;
    let nodesCount = Object.values(graphNetwork.g.vertices).length;

    setState((prevState) => ({
      ...prevState,
      profiles,
      profileIndex,
      edgesCount,
      nodesCount,
      message: 'Ready',
    }));
  }

  function updateState(message: string = '') {
    let edgesCount = Object.values(graphNetwork.g.edges).length;
    let nodesCount = Object.values(graphNetwork.g.vertices).length;
    let profiles = Object.values(SocialNetwork.profiles);

    //graphNetwork.processGraph = true; // Flag the whole graph for processing
    //graphNetwork.processScore(); // Process score for all vertices within degree of maxDegree and subscribe to trust events

    setState((prevState) => ({
      ...prevState,
      profiles,
      edgesCount,
      nodesCount,
      message,
    }));
  }

  const resetProfiles = (e: JSX.TargetedEvent<HTMLButtonElement, MouseEvent>) => {
    e.preventDefault();

    SocialNetwork.profiles = new Map<number, any>();

    updateState();
  };

  const resetGraph = (e: JSX.TargetedEvent<HTMLButtonElement, MouseEvent>) => {
    e.preventDefault();

    graphNetwork.g.vertices = {};
    graphNetwork.g.edges = {};

    updateState();
  };

  const resetDatabase = (e: JSX.TargetedEvent<HTMLButtonElement, MouseEvent>) => {
    resetWoTDatabase();
  };

  const resetAll = (e: JSX.TargetedEvent<HTMLButtonElement, MouseEvent>) => {
    e.preventDefault();
    resetDatabase(e);
    resetGraph(e);
    resetProfiles(e);
  };

  const jackGraphClick = (e: JSX.TargetedEvent<HTMLButtonElement, MouseEvent>) => {
    e.preventDefault();
    // Create some fake data in the graph and store it in indexeddb
    addEdge(trust(pub, jack, 1));
    loadGraphData(jackGraphData);

    updateState();
  };

  const saylorGraphClick = (e: JSX.TargetedEvent<HTMLButtonElement, MouseEvent>) => {
    e.preventDefault();

    addEdge(trust(pub, saylor, 1));
    loadGraphData(saylorGraphData);

    updateState();
  };

  const siriusGraphClick = (e: JSX.TargetedEvent<HTMLButtonElement, MouseEvent>) => {
    e.preventDefault();

    addEdge(trust(pub, sirius, 1));
    loadGraphData(siriusGraphData);

    updateState();
  };

  const lynGraphClick = (e: JSX.TargetedEvent<HTMLButtonElement, MouseEvent>) => {
    e.preventDefault();

    addEdge(trust(pub, lyn, 1));
    loadGraphData(lynGraphData);

    updateState();
  };

  function ensureUserExists(key: HDKey, i: number) {
    //console.time('ensureUserExists');
    //console.time('ensureUserExists - keygen');
    let subKey = derivedKey(key, i); //  generatePrivateKey(i.toString()); // Generate a private key, pretty slow
    if (!subKey.privateKey || !subKey.publicKey) throw new Error('could not derive private key');

    //let priv = bytesToHex(subKey.privateKey);
    let rpub = bytesToHex(subKey.publicKey);

    //console.timeEnd('ensureUserExists - keygen');

    let id = ID(rpub);
    let profile = profileManager.getDefaultProfile(id);
    if (profile?.isDefault) {
      profile.name = `Demo User ${i}`;
      profile.isDefault = false;
      profileManager.addProfileToMemory(profile);
      profileManager.saveProfile(profile);
      console.log('created profile', i, rpub);
    }

    //console.timeEnd('ensureUserExists');

    return rpub;
  }

  const createLargeGraphClick = (e: JSX.TargetedEvent<HTMLButtonElement, MouseEvent>) => {
    e.preventDefault();

    let hdkey = getRootKey("123");

    async function createLargeGraph() {
      let count = 0;
      for (let i = 0; i < 10; i++) {
        let rpub = ensureUserExists(hdkey, count++);
        await addEdge(trust(pub, rpub, 1));
        for (let x = 0; x < 100; x++) {
          
          let rpub2 = ensureUserExists(hdkey, count++);
          await addEdge(trust(rpub, rpub2, 1));
          for (let y = 0; y < 100; y++) {
            
            let rpub3 = ensureUserExists(hdkey, count++);
            await addEdge(trust(rpub2, rpub3, 1));
          }

          let percent = Math.round((count * 100) / (10*100*100));
          updateState('Large graph created '+ percent + '%');
          await wait(1); // wait for 1ms
        }

        let percent = Math.round((count * 100) / (10*100*100));
        updateState('Large graph created '+ percent + '%');
        await wait(1); // wait for 1ms
      }

      await loadProfiles();
      updateState('Processing graph!');
      await wait(1); // wait for 1ms

      graphNetwork.processGraph = true; // Flag the whole graph for processing
      graphNetwork.processScore(); // Process score for all vertices within degree of maxDegree and subscribe to trust events

      updateState('Work done!');
      await wait(1); // wait for 1ms
    }

    createLargeGraph();

    updateState('Creating large graph...');
  };

  const deleteLargeGraphClick = (e: JSX.TargetedEvent<HTMLButtonElement, MouseEvent>) => {
    e.preventDefault();

    // async function deleteLargeGraph() {

    //   for (let i = 0; i < 10; i++) {
    //     let rpub = ensureUserExists(i);
    //     addEdge(trust(pub, rpub, 0));

    //     for (let x = 0; x < 10; x++) {
    //       let rpub2 = ensureUserExists(10 + x);
    //       addEdge(trust(rpub, rpub2, 0));

    //       for (let y = 0; y < 10; y++) {
    //         let rpub3 = ensureUserExists(100 + y);
    //         addEdge(trust(rpub2, rpub3, 0));
    //       }
    //     }
    //   }
    //   updateState('Large graph deleted!');
    // }
    // deleteLargeGraph();

    // updateState('Deleting large graph...');
  };

  const loadAllClick = (e: JSX.TargetedEvent<HTMLButtonElement, MouseEvent>) => {
    e.preventDefault();

    addEdge(trust(pub, lyn, 1));
    addEdge(trust(pub, sirius, 1));
    addEdge(trust(pub, yegorpetrov, 1));
    addEdge(trust(pub, nvk, 1));
    addEdge(trust(pub, fiatjaf, 1));
    addEdge(trust(pub, carla, 1));

    loadGraphData(jackGraphData);
    loadGraphData(saylorGraphData);
    loadGraphData(siriusGraphData);
    loadGraphData(lynGraphData);
    //loadGraphData(yegorpetrovGraphData);
    loadGraphData(nvkGraphData);
    //loadGraphData(fiatjafGraphData);
    //loadGraphData(carlaGraphData);

    updateState();
  };

  // Visualize a list of users from the state.profiles object
  const listUsers = () => {
    if (!state?.profiles) return;

    // Convert into a list of InfoList objects
    let list = state.profiles.map((p: ProfileRecord) => {
      return { name: p.name, value: Key.toNostrBech32Address(p.key, 'npub') };
    });

    return <InfoList data={list} title={'Profiles'} />;
  };

  // visualize a list of Edges from the state.edges object
  const listEdges = () => {
    if (!state?.edges) return;

    // Convert into a list of InfoList objects
    let list = state.edges.map((e: Edge) => {
      return { name: e.key, value: `${e.out?.id} -- ${e.val} --> ${e.in?.id}` };
    });

    return <InfoList data={list} title={'Edges'} />;
  };

  const Overview = () => {
    // Make a list of teknical data from profiles and edges
    let list = [
      { name: 'Profiles', value: state?.profiles.length },
      { name: 'Vertices', value: state?.nodesCount },
      { name: 'Edges', value: state?.edgesCount },
    ];

    return <InfoList data={list} title={'Overview'} />;
  };

  return (
    <>
      <Header />
      <div className="flex justify-between mb-4">
        <span className="text-2xl font-bold">
          <a className="link" href={`/${npub}`}>
            <Name pub={npub} />
          </a>
          <span style={{ flex: 1 }} className="ml-1">
            Test Data
          </span>
        </span>
      </div>
      <hr className="-mx-2 opacity-10 my-2" />
      All trust data generated is solely for testing and will not be submitted to the relays. The
      profiles used are exclusively for demonstration purposes and do not reflect any real-life
      trust situations.
      <hr className="-mx-2 opacity-10 my-2" />
      <div className="flex flex-wrap gap-4">
        <button className="btn btn-sm" onClick={saylorGraphClick}>
          Create Influencer Graph
        </button>
        <button className="btn btn-sm" onClick={createLargeGraphClick}>
          Create Large Graph 10k nodes
        </button>
        <button className="btn btn-sm" onClick={deleteLargeGraphClick}>
          Delete Large Graph 10k nodes
        </button>

        {/* <Button className="btn btn-primary btn-sm" onClick={jackGraphClick}>
          Create Jack Graph
        </Button>
        <Button className="btn btn-sm" onClick={saylorGraphClick}>
          Create Saylor Graph
        </Button>
        <Button className="btn btn-sm" onClick={siriusGraphClick}>
          Create Saylor Graph
        </Button>
        <Button className="btn btn-sm" onClick={lynGraphClick}>
          Create Lyn Graph
        </Button>
        <Button className="btn btn-sm" onClick={loadAllClick}>
          Create All Graphs
        </Button> */}
        <button className="btn btn-sm" onClick={resetAll}>
          Reset All
        </button>
      </div>
      <hr className="-mx-2 opacity-10 my-2" />
      <div className="flex flex-wrap gap-4">Status: {state?.message}</div>
      <hr className="-mx-2 opacity-10 my-2" />
      <div className="flex">
        <div className="flex flex-1 gap-4">{Overview()}</div>
        <div className="flex flex-1 gap-4">{listUsers()}</div>
        <div className="flex flex-1 gap-4">{listEdges()}</div>
        {/* <div className="flex-grow" ref={visJsRef} /> */}
      </div>
    </>
  );
};

export default Demo;
