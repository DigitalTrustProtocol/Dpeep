import { useCallback, useEffect, useRef, useState } from 'react';
import { Event } from 'nostr-tools';

import { FeedOptions } from '../network/WOTPubSub';
import { FeedProvider } from '../network/FeedProvider';
import feedManager from '../FeedManager';


const useSubscribe = (ops: FeedOptions) => {
  const [events, setEvents] = useState<Event[]>([]);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [hasRefresh, setHasRefresh] = useState<boolean>(false);

  const feedProvider = useRef<FeedProvider>(feedManager.getProvider(ops)); // Make sure to get the same provider for the same feedId
  const intervalRef = useRef<any>(undefined);
  const loading = useRef<boolean>(false);

  // Loading events from memory
  useEffect(() => {
    loading.current = true;
    feedProvider.current.load().then((list) => {

      //console.log('useSubscribe:load', list.length, list.map(e => e.id + '- Kind: ' + e.kind));

      setEvents(list);
      setHasMore(feedProvider.current.hasMore());
      loading.current = false;
    });

    // Check regularly for new events
    intervalRef.current = setInterval(() => {
      setHasRefresh(feedProvider.current.hasNew());
    }, 3000);

    return () => {
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
