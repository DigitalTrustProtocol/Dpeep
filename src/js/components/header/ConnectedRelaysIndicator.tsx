import { useEffect, useState } from 'react';

import { translate as t } from '@/translations/Translation.mjs';
import Icons from '@/utils/Icons.tsx';
import serverManager from '@/dwotr/ServerManager';

export default function ConnectedRelaysIndicator() {
  const [connectedRelays, setConnectedRelays] = useState(serverManager.pool.connectedRelays().length);

  useEffect(() => {
    const updateRelayCount = () => {
      const count = serverManager.pool.connectedRelays().length;
      setConnectedRelays(count);
    };

    updateRelayCount();
    const intervalId = setInterval(updateRelayCount, 3000);

    // Cleanup when the component unmounts
    return () => {
      clearInterval(intervalId);
    };
  }, []);

  return (
    <a
      href="/settings/network"
      className={`ml-2 tooltip tooltip-bottom mobile-search-hidden`}
      data-tip={t('connected_relays')}
    >
      <small className="flex items-center gap-2">
        <span class="icon">{Icons.network}</span>
        <span>{connectedRelays}</span>
      </small>
    </a>
  );
}
