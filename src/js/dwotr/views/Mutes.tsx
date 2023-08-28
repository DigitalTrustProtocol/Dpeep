import { useEffect, useState } from 'preact/hooks';
import profileManager from '../ProfileManager';
import { ViewComponentProps } from './GraphView';
import MuteViewSelect from '../components/MuteViewSelect';
import { translate as t } from '../../translations/Translation.mjs';
import Name from '@/components/user/Name';
import { ID, UID } from '@/utils/UniqueIds';
import ScrollView from '@/components/ScrollView';
import muteManager from '../MuteManager';
import Show from '@/components/helpers/Show';

// Render all mutes from MutesManager
// Render mutes per user in the WoT of the user.
const Mutes = ({ props }: ViewComponentProps) => {
  const [mutes, setMutes] = useState<UID[]>([]);

  useEffect(() => {
    if (props.view == 'aggrmutes') {
      setMutes([...muteManager.mutes]);
    } else {
      if (!props.hexKey) return;

      let profile = profileManager.getMemoryProfile(props.uid);
      if (!profile) return;

      setMutes(profile.mutes?.map((v) => ID(v)) || []);
    }
  }, [props.hexKey, props.view]); // Change on hexKey or view

  const renderMutes = () => {
    if (!mutes || mutes?.length == 0) return <div className="text-center">{t('No mutes')}</div>;

    return <>{mutes.map((id) => renderEntity(id))}</>;
  };

  const renderEntity = (id: UID) => {
    let profile = profileManager.getMemoryProfile(id);
    if (!profile) return null;

    return (
      <div className="flex flex-2 gap-2" key={id}>
        <div className="flex flex-col">
          <Name pub={profile.key} />
          <div className="text-sm text-neutral-500">{profile?.name}</div>
        </div>
      </div>
    );
  };

  if (!mutes) return null;

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
      <div className="flex flex-col w-full gap-4">
        <ScrollView>{renderMutes()}</ScrollView>
      </div>
    </>
  );
};

export default Mutes;
