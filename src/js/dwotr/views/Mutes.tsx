import { useEffect, useState } from 'preact/hooks';
import profileManager from '../ProfileManager';
import { ViewComponentProps } from './GraphView';
import MuteViewSelect from '../components/MuteViewSelect';
import { translate as t } from '../../translations/Translation.mjs';
import { ID, UID } from '@/utils/UniqueIds';
import ScrollView from '@/components/ScrollView';
import Show from '@/components/helpers/Show';
import wotPubSub, { MuteKind } from '../network/WOTPubSub';
import eventManager from '../EventManager';
import muteManager from '../MuteManager';
import { throttle } from 'lodash';
import { MuteContainer } from '../model/ProfileRecord';

// Render all mutes from MutesManager
// Render mutes per user in the WoT of the user.
const Mutes = ({ props }: ViewComponentProps) => {

  const mutes = useLoadMutes(props.hexKey, props.view);

  if (!mutes) return null;

  const renderMutes = () => {
    if (!mutes || mutes?.length == 0) return <div className="text-center">{t('No mutes')}</div>;

    return <>{mutes.map((id) => renderProfile(id))}</>;
  };

  const renderProfile = (id: UID) => {
    let profile = profileManager.getMemoryProfile(id);
    if (!profile) return null;

    return (
      <div className="flex flex-2 gap-2" key={id}>
        <div className="flex flex-col">
          {/* <Name pub={profile.key} /> */}
          <div className="text-sm text-neutral-500">{profile?.name}</div>
        </div>
      </div>
    );
  };

  //const viewName = props.view == 'mutes' ? 'mutes' : 'Aggregated mutes';
  let description = '';
  switch (props.view) {
    case 'mutes':
      description = 'Public mutes by user';
      break;
    case 'mutespriv':
      description = 'Private mutes by user';
      break;
    case 'mutesaggr':
      description = 'Aggregated mutes by all trusted users';
      break;
  }

  return (
    <>
      <Show when={props.isMe}>
        <div className="flex flex-wrap gap-4">
          <MuteViewSelect view={props.view} setSearch={props.setSearch} />
        </div>
        <hr className="-mx-2 opacity-10 my-2" />
      </Show>
      <div className="text-sm flex flex-2 gap-2">{description}</div>
      <hr className="-mx-2 opacity-10 my-2" />
      Number of unique mutes: {mutes.length}
      <hr className="-mx-2 opacity-10 my-2" />
      <div className="flex flex-col w-full gap-4">
        <ScrollView>{renderMutes()}</ScrollView>
      </div>
    </>
  );
};

export default Mutes;


function useLoadMutes(hexKey: string | undefined, view: string | undefined) {
  const [mutes, setMutes] = useState<UID[]>([]);

  useEffect(() => {

    if (view == 'mutesaggr') {

      const setMutesThottled = throttle(() => {
        let list = [...muteManager.aggregatedMutes.p]
        setMutes(list);
      }, 1000);

      // const cb = (event: any) => {
      //   let profile = eventManager.muteEvent(event);
      //   if(!profile) return;

      //   muteManager.add(profile.mute?.p);

      //   setMutesThottled();
      //   //let pm = profile?.mutes?.map((v) => ID(v)) || [];
      //   //setMutes((mutes) => [...mutes, ...pm]);
      //   //let list = [...muteManager.mutes]
      //   //setCount(list.length);
      //   //setMutes(list);
      // }

      // let unsub = wotPubSub?.subscribeTrust(undefined, 0, cb, [MuteKind]);

      // let list: Array<string> = [];
      // for(const v in graphNetwork.g.vertices)  {
      //   let vertice = graphNetwork.g.vertices[v] as Vertice;
      //   if(vertice.entityType != EntityType.Key) continue;
      //   let profile = profileManager.getMemoryProfile(vertice.id);
      //   if(!profile) continue;
      //   if(!profile.mutes) continue;

      //   list = list.concat(profile.mutes || []);
      // }

      //setMutes(list.map((v) => ID(v)));

      return () => {
//        unsub?.();
      }

      //setMutes([...muteManager.mutes]);
    } else {
      if (!hexKey) return;

      let profile = profileManager.getMemoryProfile(ID(hexKey));
      if (!profile) return;

      //setMutes(profile.mute?.p?.map((v) => ID(v)) || []);
    }
  }, [hexKey, view]); // Change on hexKey or view

  return mutes;
}