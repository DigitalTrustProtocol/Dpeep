import { min } from 'lodash';
import { EPOCH } from './Utils/Nostr';
import { BulkStorage } from './network/BulkStorage';
import storage from './Storage';
import { UID } from '@/utils/UniqueIds';
import recommendRelayManager from './RecommendRelayManager';
import { Event, Relay, getEventHash, getSignature } from 'nostr-tools';
import Key from '@/nostr/Key';
import RelayPool from './network/provider/RelayPool';
import { Url } from './network/Url';
import { f } from 'vitest/dist/reporters-2ff87305.js';

// NIP-65 - Each author has a read/write on a relay
export type PublicRelaySettings = {
  read: boolean;
  write: boolean;
  created_at?: number; // When the author added the relay
};

export type PopularRelay = {
  url: string;
  authorCount: number;
  eventCount?: number;
};


export class RelayRecord {
  url: string = '';
  read: boolean = true; // For now not used
  write: boolean = true; // For now not used
  auth: boolean = false; // If the relay requires authentication
  enabled: boolean = true; // If the relay is enabled

  timeoutCount: number = 0; // Number of timeouts from this relay, lower is better
  lastSync: number = 0; // Last time this relay was synced with the client
  lastActive: number = 0; // Used to determine if a relay is active or not
  search: boolean = false; // If the relay is a search relay
  connectionStatus: string = ''; // Last status of the relay
  connectionError: string = ''; // Last error of the relay
  eventCount: number = 0; // Number of events received from this relay, higher is better
}

type RelayContainer = {
  record: RelayRecord;
  referenceBy: Set<UID>; // Number of references to this relay by users and events, higher is better
  recommendBy: Set<UID>; // Number of recommendations for this relay, higher is better

  instance?: Relay; // Instance of the relay
};

// Handles the relays in the context of Dpeep
// RelayManager name is too close to ReplyManager so it was renamed to ServerManager
class ServerManager {
  maxConnectedRelays = 10; // Max number of relays to connect to
  maxConnectionWait = 5000; // Max time to wait for a relay to connect

  poolOptions = {
    //eoseSubTimeout?: number
    //getTimeout?: number
    seenOnEnabled: true,
    //batchInterval?: number
  };

  logging = false;

  authorRelays: Map<UID, Map<string, PublicRelaySettings>> = new Map();
  relayAuthors: Map<string, Set<UID>> = new Map();

  containers = new Map<string, RelayContainer>();

  // Database records
  records: Map<string, RelayRecord> = new Map();

  table = new BulkStorage(storage.relays);

  pool: RelayPool;

  private metrics = {
    Table: 0,
    Events: 0,
    Authors: 0,
  };

  constructor() {
    this.pool = new RelayPool(this.poolOptions);
  }

  async loadRelays() {
    await this.load();

    if (this.records.size === 0) {
      let relays = DEFAULT_RELAYS;
      for (const url of relays) {
        this.addRecord(url);
      }

      let search = SEARCH_RELAYS;
      for (const url of search) {
        let init = new RelayRecord();
        init.search = true;
        let record = this.addRecord(url, init);
        record.search = true;
      }
    }
  }

  // Setup the pool with preferred and popular relays, and filter out unresponsive relays
  // Best when the relays data have been loaded from the database
  // This method should be called before any subscriptions are made, for best performance
  async initializePool(): Promise<Relay> {
    let containers = this.popularRelays();

    console.log('Initializing relay pool with', containers.length, 'relays');
    let relays: any = [];
    for (const container of containers) {
      if (!container.instance) {


        let url = Url.normalizeRelay(container.record.url);
        console.log('normalizeRelay to relay:', url);

        if(!url) continue; // Invalid url, skip, could be a local url, onion, etc.

        container.instance = this.pool.createRelay(container.record.url); // Connecting to relay
        this.subscribeRelayStatus(container.instance); // Subscribe to relay status

        let promiseRelay = container.instance.connect();

        relays.push(promiseRelay);
        promiseRelay.catch((error) => {
          container.record.connectionStatus = 'Failed to connect';
          container.record.connectionError = error?.['message'] || 'Unknown';
        });
      }
      if(relays.length >= this.maxConnectedRelays) break;
    }
    // A promise that rejects after 3 seconds
    let timeoutPromise = new Promise((_, reject) => {
      setTimeout(
        () => reject(new Error('Relay connection timeout reached')),
        this.maxConnectionWait,
      );
    });

    // Race the timeout against all relay connection promises
    try {
      console.log('Waiting for relays to connect');
      await Promise.race([Promise.all(relays), timeoutPromise]);
    } catch (error) {
      console.error(error);
      // Handle the timeout or other errors here
    }
    return relays; // Return the relay containers that is trying to connect
  }

  async publish(event: Event) {
    let relays = this.getActiveRelays([]);
    await this.pool.publish(relays, event);
  }

  sign(event: Event) {
    if (!event.sig) {
      if (!event.tags) {
        event.tags = [];
      }
      event.content = event.content || '';
      event.created_at = event.created_at || Math.floor(Date.now() / 1000);
      event.pubkey = Key.getPubKey();
      event.id = getEventHash(event as Event);
      event.sig = getSignature(event as Event, Key.getPrivKey());
    }
    if (!(event.id && event.sig)) {
      console.error('Invalid event', event);
      throw new Error('Invalid event');
    }
  }

  subscribeRelayStatus(relay: Relay) {
    let startTimer = Date.now();
    let url = relay.url;
    relay.on('connect', () => {
      console.log('connected to relay:', url, ' - time in milisec:', Date.now() - startTimer);
    });

    relay.on('disconnect', () => {
      console.log('disconnected from relay:', url, ' - time in milisec:', Date.now() - startTimer);
    });

    relay.on('error', () => {
      console.log('error from relay:', url);
    });

    relay.on('notice', (msg) => {
      console.log('notice from relay:', url, msg);
      relay.close();
      delete this.pool.relayInstances[url];
      console.log('closed relay:', url);
    });

    relay.on('auth', (challenge) => {
      console.log(
        'auth from relay:',
        url,
        challenge,
        ' - time in milisec:',
        Date.now() - startTimer,
      );


    });
  }

  // Relay add and get ----------------------


  addRecord(url: string, init?: RelayRecord): RelayRecord {

    let record = this.records.get(url);
    if (!record) {
      record = init || new RelayRecord();
      record.url = url;
      this.records.set(url, record);
      this.save(record);
    }
    return record;
  }

  relayContainer(url: string): RelayContainer {
    if(url.endsWith('/')) url = url.slice(0, -1);
    let container = this.containers.get(url);
    if (!container) {
      container = {
        record: this.addRecord(url),
        referenceBy: serverManager.relayAuthors.get(url) || new Set(),
        recommendBy: recommendRelayManager.relayAuthors.get(url) || new Set(),
        //instance: () => getRelayPool().relayByUrl.get(url), // Instance of the relay, may be undefined
      } as RelayContainer;
      this.containers.set(url, container);
    }
    return container;
  }

  // Get the relays used by the user or recommended or within the contact content, used to determine which relays to use when querying for events
  ensureRelaysBy(authorId: UID, read: boolean, write: boolean): Array<string> {
    let result = new Set<string>();
    let authorRelays = this.authorRelays.get(authorId);
    if (authorRelays) {
      for (let [url, value] of authorRelays) {
        if (value.read && read) result.add(url);
        if (value.write && write) result.add(url);
      }
    }
    return [...result];
  }

  ensureAuthorRelays(authorId: UID): Map<string, PublicRelaySettings> {
    let relays = this.authorRelays.get(authorId);
    if (!relays) {
      relays = new Map<string, PublicRelaySettings>();
      this.authorRelays.set(authorId, relays);
    }
    return relays;
  }

  ensureAuthorRelaySettings(authorId: UID, url: string): PublicRelaySettings {
    let authorRelays = this.ensureAuthorRelays(authorId);
    let settings = authorRelays.get(url);
    if (!settings) {
      settings = { read: true, write: true };
      authorRelays.set(url, settings);
    }
    return settings;
  }

  addRelaySettings(authorId: UID, url: string, settings: PublicRelaySettings) {
    let currentSettings = this.ensureAuthorRelaySettings(authorId, url);
    if ((currentSettings?.created_at || 0) < (settings?.created_at || 0)) {
      currentSettings.created_at = settings.created_at;
      currentSettings.read = settings.read;
      currentSettings.write = settings.write;
    }
    return currentSettings;
  }

  addRelayAuthor(authorId: UID, url: string) {
    let relayAuthors = this.relayAuthors.get(url);
    if (!relayAuthors) {
      relayAuthors = new Set<UID>();
      this.relayAuthors.set(url, relayAuthors);
    }
    relayAuthors.add(authorId);
    return relayAuthors;
  }

  addRelay(authorId: UID, url: string, settings: PublicRelaySettings) {

    let normalizedUrl = Url.normalizeRelay(url); // Normalize the url make sure it is a valid wss url
    if(!normalizedUrl) return;

    this.addRelaySettings(authorId, url, settings);
    this.addRelayAuthor(authorId, url);
    this.addRecord(url);
  }

  allRelays(): Array<string> {
    let urls = Array.from(this.records.keys());
    return [...urls];
  }

  // getBestReadRelays(numberOfRelays: number = 10) : Array<string> {
  //     let relays = Array.from(this.records.values()).filter((r) => r.read).sort((a, b) => b.eventCount - a.eventCount);
  //     return relays.map((r) => r.url).slice(0,numberOfRelays);
  // }

  allRelayContainers(): Array<RelayContainer> {
    let result = new Array<RelayContainer>();

    let allRelays = this.allRelays();
    for (const url of allRelays) {
      let container = serverManager.relayContainer(url);
      result.push(container);
    }

    return result;
  }

  popularRelays(): Array<RelayContainer> {
    if (this.records.size === 0) {
      let relays = DEFAULT_RELAYS;
      for (const url of relays) {
        this.addRecord(url);
      }
    }

    let containers = this.allRelayContainers()
      .filter((r) => r.record.enabled)
      .sort((a, b) => b.record.eventCount - a.record.eventCount);
    return containers;
  }

  getActiveRelays(extraRelays: string[] = []): Array<string> {
    let urls = this.allRelayContainers()
      .filter((r) => r.record.enabled && r.instance && r.instance.status === 1)
      .map((r) => r.record.url);

    if(extraRelays) 
      extraRelays = extraRelays.filter((r) => !urls.includes(r));
    
    return [...urls, ...extraRelays];
  }

  // Find the relays that are used by the authors
  relaysByAuthors(authorIds: UID[], write=true, read=true): Array<string> {
    // let result = new Set<string>();
    // for (const authorId of authorIds) {
    //   let relays = this.ensureRelaysBy(authorId, read, write);
    //   for (const url of relays) {
    //     result.add(url);
    //   }
    // }
    let result = this.groupByInner(authorIds);
    return result;
  }

  isRelayOk(url: string) {
    let container = this.relayContainer(url);
    if (container.record.connectionStatus == 'error') return false;
    if (container.record.timeoutCount >= 3) return false;
    return true;
  }

  // Get the relays that are used by the authors
  groupByInner(authorIds: UID[]) : Array<string> {
    let result: string[] = [];
    let relays = new Map<string, Set<UID>>();

    // First count the relays used by the authors
    for (const authorId of authorIds) {
      let authorRelays = this.ensureRelaysBy(authorId, true, true);
      for (const url of authorRelays) {
        let users = relays.get(url);
        if(!users)  {
          users=  new Set<UID>();
          relays.set(url, users);
        }
        users.add(authorId);
      }
    }

    // Sort the relays by count highest first
    let sorted = [...relays.entries()].sort((a, b) => b[1].size - a[1].size);

    let rest = new Set<UID>(authorIds);

    // Filter out relays that are not ok and only used by few authors
    for(const [url, users] of sorted) {
      if(!this.isRelayOk(url)) continue; // Skip relays that are not ok

      let beforeSize = rest.size;
      for(const authorId of users) {
        rest.delete(authorId);
      }

      if(rest.size != beforeSize) {
        result.push(url);
      }

      if(rest.size == 0 && result.length >= 3) break;
    }

    console.log("groupByInner - Authors:", authorIds, " - Relays:", result, " - rest-authors:", rest.size);

    return result;
  }



  getLastSync(relayData: RelayRecord[]): number {
    return min(relayData.map((r) => r.lastSync)) || EPOCH;
  }

  increaseEventCount(url: string, now: number = Date.now()) {
    let container = this.relayContainer(url);
    container.record.eventCount++;
    container.record.lastActive = now;
    this.save(container.record);
  }

  increaseTimeoutCount(url: string, now: number = Date.now()) {
    let container = this.relayContainer(url);
    container.record.timeoutCount++;
    container.record.lastActive = now;
    this.save(container.record);
  }

  setConnectionStatus(url: string, status: string, error?: string) {
    let container = this.relayContainer(url);
    container.record.connectionStatus = status;
    container.record.connectionError = error || '';
    this.save(container.record);
  }


  async load(): Promise<void> {
    let records = await this.table.toArray();
    for (let record of records) {
      this.records.set(record.url, record);
    }
  }

  save(record: RelayRecord): void {
    this.table.save(record.url, record); // Save to the database, async in bulk
  }

  getMetrics() {
    this.table.count().then((count) => (this.metrics.Table = count));
    //this.metrics.Authors = this.authorRelays.size;
    return this.metrics;
  }

}

const serverManager = new ServerManager();
export default serverManager;

const DEFAULT_RELAYS = [
  'wss://eden.nostr.land',
  'wss://nostr.fmt.wiz.biz',
  'wss://relay.damus.io',
  'wss://nostr-pub.wellorder.net',
  'wss://offchain.pub',
  'wss://nos.lol',
  'wss://relay.snort.social',
  'wss://relay.current.fyi', //Slow!
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

