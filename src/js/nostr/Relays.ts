//import { sha256 } from '@noble/hashes/sha256';
//import throttle from 'lodash/throttle';
import { Event, Sub } from 'nostr-tools';

import relayPool from '@/nostr/relayPool.ts';

import localState from '../state/LocalState.ts';
//import Helpers from '../utils/Helpers';

//import PubSub from './PubSub';
import followManager from '@/dwotr/FollowManager.ts';
//import { ID } from '@/utils/UniqueIds.ts';

type SavedRelays = {
  [key: string]: {
    enabled?: boolean;
    lastSeen?: number;
  };
};

let savedRelays: SavedRelays = {};

const DEFAULT_RELAYS = [
  'wss://eden.nostr.land',
  'wss://nostr.fmt.wiz.biz',
  'wss://relay.damus.io',
  'wss://nostr-pub.wellorder.net',
  'wss://offchain.pub',
  'wss://nos.lol',
  'wss://relay.snort.social',
  //'wss://relay.current.fyi', Slow!
  'wss://soloco.nl',
];

const SEARCH_RELAYS = [
  'wss://relay.nostr.band',
  'wss://feeds.nostr.band/nostrhispano',
  'wss://search.nos.today',
  'wss://nostr-relay.app',
  'wss://nb.relay.center',
  'wss://nostrja-kari-nip50.heguro.com',
  'wss://nfdn.betanet.dotalgo.io',
  'wss://filter.stealth.wine',
  'wss://nostr.novacisko.cz',
];

export type RelayMetadata = { enabled: boolean; url: string };

export type PopularRelay = {
  url: string;
  users: number;
};

/**
 * Relay management and subscriptions. Bundles subscriptions in to max 10 larger batches.
 */
const Relays = {
  relays: new Map<string, RelayMetadata>(),
  searchRelays: new Map<string, RelayMetadata>(),
  //writeRelaysByUser: new Map<string, Set<string>>(), // Not used
  //filtersBySubscriptionName: new Map<string, string>(), // Not used
  //subscribedEventTags: new Set<string>(), // Not used
  //subscribedProfiles: new Set<string>(), // Not used
  //subscriptionsByName: new Map<string, Set<Sub>>(), // Not used
  //newAuthors: new Set<string>(), // Not used
  DEFAULT_RELAYS,
  init() {
    this.relays = new Map(DEFAULT_RELAYS.map((url) => [url, { enabled: true, url }]));
    this.searchRelays = new Map(SEARCH_RELAYS.map((url) => [url, { enabled: true, url }]));
    this.manage();
  },
  enabledRelays(relays?: Map<string, RelayMetadata>) {
    return Array.from((relays || this.relays).values())
      .filter((v) => v.enabled)
      .map((v) => v.url);
  },
  // Not used
  // getSubscriptionIdForName(name: string) {
  //   return Helpers.arrayToHex(sha256(name)).slice(0, 8);
  // },
  // get Map of relayUrl: {read:boolean, write:boolean}

  // Relocate code 
  // getUrlsFromFollowEvent(event: Event): Map<string, PublicRelaySettings> {
  //   const urls = new Map<string, PublicRelaySettings>();
  //   if (event.content) {
  //     try {
  //       const content = JSON.parse(event.content);
  //       for (const url in content) {
  //         try {
  //           const parsed = new URL(url).toString().replace(/\/$/, '');
  //           urls.set(parsed, content[url]);
  //         } catch (e) {
  //           //console.log('invalid relay url', url, event);
  //         }
  //       }
  //     } catch (e) {
  //       //console.log('failed to parse relay urls', event);
  //     }
  //   }
  //   return urls;
  // },
  getPopularRelays: function (): Array<PopularRelay> {
    let result = new Array<PopularRelay>();

    for(const key of followManager.relays.keys()) {
      const count = followManager.relays.get(key)?.referenceCount || 0;
      result.push({url: key, users: count});
    }

    result.sort((a, b) => b.users - a.users);

    return result;
  },
  getConnectedRelayCount: function () {
    let count = 0;
    for (const url of this.relays.keys()) {
      if (relayPool().relayByUrl.get(url)?.status === 1) {
        count++;
      }
    }
    return count;
  },
  // Not used
  // getUserRelays(user: string): Array<[string, PublicRelaySettings]> {
  //   if (typeof user !== 'string') {
  //     console.log('getUserRelays: invalid user', user);
  //     return [];
  //   }

  //   return Array.from(followManager.items.get(ID(user))?.relays.entries() || []);
  // },
  manage: function () {
    localState.get('relays').put({});
    localState.get('relays').on((r: SavedRelays) => {
      if (!r) {
        return;
      }
      savedRelays = r;
      for (const url of this.relays.keys()) {
        if (savedRelays[url] === null) {
          this.remove(url);
        } else if (savedRelays[url] && savedRelays[url].enabled === false) {
          const r = this.relays.get(url);
          if (r) {
            r.enabled = false;
            this.relays.set(url, r);
            relayPool().removeRelay(url);
          }
        }
      }
      for (const [url, data] of Object.entries(savedRelays)) {
        if (!data) {
          this.relays.has(url) && this.remove(url);
          continue;
        } else if (!this.relays.has(url)) {
          // `data` was missing `url` here, and those objects would be stored.
          // So this is backward compat.
          this.relays.set(url, { url, enabled: !!data.enabled });
          if (data.enabled) {
            relayPool().addOrGetRelay(url);
          }
        }
      }
    });
  },
  add(url: string) {
    if (this.relays.has(url)) return;
    const relay = { enabled: true, url };
    this.relays.set(url, relay);
    relayPool().addOrGetRelay(url);
  },
  remove(url: string) {
    try {
      relayPool().removeRelay(url);
    } catch (e) {
      console.log('error closing relay', e);
    }
    this.relays.delete(url);
  },
  disable(url: string) {
    if (!this.relays.has(url)) {
      return;
    }
    this.relays.set(url, { enabled: false, url });
    relayPool().removeRelay(url);
  },
  enable(url: string) {
    if (!this.relays.has(url)) {
      return;
    }
    this.relays.set(url, { enabled: true, url });
    relayPool().addOrGetRelay(url);
  },
  restoreDefaults() {
    this.relays.clear();
    for (const url of DEFAULT_RELAYS) {
      this.add(url);
    }
    followManager.publish(); // publish new follow event by current user
    //this.saveToContacts();
    // do not save these to contact list
    for (const url of SEARCH_RELAYS) {
      if (!this.relays.has(url)) this.add(url);
    }
    const relaysObj = {};
    for (const [url, relay] of this.relays.entries()) {
      relaysObj[url] = { enabled: relay.enabled, url };
    }
    localState.get('relays').put(relaysObj);
  },
  // Not used
  // updateLastSeen: throttle(
  //   (url) => {
  //     const now = Math.floor(Date.now() / 1000);
  //     localState.get('relays').get(url).get('lastSeen').put(now);
  //   },
  //   5 * 1000,
  //   { leading: true },
  // )
};

export default Relays;
