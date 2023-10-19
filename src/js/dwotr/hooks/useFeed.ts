import { useCallback, useEffect, useRef, useState } from 'react';
import { Event } from 'nostr-tools';

import { FeedOptions } from '../network/WOTPubSub';
import { FeedProvider } from '../network/FeedProvider';
import feedManager from '../FeedManager';

const useFeed = (opt: FeedOptions | undefined) => {
  const [events, setEvents] = useState<Event[]>([]);
  const [hasMore, setHasMore] = useState<boolean>(true);
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
      loadMore(); // Load more events if we don't have enough after memory load

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
      loading.current = false;
      cb?.(list);
    });

  }, []);

  // Load events in front of the event list
  const refresh = useCallback(() => {
    if (!feedProvider.current?.hasNew()) return;

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

export default useFeed;
