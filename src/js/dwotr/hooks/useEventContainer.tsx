import { useState, useEffect } from 'preact/hooks';
import { EventContainer } from '../model/DisplayEvent';
import { UID } from '@/utils/UniqueIds';
import eventManager from '../EventManager';

export const useEventContainer = (id: UID) => {
    const [ container, setContainer ] = useState<EventContainer>();
    useEffect(() => {
      const container = eventManager.containers.get(id);
      if(!container) return;
      setContainer(container);
    }, [id]);
  
    return { container, setContainer };
  }
  