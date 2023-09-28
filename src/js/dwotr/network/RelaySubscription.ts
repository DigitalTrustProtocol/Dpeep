import { Event, Filter } from 'nostr-tools';
import wotPubSub, {
  EventCallback,
  OnEoseCallback,
  OnEvent,
  ReplaceableKinds,
  StreamKinds,
  SubscribeOptions,
} from './WOTPubSub';
import getRelayPool from '@/nostr/relayPool';

import { ID, STR, UID } from '@/utils/UniqueIds';
import eventManager from '../EventManager';


class RelaySubscription {
  subscribedAuthors = new Set<UID>();


  subCount = 0;
  subs = new Map<number, () => void>();

  // Continuously subscribe to authors and most kinds of events.
  // This is used to keep the relay connection alive and constantly getting new events.
  // Used the for WoT context. Following and trusted authors are subscribed to.
  OnAuthors(authorIds: Set<UID>, since: 0, kinds = [...StreamKinds, ...ReplaceableKinds], onEose?: OnEoseCallback,  onEvent?: EventCallback) : Array<number> {
    let authors: Array<string> = [];

    for (let id of authorIds) {
      if (this.subscribedAuthors.has(id)) continue;
      this.subscribedAuthors.add(id);
      authors.push(STR(id));
    }

    if (authors.length === 0) return [];

    // Batch authors into chunks, so size limits are not hit.
    let batchs = this.#batchArray(authors, 100);
    let subs: Array<number> = [];

    for (let batch of batchs) {
      let filters = [
        {
          authors: batch,
          kinds,
          since,
        },
      ] as Array<Filter>;

      let options = {
        filters,
        onEvent,
        onEose,
      } as SubscribeOptions;

      subs.push(this.On(options));
    }
    return subs;
  }


  // A Once subscription is used to get a batch of events by an author.
  // Return a true value when done and false if timed out.
  async getEventsByAuthor(
    authors: Array<string>,
    kinds: Array<number>,
    onEvent?: EventCallback,
    limit?: number | undefined,
    since?: number | undefined,
    until?: number | undefined,
  ): Promise<boolean> {
    let filters = [
      {
        authors,
        kinds,
        since,
        until,
        limit,
      } as Filter,
    ];

    return this.getEventsByFilters(filters, onEvent);
  }


  // A Once subscription is used to get a batch of events by ids.
  // Return a true value when done and false if timed out.
  async getEventsById(
    ids: Array<string>,
    kinds: Array<number>,
    onEvent?: EventCallback,
    limit?: number | undefined,
    since?: number | undefined,
    until?: number | undefined,
  ): Promise<boolean> {
    let filters = [
      {
        ids,
        kinds,
        since,
        until,
        limit,
      },
    ];

    return this.getEventsByFilters(filters, onEvent);
  }

  async getEventsByFilters(
    filters: Array<Filter>,
    cb?: EventCallback,
  ): Promise<boolean> {
    let options = {
      filters,
      onEvent: cb,
    } as SubscribeOptions;

    return this.Once(options);
  }


  // A Once subscription is used to get events by options.
  // Return a true value when done and false if timed out.
  async Once(options: SubscribeOptions, timeOut: number = 3000): Promise<boolean> {
    let timer: NodeJS.Timeout;

    let relays = wotPubSub.getRelays(options.filters);

    let promise = new Promise<boolean>((resolve, _) => {

      let state ={
        closed: false
      } 

      timer = setTimeout(() => {
        state.closed = true;
        options.onClose?.();
        resolve(false);
      }, timeOut);

      let tries = 0;

      const onEvent = this.#getOnEvent(options.onEvent as OnEvent, state);

      const onEose = (relayUrl: string, minCreatedAt: number) => {
        //console.log('onEose', relayUrl, tries, relays);

        if (relays.includes(relayUrl)) 
          tries++;
        
        let allEosed = tries === relays.length;
        options.onEose?.(allEosed, relayUrl, minCreatedAt);

        if (allEosed) {
          state.closed = true;
          clearTimeout(timer);
          options.onClose?.();
          resolve(true);
        }
      };

      getRelayPool().subscribe(options.filters, relays, onEvent, undefined, onEose, {
        allowDuplicateEvents: false,
        allowOlderEvents: false,
        logAllEvents: false,
        unsubscribeOnEose: true,
        //dontSendOtherFilters: true,
        //defaultRelays: string[]
      });
    });

    return promise;
  }

  // A Continues subscription is used to get events by options.
  // Return a unsubribe number value, used to unsubscribe.
  On(options: SubscribeOptions) : number {
    let relayIndex = new Map<string, number>();

    let relays = wotPubSub.getRelays(options.filters);

    let state ={
      closed: false
    } 

    const onEvent = this.#getOnEvent(options.onEvent as OnEvent, state);

    const onEose = (relayUrl: string, minCreatedAt: number) => {
      //console.log('onEose', relayUrl, minCreatedAt);

      relayIndex.set(relayUrl, 0);
      let allEosed = [...relayIndex.values()].every((v) => v === 0);

      options.onEose?.(allEosed, relayUrl, minCreatedAt);
    };

    let unsub = getRelayPool().subscribe(options.filters, relays, onEvent, undefined, onEose, {
      allowDuplicateEvents: false,
      allowOlderEvents: false,
      logAllEvents: false,
      unsubscribeOnEose: false,
      //dontSendOtherFilters: true,
      //defaultRelays: string[]
    });

    this.subs.set(++this.subCount, unsub);
    return this.subCount;
  }

  off(id: number) {
    this.subs.get(id)?.();
    this.subs.delete(id);
  }

  offAll() {
    for(let unsub of this.subs.values()) {
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


  #getOnEvent(userOnEvent: OnEvent, state: any) {

    const onEvent = (event: Event, afterEose: boolean, url: string | undefined) => {
      let id = ID(event.id);
      if(eventManager.seen(id)) { // Skip verify and eventHandle on seen events
        if(!state?.closed)
          userOnEvent?.(event, afterEose, url);
      }; 

      if(!eventManager.verify(event)) return; // Skip events that are not valid.

      eventManager.eventCallback(event).then((_) => {
        if(!state?.closed)
          userOnEvent?.(event, afterEose, url);
      });
    }
    return onEvent;
  }

}

const relaySubscription = new RelaySubscription();
export default relaySubscription;
