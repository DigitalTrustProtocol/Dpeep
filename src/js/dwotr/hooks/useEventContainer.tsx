import { useState, useEffect } from 'preact/hooks';
import { EventContainer } from '../model/ContainerTypes';
import { UID } from '@/utils/UniqueIds';
import eventManager from '../EventManager';

export const useEventContainer = <T extends EventContainer>(id: UID) => {
    const [ container, setContainer ] = useState<T>(eventManager.getContainer(id) as T);
    useEffect(() => {
      if(container?.id == id) return;
      setContainer(eventManager.getContainer(id) as T);
    }, [id]);
  
    return { container, setContainer };
  }
  