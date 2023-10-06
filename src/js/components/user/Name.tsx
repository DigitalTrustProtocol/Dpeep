import { ID } from '../../utils/UniqueIds.ts';

import Badge from './Badge';
import useVerticeMonitor from '../../dwotr/hooks/useVerticeMonitor';
import { useProfile } from '../../dwotr/hooks/useProfile';
import Key from '@/nostr/Key.ts';

type Props = {
  pub: string;
  hexKey?: string;
  placeholder?: string;
  hideBadge?: boolean;
};


const Name = (props: Props) => {
  const id = ID(props.pub || props.hexKey || Key.getPubKey());
  const { profile } = useProfile(id);

  const wot = useVerticeMonitor(ID(props.pub), ['badName', 'neutralName', 'goodName'], '');

  if (!profile) return null; // Will not render before profile is ready

  return (
    <>
      <span className={(profile.isDefault ? 'text-neutral-500' : '') + ' ' + wot?.option}>
        {profile.name || profile.display_name || props.placeholder}
      </span>
      {props.hideBadge ? '' : <Badge pub={props.pub} />}
    </>
  );
};

export default Name;