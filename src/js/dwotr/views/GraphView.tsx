import { useEffect, useState } from 'preact/hooks';
import Key from '../../nostr/Key';
import graphNetwork from '../GraphNetwork';
import GraphViewSelect from '../components/GraphViewSelect';
import { translate as t } from '../../translations/Translation.mjs';
import Header from '../../components/header/Header';
import Name from '../../components/user/Name';
import TrustList, { renderScoreLine } from './TrustList';
import VisPath from './VisPath';
import VisGraph from './VisGraph';
import { Vertice } from '../model/Graph';
import { debounce } from 'lodash';
import ItemName from '../components/ItemName';
import { useKey } from '../hooks/useKey';
import Mutes from './Mutes';
import { UID } from '@/utils/UniqueIds';

type GraphViewProps = {
  npub?: string;
  //entitytype?: string;
  trusttype?: string;
  dir?: string;
  filter?: string;
  view?: string;
  path?: string; // full path
};

export type ViewComponentProps = {
  props: {
    npub: string;
    uid: UID;
    isMe: boolean;
    hexKey: string;
    entitytype: string;
    trusttype: string;
    dir: string;
    filter: string;
    view: string;
    setNpub: (npub: string) => void;
    setSearch: (params: any) => string;
  };
};

export function parseTrust1Value(value: string | undefined, defaultTrust1Value?: number | undefined) {
  let t = value?.toLocaleLowerCase();
  if (t == 'trust') return 1;
  if (t == 'distrust') return -1;
  return defaultTrust1Value;
}

export function parseEntityType(entityType: string | undefined, defaultEntityType: number = 1) {
  let t = entityType?.toLocaleLowerCase();
  if (t == 'key') return 1;
  if (t == 'item') return 2;
  return defaultEntityType;
}

function getEntityType(npub: string | undefined) {
  return npub?.toLocaleLowerCase().startsWith('note') ? 'item' : 'key';
}

//*************************************************************************
// GraphView - The main view for the graph
//*************************************************************************
const GraphView = (props: GraphViewProps) => {
  const [state, setState] = useState<any>({ ready: false });

  const [npub, setNpub] = useState<string>(props.npub || '');

  const {uid, bech32Key, hexKey, isMe } = useKey(npub); // [beck32Key, hexKey, isMe

  const [entitytype, setEntityType] = useState<string>(getEntityType(bech32Key));

  const [trusttype, setTrustType] = useState<string>(props.trusttype || 'trust');
  const [dir, setDirection] = useState<string>(props.dir || 'out');
  const [view, setView] = useState<string>(props.view || 'graph');
  const [filter, setFilter] = useState<string>(props.filter || '');
  const [vertice, setVertice] = useState<Vertice | null>(null);

  const [unsubscribe] = useState<Array<() => void>>([]);

  const callFilter = debounce((filter: string) => setFilter(filter), 500, { trailing: true }); // 'maxWait':

  //-------------------------------------------------------------------------
  // Initial load of the graph data
  //-------------------------------------------------------------------------
  useEffect(() => {
    graphNetwork.whenReady(() => {
      setVertice(graphNetwork.g.vertices[uid]);

      setState((prevState) => ({
        ...prevState,
        ready: true,
      }));
    });
    return () => {
      unsubscribe.forEach((u) => u?.());
    };
  }, []); // Load once

  //-------------------------------------------------------------------------
  // Set the npub and vertice when the npub changes
  //-------------------------------------------------------------------------
  // const setNpub = useCallback((npub: string) => {
  //   setNpub(npub);
  // }, []);

  //-------------------------------------------------------------------------
  // Update the state when the props change
  // Check if the props have changed
  //-------------------------------------------------------------------------
  useEffect(() => {
    setVertice(graphNetwork.g.vertices[uid]); // uid follows bech32Key
    setEntityType(getEntityType(bech32Key));
  }, [bech32Key]);

  useEffect(() => {
    if (props.trusttype != trusttype) setTrustType(props.trusttype || 'trust');
    if (props.dir != dir) setDirection(props.dir || 'out');
    if (props.view != view) setView(props.view || 'graph');
    if (props.filter != filter) setFilter(props.filter || '');
  }, [props.trusttype, props.dir, props.view, props.filter]);


  //-------------------------------------------------------------------------
  // Set the search parameters
  //-------------------------------------------------------------------------
  function setSearch(params: any) {
    const p = {
      npub: bech32Key,
      trusttype,
      dir,
      view,
      filter,
      ...params,
    };
    return `/graph/${p.npub}/${p.dir}/${p.trusttype}/${p.view}${
      p.filter ? '/' + p.filter : ''
    }`;
  }

  //-------------------------------------------------------------------------
  // Render the view from 3 different components, graph, path, and list
  // selected by the name of the view useState property
  //-------------------------------------------------------------------------
  const renderView = () => {
    let props = {
      npub : bech32Key,
      uid,
      isMe,
      hexKey,
      entitytype,
      trusttype,
      dir,
      view,
      filter,
      setNpub,
      setSearch,
    };
    if (view == 'path') return <VisPath props={props} />;
    if (view == 'list') return <TrustList props={props} />;
    if (view.startsWith('mutes')) return <Mutes props={props} />;
    
    //if (view == 'diagnostics') return renderDiagnostics();
    
    return <VisGraph props={props} />;
  };

  //-------------------------------------------------------------------------
  // Render 
  //-------------------------------------------------------------------------
  if (!state.ready) return null; // TODO: loading
  return (
    <>
      <Header />
      <div className="flex justify-between mb-4">
        <span className="text-2xl font-bold">
          <a className="link" href={`/${bech32Key}`}>
            { entitytype == 'key' && (<Name pub={bech32Key} />)}
            { entitytype == 'item' && (<ItemName str={hexKey} />)}
          </a>
          <span style={{ flex: 1 }} className="ml-1">
            {view}
          </span>
        </span>
      </div>
      {renderScoreLine(vertice?.score, bech32Key, true)}
      <div className="text-sm flex flex-2 gap-2">
        In the context of <Name pub={Key.getPubKey()} />
      </div>
      <hr className="-mx-2 opacity-10 my-2" />
      <div className="flex flex-wrap gap-8">
        <GraphViewSelect view={view} setSearch={setSearch} me={isMe} />
        <form>
          <label>
            <input
              type="text"
              placeholder={t('Filter')}
              tabIndex={1}
              onInput={(e) => callFilter((e?.target as any)?.value)}
              className="input-bordered border-neutral-500 input input-sm w-full"
            />
          </label>
        </form>
      </div>
      <hr className="-mx-2 opacity-10 my-2" />
      {renderView()}
    </>
  );
};

export default GraphView;
