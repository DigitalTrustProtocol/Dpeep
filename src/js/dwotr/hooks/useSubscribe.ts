import { useCallback, useEffect, useRef, useState } from 'react';
import { Event } from 'nostr-tools';

import { FeedOptions } from '../network/WOTPubSub';
import { FeedProvider } from '../network/FeedProvider';
import { EventCursor } from '../network/CursorRelay';

// class EventFilter {
//   ids: Set<string> = new Set();
//   authors: Set<string> = new Set();
//   kinds: Set<number> = new Set();
//   filterFn?: (event: Event) => boolean;

//   constructor(_filter?: Filter, _filterFn?: (event: Event) => boolean) {
//     this.ids = new Set(_filter?.ids);
//     this.authors = new Set(_filter?.authors);
//     this.kinds = new Set(_filter?.kinds);
//     this.filterFn = _filterFn;
//   }
// }

// class EventState {
//   events: Event[] = [];
//   refresh: Event[] = [];
//   more: Event[] = [];

//   batchSize: number = 10;
//   time: number = 0;
//   filter: EventFilter;

//   network: ContextFeedProvider;

//   constructor(_filter: Filter, _filterFn?: (event: Event) => boolean) {
//     this.filter = new EventFilter(_filter, _filterFn);

//     // let opt = {
//     //   filters: [_filter],
//     //   maxDelayms: 0,
//     // } as SubscribeOptions;

//     this.network = new ContextFeedProvider({ filters: [_filter] } as SubscribeOptions);
//   }

//   add(event: Event) {
//     if (!this.inScope(event)) return;

//     if (this.time == 0 || event.created_at <= this.time) {
//       this.more.push(event);
//     } else {
//       this.refresh.push(event);
//     }
//   }

//   inScope(event: Event) {
//     if (this.filter.ids.size > 0 && !this.filter.ids.has(event.id)) return false;
//     if (this.filter.authors.size > 0 && !this.filter.authors.has(event.pubkey)) return false;
//     if (this.filter.kinds.size > 0 && !this.filter.kinds.has(event.kind)) return false;
//     if (this.filter.filterFn && !this.filter.filterFn(event)) return false;

//     return true;
//   }

//   clear() {
//     this.events = [];
//     this.refresh = [];
//     this.more = [];
//     this.time = 0;
//   }

//   // Load all refresh events into the event list
//   mergeRefresh() {
//     if (this.refresh.length === 0) return this.events;

//     let sorted = this.refresh.sort((a, b) => b.created_at - a.created_at);
//     this.time = sorted[0].created_at; // Set time to the newest event in refresh queue
//     this.refresh = [];
//     this.events = [...sorted, ...this.events];

//     return this.events;
//   }

//   // Load a batch events into the event list
//   mergeMore() {
//     if (this.more.length === 0) return this.events;

//     let delta = this.more.sort((a, b) => b.created_at - a.created_at);
//     delta = delta.splice(0, this.batchSize);

//     if (this.time === 0 && delta.length > 0) this.time = delta[0].created_at;

//     this.more = this.more.slice(delta.length);
//     this.events = [...this.events, ...delta];
//     return this.events;
//   }

//   async load() {
//     let events = await this.network.load(50);

//     //let notes = await noteManager.load();
//     //let notes = noteManager.notes.values();

//     for (let event of events) {
//       this.add(event);
//     }

//     return this.mergeMore();
//   }
// }


const useSubscribe = (ops: FeedOptions) => {

  const [events, setEvents] = useState<Event[]>([]);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [hasRefresh, setHasRefresh] = useState<boolean>(false);

  const feedProvider = useRef<FeedProvider>(new FeedProvider(new EventCursor(ops, 100), 10));
  const intervalRef = useRef<any>(undefined);
  const loading = useRef<boolean>(false);

  // const loadNextPage = useCallback(() => {
  //   if(loading.current == true) return;
  //   loading.current = true;
  //   feedProvider.current.nextPage().then((list) => {
  //     setEvents(list);
  //     setHasMore(feedProvider.current.hasMore());
  //     loading.current = false;
  //   }); }, []);

  // Loading events from memory
  useEffect(() => {
    loading.current = true;
    feedProvider.current.load().then((list) => {

      console.log('useSubscribe:load', list.length, list.map(e => e.id + '- Kind: ' + e.kind));

      setEvents(list);
      setHasMore(feedProvider.current.hasMore());
      loading.current = false;
    });

    // Check regularly for new events
    intervalRef.current = setInterval(() => {
      setHasRefresh(feedProvider.current.hasNew());
    }, 3000);

    //eventState.current = new EventState(filter, filterFn);

    // const updateThrottle = throttle(
    //   () => {
    //     setHasRefresh(eventState.current.refresh.length > 0);
    //     setHasMore(eventState.current.more.length > 0);
    //   },
    //   1000,
    //   { leading: false, trailing: true },
    // );

    // const subscribe = (event: Event) => {
    //   eventState.current.add(event);

    //   // Load more events if the event list is too short
    //   if (eventState.current.events.length < 10) setEvents(eventState.current.mergeMore());

    //   updateThrottle();
    // };

    // /// Load all events from memory
    // eventState.current.load().then((list) => {
    //   setEvents(list);
    //   updateThrottle();
    // });

    // Subscribe to new events, add them to the refresh/more queue
    //noteManager.onEvent.add(subscribe);

    return () => {
      //noteManager.onEvent.delete(subscribe);
      feedProvider.current.unmount();
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [ops]);

  const loadMore = useCallback(() => {
    if(loading.current == true) return;
    loading.current = true;

    feedProvider.current.nextPage().then((list) => {
      setEvents(list);
      setHasMore(feedProvider.current.hasMore());
      loading.current = false;
    });

    // setHasMore(eventState.current.more.length > 0);
  }, []);

  // Load events in front of the event list
  const refresh = useCallback(() => {
    if(!feedProvider.current.hasNew()) return;
  
    setEvents(feedProvider.current.mergeNew());
    setHasRefresh(false);
    setHasMore(feedProvider.current.hasMore());
  }, []);

  const loadAll = useCallback(() => {
    // if(loadMoreCleanupRef.current) return; // Already subscribed
    // loadMoreCleanupRef.current = PubSub.subscribe(filter, updateEvents, false, false);
  }, []);

  return { events, hasMore, hasRefresh, loadMore, refresh, loadAll };
};

export default useSubscribe;
