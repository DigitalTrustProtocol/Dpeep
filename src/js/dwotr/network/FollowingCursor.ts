import { Event } from 'nostr-tools';
import { FeedOption } from './WOTPubSub';
import { ID, UID } from '@/utils/UniqueIds';
import NotesCursor from './NotesCursor';
import followManager from '../FollowManager';
import noteManager from '../NoteManager';
import eventManager from '../EventManager';
import { NoteContainer } from '../model/DisplayEvent';


class FollowingCursor extends NotesCursor {

  constructor(opt: FeedOption, seen?: Set<UID>) {
    super(opt, seen);
    this.kinds.add(1);
    this.authors = followManager.getFollows(this.options.user);
  }

  eventHandler(event: Event) {
    let container = eventManager.containers.get(ID(event.id)) as NoteContainer;

    //if (container.event!.created_at < this.until) return false; // E.g.: since <= note.created_at <= until

    if (!this.accept(container)) return; // Skip events that don't match the filterFn, undefined means match

    this.preBuffer.push(event);
  }

  subscribe() {
    noteManager.onEvent.addGenericListener(this.eventHandler.bind(this));
  }

  unsubscribe() {
    noteManager.onEvent.removeGenericListener(this.eventHandler.bind(this));
  }

}

export default FollowingCursor;
