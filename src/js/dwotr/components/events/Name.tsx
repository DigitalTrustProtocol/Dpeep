import { memo } from 'preact/compat';
import Badge from '@/components/user/Badge';
import { useProfile } from '@/dwotr/hooks/useProfile';
import useVerticeMonitor from '@/dwotr/hooks/useVerticeMonitor';
import { UID } from '@/utils/UniqueIds';

type Props = {
  id: UID;
  placeholder?: string;
  hideBadge?: boolean;
};


const Name = ({ id, placeholder, hideBadge }: Props) => {
  const { profile } = useProfile(id);

  const wot = useVerticeMonitor(id, ['badName', 'neutralName', 'goodName'], '');

  if (!profile) return null; // Will not render before profile is ready

  return (
    <>
      <span className={(profile.isDefault ? 'text-neutral-500' : '') + ' ' + wot?.option}>
        {profile.name || profile.display_name || placeholder}
      </span>
      {hideBadge ? '' : <Badge id={id} />}
    </>
  );
};

export default memo(Name);