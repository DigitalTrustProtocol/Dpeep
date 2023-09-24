import { useCallback, useEffect, useRef, useState } from 'react';
import { Event, Filter } from 'nostr-tools';

import noteManager from '../NoteManager';
import { throttle } from 'lodash';
import { UID } from '@/utils/UniqueIds';



class EventFilter {
  ids: Set<string> = new Set();
  authors: Set<string> = new Set();
  kinds: Set<number> = new Set();
  filterFn?: (event: Event) => boolean;

  constructor(_filter?: Filter, _filterFn?: (event: Event) => boolean) {
    this.ids = new Set( _filter?.ids);
    this.authors = new Set(_filter?.authors);
    this.kinds = new Set(_filter?.kinds);
    this.filterFn = _filterFn;
  }
}

class EventState {
  events: Event[] = [];
  refresh: Event[] = [];
  more: Event[] = [];

  batchSize: number = 10;
  time: number = 0;
  filter: EventFilter;
  
  constructor(_filter: Filter, _filterFn?: (event: Event) => boolean) {
    this.filter = new EventFilter(_filter, _filterFn);
  }


  add(event: Event) {
    if(!this.inScope(event)) return;

    if(this.time == 0 || event.created_at <= this.time) {
      this.more.push(event);
    } else {
      this.refresh.push(event);
    }
  }

  inScope(event: Event) {
    if(this.filter.ids.size > 0 && !this.filter.ids.has(event.id)) return false;
    if(this.filter.authors.size > 0 && !this.filter.authors.has(event.pubkey)) return false;
    if(this.filter.kinds.size > 0 && !this.filter.kinds.has(event.kind)) return false;
    if(this.filter.filterFn && !this.filter.filterFn(event)) return false;

    return true;
  }

  clear() {
    this.events = [];
    this.refresh = [];
    this.more = [];
    this.time = 0;
  }
  

  // Load all refresh events into the event list
  mergeRefresh() {
    if (this.refresh.length === 0) return this.events;

      let sorted = this.refresh.sort((a, b) => b.created_at - a.created_at);
      this.time = sorted[0].created_at; // Set time to the newest event in refresh queue
      this.refresh = [];
      this.events = [...sorted, ...this.events];
      
      return this.events;
  }

  // Load a batch events into the event list
  mergeMore() {
    if(this.more.length === 0) return this.events;
    
    let delta = this.more.sort((a, b) => b.created_at - a.created_at);
    delta = delta.splice(0, this.batchSize);

    if(this.time === 0 && delta.length > 0) this.time = delta[0].created_at;

    this.more = this.more.slice(delta.length);
    this.events = [...this.events, ...delta];
    return this.events;
  }

  load() {
    let notes = noteManager.notes.values();

    for (let event of notes) {
      this.add(event);
    }

    return this.mergeMore();
  }
}


interface SubscribeOptions {
  filter: Filter;
  filterFn?: (event: Event) => boolean;
  sinceLastOpened?: boolean;
  mergeSubscriptions?: boolean;
}


const useSubscribe = (ops: SubscribeOptions) => {
  const {
    filter,
    filterFn,
    sinceLastOpened = false,
    mergeSubscriptions = true,
  } = ops;

  const [events, setEvents] = useState<Event[]>([]);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [hasRefresh, setHasRefresh] = useState<boolean>(true);

  const eventState = useRef<EventState>(new EventState(filter, filterFn));
  const intervalRef = useRef<any>(undefined);

  // Loading events from memory
  useEffect(() => {
    eventState.current = new EventState(filter, filterFn);

    const updateThrottle = throttle(() => {
      setHasRefresh(eventState.current.refresh.length > 0);
      setHasMore(eventState.current.more.length > 0);
    }, 1000, { leading: false, trailing: true });

    const subscribe = (event: Event) => {

      eventState.current.add(event);

      // Load more events if the event list is too short
      if(eventState.current.events.length < 10) 
        setEvents(eventState.current.mergeMore());

      updateThrottle();
    }

    /// Load all events from memory    
    let list = eventState.current.load();
    setEvents(list); 

    // Subscribe to new events, add them to the refresh/more queue
    noteManager.onEvent.add(subscribe);

    return () => {
      noteManager.onEvent.delete(subscribe);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [filter, filterFn]);

  
  const loadMore = useCallback(() => {
    setEvents(eventState.current.mergeMore());
    setHasMore(eventState.current.more.length > 0);
  }, []);


  // Load events in front of the event list
  const refresh = useCallback(() => {
    setEvents(eventState.current.mergeRefresh());
    setHasRefresh(eventState.current.refresh.length > 0);
    setHasMore(eventState.current.more.length > 0);
  }, []);

  const loadAll = useCallback(() => {
    // if(loadMoreCleanupRef.current) return; // Already subscribed
    // loadMoreCleanupRef.current = PubSub.subscribe(filter, updateEvents, false, false);
  }, []);


  return { events, hasMore, hasRefresh, loadMore, refresh, loadAll };
};

export default useSubscribe;
