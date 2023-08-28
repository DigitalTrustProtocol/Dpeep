import { Link } from 'preact-router';
import { translate as t } from '../../translations/Translation.mjs';

type GraphViewSelectProps = {
  view: string;
  setSearch: (params: any) => string;
};

const MuteViewSelect = ({ view, setSearch }: GraphViewSelectProps) => {
  const selected = 'graphlink active'; // linkSelected
  const unselected = 'graphlink';

  return (
    <div className="flex flex-wrap gap-4">
      <span className="text-neutral-500">Mutes list:</span>
      <Link
        href={setSearch({ view: 'mutespriv' })}
        className={view == 'mutespriv' ? selected : unselected}
      >
        {t('Private')}
      </Link>
      <Link
        href={setSearch({ view: 'mutes' })}
        className={view == 'mutes' ? selected : unselected}
      >
        {t('Public')}
      </Link>
      <Link
        href={setSearch({ view: 'mutesaggr' })}
        className={view == 'mutesaggr' ? selected : unselected}
      >
        {t('Aggregated')}
      </Link>
    </div>
  );
};

export default MuteViewSelect;
