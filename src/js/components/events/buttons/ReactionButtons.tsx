import { memo } from 'preact/compat';

import Show from '@/components/helpers/Show';
import localState from '@/state/LocalState.ts';

import ReactionsList from '../ReactionsList';

import Like from './Like';
import Reply from './Reply';
import Repost from './Repost';
import Zap from './Zap';
import TrustReactionButtons from '@/dwotr/components/TrustReactionButtons';

let settings: any = {};
localState.get('settings').on((s) => (settings = s));


const ReactionButtons = (props) => {

  const event = props.event;
  const standalone = props.standalone;
  const wot = props.wot;

  return (
    <>
      {props.standalone && <ReactionsList event={props.event} wot={wot} />}
      <div className="flex gap-4">
        <Reply event={event} standalone={standalone} />
        <Show when={settings.showReposts !== false}>
          <Repost event={event} />
        </Show>
        <Show when={settings.showLikes !== false}>
          <Like event={event} />
        </Show>
        <Show when={settings.showZaps !== false}>
          <Zap event={event} />
        </Show>
        <TrustReactionButtons event={event} wot={wot} />
      </div>
    </>
  );
};

export default memo(ReactionButtons);
