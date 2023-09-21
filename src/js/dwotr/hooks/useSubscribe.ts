import { useCallback, useEffect, useRef, useState } from 'react';
import { Event, Filter } from 'nostr-tools';

import EventDB from '@/nostr/EventDB.ts';
import PubSub from '@/nostr/PubSub.ts';
import { ID, UID } from '@/utils/UniqueIds';
import IndexedDB from '@/nostr/IndexedDB';


class EventState {
  index: Set<UID> = new Set();
  refresh: Event[] = [];
  more: Event[] = [];

  batchSize: number = 10;
  time: number = 0;

  // Add event to index
  // Add event to refresh queue if it's newer than time
  // Add event to more queue if it's older than time.
  add(event: Event) {
    this.index.add(ID(event.id));
    if (event.created_at > this.time) {
      this.refresh.push(event);
    } else {
      this.more.push(event);
    }
  }

  // Sort the refresh queue and more queue based on created_at with the newest first
  sort() {
    this.refresh.sort((a, b) => b.created_at - a.created_at);
  }

  clear() {
    this.index.clear();
    this.refresh = [];
    this.more = [];
  }

  // Load all refresh events into the event list
  mergeRefresh(events: Event[]) {
    if (this.refresh.length === 0) return events;

    if (events.length > 0) { // if there exists events, merge them with refresh queue
      let sorted = this.refresh.sort((a, b) => b.created_at - a.created_at);
      this.time = sorted[0].created_at; // Set time to the newest event in refresh queue
      sorted.forEach((event) => this.index.add(ID(event.id)));
      this.refresh = [];
      return [...sorted, ...events];

    } else {  // if there are no input events, then convert to more queue, don't want to return large numbers of events at once
      this.more = this.refresh;
      this.refresh = [];
      return this.mergeMore(events);
    }
  }

  // Load a batch events into the event list
  mergeMore(events: Event[]) {
    if(this.more.length === 0) return events;
    
    let delta = this.more.sort((a, b) => b.created_at - a.created_at);
    delta = delta.splice(0, this.batchSize);

    delta.forEach((event) => this.index.add(ID(event.id)));
    if(this.time === 0 && delta.length > 0) this.time = delta[0].created_at;
    this.more = this.more.slice(delta.length);
    return [...events, ...delta];
  }

  loadFromMemory(filter: Filter, filterFn?: (event: Event) => boolean) {
    let e = EventDB.findArray({ ...filter, limit: undefined });
    if (filterFn) {
      e = e.filter(filterFn);
    }
    e = e.filter((event) => !this.index.has(ID(event.id)));
    e.forEach((event) => this.add(event));

    return e;
  }
}


interface SubscribeOptions {
  filter: Filter;
  filterFn?: (event: Event) => boolean;
  sinceLastOpened?: boolean;
  mergeSubscriptions?: boolean;
  enabled?: boolean;
}


const useSubscribe = (ops: SubscribeOptions) => {
  const {
    filter,
    filterFn,
    enabled = true,
    sinceLastOpened = false,
    mergeSubscriptions = true,
  } = ops;

  const shouldReturnEarly = !enabled || filter.limit === 0;

  const [events, setEvents] = useState<Event[]>([]);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [hasRefresh, setHasRefresh] = useState<boolean>(true);

  const eventState = useRef<EventState>(new EventState());

  //const eventQueue = useRef<Map<UID, Event>>(new Map());
  const intervalRef = useRef<any>(undefined);

  // Subscribe to PubSub if filter is not empty and authors are not subscribed
  useEffect(() => {
    if (shouldReturnEarly) return;

    setEvents([]); // Clear events on new filter
    eventState.current.clear(); // Clear the event state

    IndexedDB.find(filter); // Load events from indexedDB

    // Make sure to load author's events if they are not already subscribed
    //return PubSub.subscribe(filter, () => {}, sinceLastOpened, mergeSubscriptions, 1); // TODO: remove last force parameter (only for testing)
  }, [filter, filterFn, shouldReturnEarly, sinceLastOpened, mergeSubscriptions]);

  // Loading events from memory
  useEffect(() => {
    if (shouldReturnEarly) return;

    const load = () => {
      let e = eventState.current.loadFromMemory(filter, filterFn);
      if (e.length == 0) return;

      setHasRefresh(eventState.current.refresh.length > 0);
      setHasMore(eventState.current.more.length > 0);
    }

    intervalRef.current = setInterval(() => {
      load(); // Check for new events
    }, 1000);

    load(); // Load events on first render

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [filter, filterFn, shouldReturnEarly, setHasMore, setHasRefresh]);

  
  const loadMore = useCallback(() => {
    setEvents(eventState.current.mergeMore(events));
    setHasMore(eventState.current.more.length > 0);
  }, [events]);


  // Load events in front of the event list
  const refresh = useCallback(() => {
    setEvents(eventState.current.mergeRefresh(events));
    setHasRefresh(eventState.current.refresh.length > 0);
    setHasMore(eventState.current.more.length > 0);
  }, [events]);

  const loadAll = useCallback(() => {
    // if(loadMoreCleanupRef.current) return; // Already subscribed
    // loadMoreCleanupRef.current = PubSub.subscribe(filter, updateEvents, false, false);
  }, [events]);


  return { events, hasMore, hasRefresh, loadMore, refresh, loadAll };
};

export default useSubscribe;
