import { useState, useEffect } from 'preact/hooks';

import Note from "../components/events/Note";
import Repost from "../components/events/Repost";
import { EventContainer, NoteContainer } from "../model/DisplayEvent";
import Reply from '../components/events/Reply';

const COMPONENTS_BY_EVENT_KIND = {
    1: Note,
    //  3: Follow,
    6: Repost,
    //  7: Like,
    ///  9735: Zap,
  };
  
  
export const useComponentKind = (container: EventContainer, components = COMPONENTS_BY_EVENT_KIND) => {
    const [Component, setComponent] = useState<any>(null);
  
    useEffect(() => {
      if (!container?.kind) return;
      
      if (container.kind == 1) {
        let note = container as NoteContainer;
        if (note.subtype == 2) {
          setComponent(Reply);
          return;
        }
        if (note.subtype == 3) {
          setComponent(Repost);
          return;
        }
        setComponent(Note);
        return;
      }
  
      const result: any = components[container.kind];
      setComponent(result);
    }, [container]);
  
    return Component;
  };
  