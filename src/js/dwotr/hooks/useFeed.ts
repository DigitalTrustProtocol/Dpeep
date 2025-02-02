import { useCallback, useEffect, useRef, useState } from 'react';
import { Event } from 'nostr-tools';

import { FeedOption } from '../network/provider';
import { FeedProvider } from '../network/FeedProvider';
import feedManager from '../FeedManager';

const useFeed = (opt: FeedOption | undefined) => {
  const [events, setEvents] = useState<Event[]>([]);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [isDone, setIsDone] = useState<boolean>(false); 
  const [hasRefresh, setHasRefresh] = useState<boolean>(false);


  const feedProvider = useRef<FeedProvider>(); // Make sure to get the same provider for the same feedId
  const intervalRef = useRef<any>(undefined);
  const loading = useRef<boolean>(false);

  const mounted = useRef<boolean>(true);

  // Loading events from memory
  useEffect(() => {
    mounted.current = true;
    if (!opt) return; // The options may not be ready yet

    feedProvider.current = feedManager.getProvider(opt); // Make sure to get the same provider for the same feedId
      
    let list = feedProvider.current.load();
    setEvents(list);
    setHasMore(feedProvider.current?.hasMore() || false);
    if(list.length < feedProvider.current.pageSize) 
      loadMore(); 

    // Check regularly for new events
    intervalRef.current = setInterval(() => {
      setHasRefresh(feedProvider.current?.hasNew() || false);
    }, 3000);

    return () => {
      mounted.current = false;
      feedProvider.current?.unmount();
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [opt]);

  const loadMore = useCallback((cb?: (list: Event[]) => void) => {
    if(!feedProvider.current) return
    if (loading.current == true) return;
    loading.current = true; // Prevent multiple loads from happening at once

    feedProvider.current?.nextPage().then((list) => {
      if (!mounted.current) return;
      setEvents(list);
      setHasMore(feedProvider.current?.hasMore() || false);
      setIsDone(feedProvider.current?.isDone || false);
      loading.current = false;
      cb?.(list);
    });

  }, []);

  // Load events in front of the event list
  const refresh = useCallback(() => {
    if (!feedProvider.current?.hasNew()) return 0;

    let list = feedProvider.current.load();
    setEvents(list);
    setHasRefresh(false);
    setHasMore(feedProvider.current.hasMore());
    return list.length;
  }, []);

  const loadAll = useCallback(() => {
    // if(loadMoreCleanupRef.current) return; // Already subscribed
    // loadMoreCleanupRef.current = PubSub.subscribe(filter, updateEvents, false, false);
  }, []);

  return { events, hasMore, hasRefresh, isLoading: loading.current, isDone, loadMore, refresh, loadAll, };
};

export default useFeed;
