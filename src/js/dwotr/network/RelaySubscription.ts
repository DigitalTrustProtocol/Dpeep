import { Event, Filter, SubscriptionOptions } from 'nostr-tools';
import { OnEvent, ReplaceableKinds, StreamKinds, FeedOption, OnEose } from './provider';

import { ID, STR, UID } from '@/utils/UniqueIds';
import eventManager, { DWoTREvent } from '../EventManager';
import { getNostrTime } from '../Utils';
import blockManager from '../BlockManager';
import serverManager from '../ServerManager';
import { EPOCH } from '../Utils/Nostr';
import { Events } from './types';

class RelaySubscription {
  until = getNostrTime();

  subscribedAuthors = new Set<UID>();

  logging = false;

  subCount = 0;
  subs = new Map<number, () => void>();

  //#subCounter = 0;

  metrics = {
    SubscribedAuthors: 0,
    Subscriptions: 0,
    Callbacks: 0,
    Profiles: 0,
    NoteEvents: 0,
    ContactEvents: 0,
    ReactionEvents: 0,
    TrustEvents: 0,
  };

  // Continuously subscribe to authors and most kinds of events.
  // This is used to keep the relay connection alive and constantly getting new events.
  // Used the for WoT context. Following and trusted authors are subscribed to.
  mapAuthors(
    authorIds: Set<UID> | Array<UID>,
    since = this.until + 1,
    kinds = [...StreamKinds, ...ReplaceableKinds],
    onEvent?: OnEvent,
    onEose?: OnEose,
  ): Array<number> {
    let authors: Array<string> = [];

    for (let id of authorIds) {
      if (this.subscribedAuthors.has(id)) continue;
      this.subscribedAuthors.add(id);
      authors.push(STR(id) as string);
    }

    if (authors.length === 0) return [];

    // Batch authors into chunks, so size limits are not hit.
    let batchs = this.#batchArray(authors, 100);
    let subs: Array<any> = [];

    for (let batch of batchs) {
      let filter = {
        authors: batch,
        kinds,
        since,
      } as Filter;

      let options = {
        filter,
        onEvent,
        onEose,
      } as FeedOption;

      subs.push(this.map(options));
    }

    return subs;
  }

  async onceAuthors(
    authorIds: Set<UID> | Array<UID>,
    since = EPOCH,
    until = getNostrTime(),
    kinds = [...StreamKinds, ...ReplaceableKinds],
  ): Promise<boolean> {
    let authors: Array<string> = [];
    let timeOut = 30000;

    for (let id of authorIds) {
      authors.push(STR(id) as string);
    }

    if (authors.length === 0) return Promise.resolve(true);

    // Batch authors into chunks, so size limits are not hit.
    let batchs = this.#batchArray(authors, 100);
    let subs: Array<Promise<Event[]>> = [];

    for (let batch of batchs) {
      let filter = {
        authors: batch,
        kinds,
        since,
        until,
      } as Filter;

      let options = {
        filter,
      } as FeedOption;

      subs.push(this.list(options, timeOut));
    }

    await Promise.all(subs);

    return true;
  }

  // A Once subscription is used to get a batch of events by an author.
  // Return a true value when done and false if timed out.
  async getEventsByAuthor(
    authors: Array<string>,
    kinds: Array<number>,
    onEvent?: OnEvent,
    limit?: number | undefined,
    since?: number | undefined,
    until?: number | undefined,
  ): Promise<Events> {
    let filter = {
      authors,
      kinds,
      since,
      until,
      limit,
    } as Filter;

    return this.getEventsByFilter(filter, onEvent);
  }

  // A Once subscription is used to get a batch of events by ids.
  // Return a true value when done and false if timed out.
  async getEventByIds(
    ids: Array<string>,
    kinds?: Array<number>,
    onEvent?: OnEvent,
    limit?: number | undefined,
    since?: number | undefined,
    until?: number | undefined,
  ): Promise<Array<Event>> {
    let filter = {
      ids,
      kinds,
      since,
      until,
      limit,
    } as Filter;
    return await this.getEventsByFilter(filter);
  }

  async getEventsByFilter(filter: Filter, cb?: OnEvent, relays?: string[]): Promise<Events> {
    let options = {
      filter,
      onEvent: cb,
      relays,
    } as FeedOption;

    return this.list(options);
  }

  // A Continues subscription is used to get events by options.
  // Return a unsubribe number value, used to unsubscribe.
  map(options: FeedOption): number {
    let { relays, opts, eventHandler } = this.#createParams(options);

    let sub = serverManager.pool.sub(relays, [options.filter], opts);
    sub.on('event', (event) => {
      eventHandler(event);
    });

    sub.on('eose', () => {
      options?.onEose?.(true, '', 0);
      console.log('eose', options.filter);
    });

    this.subs.set(++this.subCount, sub.unsub);

    return this.subCount;
  }

  // A Once subscription is used to get events by options.
  // Return a true value when done and false if timed out.
  async list(options: FeedOption, timeOut: number = 1000): Promise<Event[]> {
    let { relays, opts, eventHandler } = this.#createParams(options);

    let events = await serverManager.pool.list(relays, [options.filter], opts);
    for (let event of events) {
      eventHandler(event);
    }
    return events;
  }

  async getEvent(options: FeedOption): Promise<Event | null> {
    let { relays, opts, eventHandler } = this.#createParams(options);

    let event = await serverManager.pool.get(relays, options.filter, opts);
    if (!event) return null;
    eventHandler(event);
    return event;
  }

  #createParams(options: FeedOption) {
    let relays = serverManager.getActiveRelays(options.relays);
    let opts = {
      alreadyHaveEvent: this.alreadyHaveEvent.bind(this),
      eoseSubTimeout: options.eoseSubTimeout,
    } as SubscriptionOptions;
    let eventHandler = this.#createEventHandler(options?.onEvent);

    return { relays, opts, eventHandler };
  }

  off(id: number) {
    this.subs.get(id)?.();
    this.subs.delete(id);
  }

  offAll() {
    for (let unsub of this.subs.values()) {
      unsub();
    }
    this.subs.clear();
  }

  #batchArray(arr: Array<any>, batchSize: number = 1000) {
    const batchedArr: Array<any> = [];

    for (let i = 0; i < arr.length; i += batchSize) {
      batchedArr.push(arr.slice(i, i + batchSize));
    }

    return batchedArr;
  }

  #createEventHandler(userOnEvent?: OnEvent, internalFastCall?: OnEvent) {
    //let subCounter = this.#subCounter;

    const eventHandler = (event: Event) => {
      let authorId = ID(event.pubkey);
      if (blockManager.isBlocked(authorId)) return;

      if (!event) return;
      let id = ID(event.id);

      if (eventManager.seen(id)) {
        userOnEvent?.(event, false, undefined);
        return;
      }

      eventManager.eventCallback(event).finally(() => {
        userOnEvent?.(event, false, undefined);
      });
    };
    return eventHandler;
  }

  alreadyHaveEvent(id: string, relay: string): boolean {
    let eventId = ID(id);

    this.#addEventRelay(eventId, relay); // Add the relay to the event, so we know where it came from, even if we already have it

    if (eventManager.seen(eventId)) return true;

    return false;
  }

  #addEventRelay(eventId: UID, relay: string) {
    let event = eventManager.eventIndex.get(eventId) as DWoTREvent;
    if (!event) return false;

    if (!event.dwotr) event.dwotr = { relays: [] };
    if (!event.dwotr.relays) event.dwotr.relays = [];
    if (event.dwotr.relays?.includes(relay)) return;
    event.dwotr!.relays!.push(relay);
  }

  getMetrics() {
    this.metrics.SubscribedAuthors = this.subscribedAuthors.size;
    this.metrics.Subscriptions = this.subs.size;

    return this.metrics;
  }
}

const relaySubscription = new RelaySubscription();
export default relaySubscription;
