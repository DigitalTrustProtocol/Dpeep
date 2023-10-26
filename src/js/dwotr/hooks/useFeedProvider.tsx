import { useCallback, useEffect, useRef, useState } from 'react';

import { FeedOption } from '../network/WOTPubSub';
import { DataProvider } from '../network/provider/DataProvider';
import { NoteContainer } from '../model/ContainerTypes';
import { ProviderStatus } from '../network/provider';

const useFeedProvider = (opt: FeedOption | undefined) => {
  const [containers, setContainers] = useState<NoteContainer[]>([]);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [hasNew, setHasNew] = useState<boolean>(false);
  const [status, setStatus] = useState<ProviderStatus>('idle');


  const dataProvider = useRef<DataProvider>(); // Make sure to get the same provider for the same feedId
  const intervalRef = useRef<any>(undefined);
  const loading = useRef<boolean>(false);

  const mounted = useRef<boolean>(true);

  // Loading events from memory
  useEffect(() => {
    mounted.current = true;
    if (!opt) return; // The options may not be ready yet

    let listener = {
      onStatusChanged: (status: ProviderStatus) => {
        setStatus(status);
      }
    }

    dataProvider.current = DataProvider.getProvider(opt, listener); // Make sure to get the same provider for the same feedId
    dataProvider.current!.mount();    
    dataProvider.current!.preLoad();

    let list = dataProvider.current!.getBuffer();
    setContainers(list);

    if(list.length < dataProvider.current!.pageSize) 
       loadNext(); 

    // Check regularly for new events
    intervalRef.current = setInterval(() => {
      setHasNew(dataProvider.current?.hasNew() || false);
    }, 3000);

    return () => {
      mounted.current = false;
      dataProvider.current?.unmount();
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [opt]);


  const loadNext = useCallback((cb?: (list: NoteContainer[]) => void) => {
    if (!dataProvider.current || !mounted.current) return;
    if (loading.current == true) return;
    loading.current = true; // Prevent multiple loads from happening at once

    dataProvider.current?.nextPage().then((items) => {
      if (!dataProvider.current || !mounted.current) return 0;
      setContainers(dataProvider.current.getBuffer());
      setHasMore(!dataProvider.current.isDone() || true);
      loading.current = false;
      cb?.(items);
    });

  }, []);

  // Load events in front of the event list
  const reset = useCallback((): void => {
    if (!dataProvider.current || !mounted.current) return;
    //if (!dataProvider.current?.hasNew()) return;

    dataProvider.current.reset();
    dataProvider.current.preLoad();
    setHasMore(!dataProvider.current?.isDone() || true);
    setHasNew(dataProvider.current?.hasNew() || false);

    loadNext();

    setContainers(dataProvider.current!.getBuffer());
  }, []);

  return { containers, status, hasMore, hasNew, loadNext, reset };
};

export default useFeedProvider;
