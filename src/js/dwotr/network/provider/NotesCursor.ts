import { Event } from 'nostr-tools';
import { NoteContainer } from '@/dwotr/model/ContainerTypes';
import { FeedOption, RepostKind } from '../WOTPubSub';
import noteManager from '@/dwotr/NoteManager';
import { ID, UID } from '@/utils/UniqueIds';
import eventManager from '@/dwotr/EventManager';
import { BaseCursor } from './BaseCursor';

export class NotesCursor extends BaseCursor<NoteContainer> {
  
  notePointer: IterableIterator<Event>; // Pointer to the current value in the notes map

  authors = new Set<UID>();
  kinds = new Set<number>();

  constructor(opt: FeedOption) {
    super(opt);
    this.notePointer = noteManager.notes.values(); // Get an iterator to the notes map
    if(opt.includeReposts) this.kinds.add(RepostKind); // Include reposts
  }


  eventHandler(event: Event) {
    let container = eventManager.getContainerByEvent(event) as NoteContainer;

    if (container.event!.created_at < this.until) return; // E.g.: since <= note.created_at <= until

    if (!this.include(container, Number.MAX_SAFE_INTEGER)) return; // Skip events that don't match the filterFn, undefined means match

    this.newDataCount++;
  }

  mount() {
    noteManager.onEvent.addGenericListener(this.eventHandler.bind(this));
  }

  unmount() {
    noteManager.onEvent.removeGenericListener(this.eventHandler.bind(this));
  }

  async next(): Promise<NoteContainer | null> {

    if (this.done) return null;
    
    while(true) {
      let note = this.notePointer.next().value as Event;
      if (!note) {
        // If the iterator is done, we're done
        this.done = true;
        break;
      }
      let container = eventManager.getContainerByEvent(note) as NoteContainer;
      if(!container) continue;

      if(!this.include(container)) continue;
      return container;
    }
    return null;
  }

  reset() {
    super.reset();
    this.notePointer = noteManager.notes.values(); // Get an iterator to the notes map
  }

  include(container: NoteContainer, until = this.until): boolean {
    if (!container) return false;
    let note = container.event!;

    if (note.created_at > until) return false; // E.g.: since <= note.created_at <= until
    if (note.created_at < this.since) return false; // E.g.: since <= note.created_at <= until
    if (!this.authors.has(container?.authorId!)) return false; // If user is not following the author, skip
    if (!this.kinds.has(note.kind)) return false; // Only show reposts and notes
    if (!this.options?.includeReplies && container.subtype == 2) return false; // Skip replies
    if (!this.options?.includeReposts && container.subtype == 3) return false; // Skip reposts

    if (this.options.postFilter && !this.options.postFilter(container)) return false; // Skip events that don't match the filterFn, undefined means match

    return true;
    // Implement your filtering logic here
  }
}
