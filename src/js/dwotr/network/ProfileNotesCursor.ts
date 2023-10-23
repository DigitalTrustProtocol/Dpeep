import { Event } from 'nostr-tools';
import { FeedOption } from './WOTPubSub';
import { ID, UID } from '@/utils/UniqueIds';
import NotesCursor from './NotesCursor';
import eventManager from '../EventManager';
import { NoteContainer } from '../model/DisplayEvent';
import noteManager from '../NoteManager';


class ProfileNotesCursor extends NotesCursor {

  constructor(opt: FeedOption, seen?: Set<UID>) {
    super(opt, seen);
    this.kinds.add(1);
    this.authors.add(opt.user!);
  }

  eventHandler(event: Event) {
    let container = eventManager.containers.get(ID(event.id)) as NoteContainer;

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

export default ProfileNotesCursor;
