import { memo, useEffect, useMemo, useRef, useState } from 'react';
import classNames from 'classnames';

import EventDB from '@/nostr/EventDB';
import { isRepost } from '@/nostr/utils.ts';
import { EventID } from '@/utils/Hex/Hex.ts';

import { Event } from 'nostr-tools';
import { translate as t } from '../../translations/Translation.mjs';
import Icons from '../../utils/Icons';

import Note from './note/Note';
import EventDropdown from './EventDropdown';
import Follow from './Follow';
import Like from './Like';
import Repost from './Repost';
import Zap from './Zap';
import blockManager from '@/dwotr/BlockManager';
import { ID } from '@/utils/UniqueIds';
import wotPubSub from '@/dwotr/network/WOTPubSub';
import noteManager from '@/dwotr/NoteManager';

declare global {
  interface Window {
    prerenderReady: boolean;
  }
}

const COMPONENTS_BY_EVENT_KIND = {
  1: Note,
  3: Follow,
  6: Repost,
  7: Like,
  9735: Zap,
};

export interface EventComponentProps {
  id: string;
  standalone?: boolean;
  asInlineQuote?: boolean;
  showReplies?: number;
  showRepliedMsg?: boolean;
  isReply?: boolean;
  isQuote?: boolean;
  isQuoting?: boolean;
  feedOpenedAt?: number;
  fullWidth?: boolean;
  event?: Event;
}

const EventComponent = (props: EventComponentProps) => {
  const hex = useMemo(() => new EventID(props.id).hex, [props.id]);
  const [event, setEvent] = useState(props.event);
  const [retrieving, setRetrieving] = useState<boolean>(false);
  const retrievingTimeout = useRef<any>();
  const unmounted = useRef<boolean>(false);


  useEffect(() => {

    // Moved inside useEffect to avoid recreating the function on every render
    // const handleEvent = (e: any) => {
    //   if (e) {
    //     clearTimeout(retrievingTimeout.current);
    //     if (!unmounted.current) {
    //       setRetrieving(false);
    //       setEvent(e);
    //     }
    //   }
    // };
  
    //console.log('EventComponent init'); // this gets called more than displayCount - unnecessary?
    if (props.standalone && (event || retrievingTimeout.current)) {
      window.prerenderReady = true;
    }
    if (!event) {

      //let e = noteManager.notes.get(ID(hex));
      let e = EventDB.get(hex);
      setEvent(e);

      //retrievingTimeout.current = setTimeout(() => setRetrieving(true), 1000);
      //Events.getEventById(hex, true, handleEvent);
      //wotPubSub.getEvent(ID(hex), handleEvent); // Should be ok with network load 
      if(!e) {
        console.log('EventComponent event is not provided', hex, props);
      }
    }

    return () => {
      unmounted.current = true;
    };
  }, [props.id]);

  const loadingClass = classNames('m-2 md:mx-4 flex items-center', {
    'opacity-100': retrieving,
    'opacity-0': !retrieving,
  });

  if(!event) return null;
  // if (!event) {
  //   return (
  //     <div key={props.id} className={loadingClass}>
  //       <div className="text">{t('looking_up_message')}</div>
  //       {props.asInlineQuote ? null : <EventDropdown id={props.id || ''} event={event} />}
  //     </div>
  //   );
  // }

  if (blockManager.isBlocked(ID(event.pubkey))) {
    if (props.standalone || props.isQuote) {
      return (
        <div className="m-2 md:mx-4 flex items-center">
          <i className="mr-2">{Icons.newFollower}</i>
          <span> Message from a blocked user</span>
        </div>
      );
    }
    return null;
  }

  const Component: any = isRepost(event) ? Repost : COMPONENTS_BY_EVENT_KIND[event.kind];

  if (!Component) {
    console.error('unknown event kind', event);
    return null;
  }

  return (
    <Component
      key={props.id}
      event={event}
      fullWidth={props.fullWidth}
      fadeIn={!props.feedOpenedAt || props.feedOpenedAt < event.created_at}
      {...props}
    />
  );
};

export default memo(EventComponent);
