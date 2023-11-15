import {
  Event,
  matchFilters,
  mergeFilters,
  type Filter,
  eventsGenerator,
  relayInit,
  type Relay,
  type Sub,
  type SubscriptionOptions,
} from 'nostr-tools';
import { normalizeURL } from 'nostr-tools/utils';

type BatchedRequest = {
  filters: Filter<any>[];
  relays: string[];
  resolve: (events: Event<any>[]) => void;
  events: Event<any>[];
};

type RelayMetadata = Relay & {
  slowCount: number;
  eventCount: number;
  connectionFailure: boolean;
  message: string;
};

// From nostr tools simple pool
// Modified for relay optimizations, e.g. filtering out slow relays etc.
export default class RelayPool {
  private batchedByKey: { [batchKey: string]: BatchedRequest[] } = {};

  private eoseSubTimeout: number;
  private getTimeout: number;
  private seenOnEnabled: boolean = true;
  private batchInterval: number = 100;

  public relayInstances: { [url: string]: Relay };
  public seenOn: { [id: string]: Set<string> } = {}; // a map of all events we've seen in each relay

  public slowRelays: Map<string, number> = new Map();

  constructor(
    options: {
      eoseSubTimeout?: number;
      getTimeout?: number;
      seenOnEnabled?: boolean;
      batchInterval?: number;
    } = {},
  ) {
    this.relayInstances = {};
    this.eoseSubTimeout = options.eoseSubTimeout || 3400;
    this.getTimeout = options.getTimeout || 3400;
    this.seenOnEnabled = options.seenOnEnabled !== false;
    this.batchInterval = options.batchInterval || 100;
  }

  close(relays: string[]): void {
    relays.forEach((url) => {
      let relay = this.relayInstances[normalizeURL(url)];
      if (relay) relay.close();
    });
  }

  createRelay(url: string): Relay {
    url = normalizeURL(url);

    if (!this.relayInstances[url]) {
      let relay = relayInit(url, {
        getTimeout: this.getTimeout * 0.9,
        listTimeout: this.getTimeout * 0.9,
        countTimeout: this.getTimeout * 0.9,
      });

      let metadata = relay as RelayMetadata;
      metadata.slowCount = 0;
      metadata.eventCount = 0;

      this.relayInstances[url] = relay;
    }

    const relay = this.relayInstances[url];
    return relay;
  }

  async ensureRelay(url: string): Promise<Relay> {
    const relay = this.createRelay(url);
    await relay.connect();
    return relay;
  }

  connectedRelays(): string[] {
    return Object.keys(this.relayInstances).filter((url) => {
      return this.relayInstances[url].status === 1;
    });
  }

  removeSlowRelays(relays: string[]): string[] {
    return relays.filter((url) => ((this.relayInstances[url] as RelayMetadata).slowCount || 0) < 3); // remove relays that have been marked as slow more than 3 times
  }

  sub<K extends number = number>(
    relays: string[],
    filters: Filter<K>[],
    opts?: SubscriptionOptions,
  ): Sub<K> {
    let _knownIds: Set<string> = new Set();
    let modifiedOpts = { ...(opts || {}) };

    if (relays.length === 0) relays = this.connectedRelays(); // if no relays are specified, use all connected relays
    relays = relays.map(normalizeURL); // normalize urls
    relays = [...new Set(relays)]; // remove duplicates
    relays = this.removeSlowRelays(relays); // remove slow/unresponsive relays

    modifiedOpts.alreadyHaveEvent = (id, url) => {
      let relayInstance = this.relayInstances[url] as RelayMetadata;
      if (relayInstance) relayInstance.eventCount++;

      if (opts?.alreadyHaveEvent?.(id, url)) return true;

      if (this.seenOnEnabled) {
        let set = this.seenOn[id] || new Set();
        set.add(url);
        this.seenOn[id] = set;
      }
      return _knownIds.has(id);
    };

    let startTimer = Date.now();
    let subs: Sub[] = [];
    let eventListeners: Set<any> = new Set();
    let eoseListeners: Set<any> = new Set();
    let eoseRelays = new Set(relays);

    let eoseSent = false;
    let eoseTimeout: NodeJS.Timeout | undefined;
    if (!!opts?.eoseSubTimeout) {
      // If eoseSubTimeout is set, we need to set a timeout
      eoseTimeout = setTimeout(
        () => {
          eoseSent = true;
          eoseRelays.forEach((url) => (this.relayInstances[url] as RelayMetadata).slowCount++); // mark all relays as slow if they didn't respond in time

          console.log(
            'eose timeout - slow relays:',
            [...eoseRelays],
            ' - time in miliSec:',
            Date.now() - startTimer,
          );
          for (let cb of eoseListeners.values()) cb(eoseRelays);
        },
        opts?.eoseSubTimeout,
      );
    }

    function handleEose(url: string) {
      eoseRelays.delete(url);
      if (eoseRelays.size === 0) {
        if (eoseTimeout) clearTimeout(eoseTimeout);
        console.log('eose - time in milisec:', Date.now() - startTimer);
        for (let cb of eoseListeners.values()) cb(eoseRelays);
      }
    }

    relays.forEach(async (relayUrl) => {
      let relayInstance: Relay;
      try {
        relayInstance = await this.ensureRelay(relayUrl);
      } catch (err: any) {
        let relayInstance = this.relayInstances[relayUrl] as RelayMetadata;
        relayInstance.connectionFailure = true; // mark as connection failure
        relayInstance.message = err?.message;
        relayInstance.slowCount = 3; // mark as slow
        handleEose(relayUrl);
        return;
      }
      if (!relayInstance) return;

      let s = relayInstance.sub(filters, modifiedOpts);
      s.on('event', (event) => {
        _knownIds.add(event.id as string);
        for (let cb of eventListeners.values()) cb(event);
      });
      s.on('eose', () => {
        if (eoseSent) return;
        handleEose(relayUrl);
      });
      subs.push(s);
    });

    let greaterSub: Sub<K> = {
      sub(filters, opts) {
        subs.forEach((sub) => sub.sub(filters, opts)); // fire off the subscription to all relays
        return greaterSub as any;
      },
      unsub() {
        subs.forEach((sub) => sub.unsub());
      },
      on(type, cb) {
        if (type === 'event') {
          eventListeners.add(cb);
        } else if (type === 'eose') {
          eoseListeners.add(cb as () => void | Promise<void>);
        }
      },
      off(type, cb) {
        if (type === 'event') {
          eventListeners.delete(cb);
        } else if (type === 'eose') eoseListeners.delete(cb as () => void | Promise<void>);
      },
      get events() {
        return eventsGenerator(greaterSub);
      },
    };

    return greaterSub;
  }

  get<K extends number = number>(
    relays: string[],
    filter: Filter<K>,
    opts?: SubscriptionOptions,
  ): Promise<Event<K> | null> {
    let timeoutOpts = { ...opts, eoseSubTimeout: opts?.eoseSubTimeout || this.eoseSubTimeout }; // Force a timeout on the sub
    return new Promise((resolve) => {
      let sub = this.sub(relays, [filter], timeoutOpts);
      sub.on('event', (event) => {
        resolve(event);
        sub.unsub();
      });

      // we can rely on an eose being emitted here because pool.sub() will fake one
      sub.on('eose', () => {
        sub.unsub();
        resolve(null);
      });
    });
  }

  list<K extends number = number>(
    relays: string[],
    filters: Filter<K>[],
    opts?: SubscriptionOptions,
  ): Promise<Event<K>[]> {
    let timeoutOpts = { ...opts, eoseSubTimeout: opts?.eoseSubTimeout || this.eoseSubTimeout }; // Force a timeout on the sub
    return new Promise((resolve) => {
      let events: Event<K>[] = [];
      let sub = this.sub(relays, filters, timeoutOpts);

      sub.on('event', (event) => {
        events.push(event);
      });

      // we can rely on an eose being emitted here because pool.sub() will fake one
      sub.on('eose', () => {
        sub.unsub();
        resolve(events);
      });
    });
  }

  batchedList<K extends number = number>(
    batchKey: string,
    relays: string[],
    filters: Filter<K>[],
  ): Promise<Event<K>[]> {
    return new Promise((resolve) => {
      if (!this.batchedByKey[batchKey]) {
        this.batchedByKey[batchKey] = [
          {
            filters,
            relays,
            resolve,
            events: [],
          },
        ];

        setTimeout(() => {
          Object.keys(this.batchedByKey).forEach(async (batchKey) => {
            const batchedRequests = this.batchedByKey[batchKey];

            const filters = [] as Filter[];
            const relays = [] as string[];
            batchedRequests.forEach((br) => {
              filters.push(...br.filters);
              relays.push(...br.relays);
            });

            const sub = this.sub(relays, [mergeFilters(...filters)]);
            sub.on('event', (event) => {
              batchedRequests.forEach(
                (br) => matchFilters(br.filters, event) && br.events.push(event),
              );
            });
            sub.on('eose', () => {
              sub.unsub();
              batchedRequests.forEach((br) => br.resolve(br.events));
            });

            delete this.batchedByKey[batchKey];
          });
        }, this.batchInterval);
      } else {
        this.batchedByKey[batchKey].push({
          filters,
          relays,
          resolve,
          events: [],
        });
      }
    });
  }

  publish(relays: string[] | undefined, event: Event<number>): Promise<void>[] {
    if (!relays || relays.length === 0) relays = this.connectedRelays(); // if no relays are specified, use all connected relays
    return relays.map(async (relay) => {
      let r = await this.ensureRelay(relay);
      return r.publish(event);
    });
  }

  //   seenOn(id: string): string[] {
  //     return Array.from(this.seenOn[id]?.values?.() || [])
  //   }
}
