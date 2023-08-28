import { useEffect, useState } from 'preact/hooks';
import ScrollView from '../../components/ScrollView';
import Key from '../../nostr/Key';
import graphNetwork from '../GraphNetwork';
import { Edge, EntityType, Vertice } from '../model/Graph';

import { Link } from 'preact-router';
import TrustScore from '../model/TrustScore';
import {
  RenderScoreDistrustLink,
  RenderScoreTrustLink,
  RenderTrust1Color,
} from '../components/RenderGraph';
import MyAvatar from '../../components/user/Avatar';
import Name from '../../components/user/Name';
import {
  ViewComponentProps,
  parseEntityType,
  parseTrust1Value as parseTrust1Value,
} from './GraphView';
import profileManager from '../ProfileManager';
import GraphEntityTypeSelect from '../components/GraphEntityTypeSelect';
import GraphDirectionSelect from '../components/GraphDirectionSelect';
import GraphTrust1Select from '../components/GraphTrust1Select';
import { translate as t } from '../../translations/Translation.mjs';
import Show from '@/components/helpers/Show';
import { ID, STR } from '@/utils/UniqueIds';

export function filterByName(list: Vertice[], filter: string) {
  if (!filter || list.length == 0) return [...list]; // Return a copy of the list

  let result = list.filter((v) => {
    let profile = profileManager.getMemoryProfile(v.id);

    if (profile?.name?.toLowerCase().includes(filter.toLowerCase())) return true;
    if (profile?.display_name?.toLowerCase().includes(filter.toLowerCase())) return true;

    return false;
  });
  return result;
}

function compareDegree(a: Vertice, b: Vertice) {
  if (a.score.atDegree < b.score.atDegree) {
    return -1;
  }
  if (a.score.atDegree > b.score.atDegree) {
    return 1;
  }
  return 0;
}

export const renderScoreLine = (
  score: TrustScore | undefined,
  npub: string,
  forceRender: boolean = true,
) => {
  if (!score || !npub) return null;
  return (
    <div className="text-sm flex flex-2 gap-2">
      {RenderScoreTrustLink(score, npub, forceRender)}
      {RenderScoreDistrustLink(score, npub, forceRender)}
    </div>
  );
};

const TrustList = ({ props }: ViewComponentProps) => {
  const [rawList, setRawList] = useState<Array<Vertice>>([]);
  const [displayList, setDisplayList] = useState<Array<Vertice>>([]);
  const [unsubscribe] = useState<Array<() => void>>([]);

  useEffect(() => {
    let id = ID(props.hexKey);
    if (!id) return;

    let entitytype = parseEntityType(props.entitytype, 1);
    let trust1Value = parseTrust1Value(props.trusttype, undefined);

    loadList(id, props.dir, entitytype, trust1Value);

    return () => {
      unsubscribe.forEach((u) => u?.());
    };
  }, [props.npub, props.dir, props.entitytype, props.trusttype]);

  // Implement filter on rawList using the filter property
  useEffect(() => {
    let filterResults = filterByName(rawList, props.filter);
    if (filterResults.length == 0 && displayList.length == 0) return;
    setDisplayList(filterResults);
  }, [props.filter, rawList]);

  async function loadList(id: number, dir: string, entitytype: EntityType, trust1Value?: number) {
    let list: Vertice[] = [];

    if (dir == 'out') {
      list = graphNetwork.g.outTrustById(id, entitytype, trust1Value);
    }

    if (props.dir == 'in') {
      list = graphNetwork.g.trustedBy(id, EntityType.Key, trust1Value);
    }

    let addresses = list.map((v) => STR(v.id));

    // Make sure we have the profiles for the addresses
    await profileManager.getProfiles(addresses);
    //unsubscribe.push(unsub);

    list = list.sort(compareDegree);
    setRawList(list);
  }

  const renderVertices = () => {
    let id = ID(props.hexKey);

    if (displayList.length == 0) return <div className="text-center">{t('No results')}</div>;

    return <>{displayList.map((v) => renderEntityKey(v, id))}</>;
  };

  const renderEntityKey = (v: Vertice, id: number) => {
    const itemKey = STR(v.id);
    const score = v.score;
    const degree = score?.atDegree - 1 || 0;

    const itemNpub = Key.toNostrBech32Address(itemKey as string, 'npub') as string;

    let arrowClass = '';
    let arrow = '';

    if (props.dir == 'in') {
      const edge = v.out[id] as Edge;
      if (edge) {
        const color = RenderTrust1Color(edge.val);
        arrowClass = `text-${color}-500 text-2xl`;
        arrow = '\u2190';
      }
    } else {
      const edge = v.in[id] as Edge;
      if (edge) {
        const color = RenderTrust1Color(edge.val);
        arrowClass = `text-${color}-500 text-2xl`;
        arrow = '\u2192';
      }
    }

    return (
      <div key={itemKey} className="flex w-full py-2">
        <div className="flex-0 self-center px-4">
          <i className={arrowClass}>{arrow}</i>
        </div>
        <Link href={props.setSearch({ npub: itemNpub })} className="flex flex-1 gap-2">
          <MyAvatar str={itemNpub} width={49} />
          <div>
            <Name pub={itemNpub} hexKey={itemKey} />
            <br />
            <span className="text-sm">Degree {degree}</span>
          </div>
        </Link>
        {renderScoreLine(score, itemNpub)}
      </div>
    );
  };

  if (!props.npub) return null;
  return (
    <>
      <div className="flex flex-wrap gap-4">
        <Show when={props.entitytype == "key"}>
          <GraphDirectionSelect dir={props.dir} setSearch={props.setSearch} />
        </Show>
        <GraphTrust1Select trusttype={props.trusttype} setSearch={props.setSearch} />
        <GraphEntityTypeSelect
          entitytype={props.entitytype}
          dir={props.dir}
          setSearch={props.setSearch}
        />
      </div>
      <hr className="-mx-2 opacity-10 my-2" />
      <div className="flex flex-col w-full gap-4">
        <ScrollView>{renderVertices()}</ScrollView>
      </div>
    </>
  );
};

export default TrustList;
