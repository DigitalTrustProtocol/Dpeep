import { useEffect, useState } from 'preact/compat';

//import Relays, { PopularRelay } from '../../nostr/Relays';
import localState from '../../state/LocalState.ts';
import { translate as t } from '../../translations/Translation.mjs';
import serverManager, { PopularRelay } from '@/dwotr/ServerManager.ts';

export type RelayMetadata = { enabled: boolean; url: string };


const Network = () => {
  const [relays, setRelays] = useState<RelayMetadata[]>([]);
  const [popularRelays, setPopularRelays] = useState([] as PopularRelay[]);
  const [newRelayUrl, setNewRelayUrl] = useState('');

  useEffect(() => {
    const interval = setInterval(() => {
      
      let arr: RelayMetadata[] = [];
      for(let url of serverManager.pool.connectedRelays()) {
        arr.push({url, enabled: true});
      }
      setRelays(arr);
    }, 2000);
    return () => clearInterval(interval);
  });

  useEffect(() => {

    const getPopularRelays = (): Array<PopularRelay> => {
      let result = new Array<PopularRelay>();
  
      let allRelays = serverManager.allRelays();
      for (const url of allRelays) {
        let container = serverManager.relayContainer(url);
        let authorCount = container.recommendBy.size + container.referenceBy.size;
        let eventCount = container.eventCount;
        result.push({ url, authorCount, eventCount });
      }
  
      result.sort((a, b) => {
        return b.authorCount - a.authorCount;
      });
  
      return result;
    }

    setPopularRelays(getPopularRelays());
  }, []);

  const handleRemoveRelay = (relay) => {
    //localState.get('relays').get(relay.url).put(null);
    //Relays.remove(relay.url);
  };

  const ensureProtocol = (relay) => {
    if (relay.includes('://')) return relay;

    return `wss://${relay}`;
  };

  const handleAddRelay = (event, url) => {
    const newRelayUrlWithProtocol = ensureProtocol(url);
    localState
      .get('relays')
      .get(newRelayUrlWithProtocol)
      .put({ enabled: true, newRelayUrlWithProtocol });
    event.preventDefault(); // prevent the form from reloading the page
    //Relays.add(newRelayUrlWithProtocol); // add the new relay using the Nostr method
    setNewRelayUrl(''); // reset the new relay URL
  };

  const getStatus = (relay) => {
    try {
      return serverManager.pool.connections[relay.url].status;
    } catch (e) {
      return 3;
    }
  };

  const getClassName = (relay) => {
    switch (getStatus(relay)) {
      case 0:
        return 'text-iris-yellow';
      case 1:
        return 'text-iris-green';
      case 2:
        return 'text-iris-yellow';
      case 3:
        return '';
      default:
        return 'status';
    }
  };

  return (
    <div className="centered-container">
      <h2>{t('network')}</h2>
      <div className="flex flex-col gap-2">
        {relays.map((relay) => (
          <div className="flex gap-2 flex-row peer">
            <div className="flex-1 truncate max-w-[60vw]" key={relay.url}>
              <span className={getClassName(relay)}>&#x2B24; </span>
              {relay.url}
            </div>
            <button className="btn btn-neutral btn-sm" onClick={() => handleRemoveRelay(relay)}>
              {t('remove')}
            </button>
            <input
              className="checkbox"
              type="checkbox"
              checked={relay.enabled !== false}
              onChange={() => {
                relay.enabled = !(relay.enabled !== false);
                /* relay.enabled ? Relays.enable(relay.url) : Relays.disable(relay.url); */
              }}
            />
          </div>
        ))}
        <div className="flex flex-row peer gap-2">
          <div className="flex-cell" key="new">
            <input
              className="input"
              id="new-relay-url"
              type="text"
              placeholder={t('new_relay_url')}
              value={newRelayUrl}
              onChange={(event) => setNewRelayUrl((event.target as HTMLInputElement).value)}
            />
          </div>
          <div className="flex-cell no-flex">
            <button className="btn btn-neutral" onClick={(e) => handleAddRelay(e, newRelayUrl)}>
              {t('add')}
            </button>
          </div>
        </div>
        <div className="flex gap-2 my-2">
          <button className="btn btn-neutral" onClick={() => {/* Relays.saveToContacts() */} }>
            {t('save_relays_publicly')}
          </button>
          <button className="btn btn-neutral" onClick={() => {/* Relays.restoreDefaults() */} }>
            {t('restore_defaults')}
          </button>
        </div>
      </div>
      <h3>{t('popular_relays')}</h3>
      <div className="flex flex-col gap-2">
        <div className="flex peer gap-2">
          <div className="flex-grow">URL</div>
          <div className="flex-initial">{t('users')}</div>
          <div className="flex-initial">{t('events')}</div>
          <div className="flex-0"></div>
        </div>
        {popularRelays.map((relay) => (
          <div className="flex peer gap-2" key={relay.url}>
            <div className="flex-grow truncate max-w-[60vw]">{relay.url}</div>
            <div className="flex-initial">{relay.authorCount}</div>
            <div className="flex-initial">{relay.eventCount}</div>
            <div className="flex-initial">
              <button
                className="btn btn-sm btn-neutral"
                onClick={(e) => handleAddRelay(e, relay.url)}
              >
                {t('add')}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Network;
