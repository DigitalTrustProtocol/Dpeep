import { Event } from 'nostr-tools';
import { FeedOption, OnClose, OnDone, RepostKind } from './WOTPubSub';
import { Events, ICursor } from './types';
import noteManager from '../NoteManager';
import { EPOCH } from '../Utils/Nostr';
import { ID, UID } from '@/utils/UniqueIds';
import { getNostrTime } from '../Utils';
import eventManager from '../EventManager';
import { NoteContainer } from '../model/DisplayEvent';

class NotesCursor implements ICursor {
  limit = 50;

  until: number = Number.MAX_SAFE_INTEGER; 
  since: number = 0; // Not needed
  delta: number = 0; // Not needed

  done: boolean = false;

  options: FeedOption;

  buffer: Events = [];


  preBuffer: Events = []; // New events that have not been seen yet

  //#seen: Set<UID> | undefined;
  notePointer: IterableIterator<Event>; // Pointer to the current value in the notes map
  authors = new Set<UID>();
  kinds = new Set<number>();
  //#ids = new Set<string>();

  constructor(opt: FeedOption, seen?: Set<UID>) {
    this.options = opt;
    //this.#seen = seen;
    this.limit = opt.size ||50;
    this.notePointer = noteManager.notes.values(); // Get an iterator to the notes map
    this.until = opt.filter?.until ?? getNostrTime();
    this.since = opt.filter?.since ?? EPOCH;
    if(opt.includeReposts) this.kinds.add(RepostKind); // Include reposts
  }



  subscribe() {
    //noteManager.onEvent.addGenericListener(this.eventHandler);
  }

  unsubscribe() {
    //noteManager.onEvent.removeGenericListener(this.eventHandler);
  }

  reset() {
    this.buffer = [];
    this.preBuffer = [];
    this.until = getNostrTime();
    this.since = this.options.filter.since ?? EPOCH;
    this.notePointer = noteManager.notes.values(); // Get an iterator to the notes map
  }

  preLoad(): Event[] {
    let events = this.preBuffer;
    this.preBuffer = [];
    return events;
  }


  async load(): Promise<number> {
    if (this.done) return 0;
    const { onEvent, onClose, onDone } = this.options;

    let found = 0;
    let remaning = this.limit - this.buffer.length;

    while (remaning > 0 && !this.done) {
      let note = this.notePointer.next().value as Event;
      if (note === undefined) {
        // If the iterator is done, we're done
        this.#done(onClose, onDone);
        break;
      }

      let container = eventManager.containers.get(ID(note.id)) as NoteContainer;

      if(!this.accept(container)) continue; // Skip events that don't match the filterFn, undefined means match

      this.buffer.push(note); // Add the note to the buffer to save the next() value, iterator cannot be rewound
      remaning--;

      if (note.created_at < this.since) {
        // E.g.: since <= note.created_at <= until
        this.#done(onClose, onDone);
        break;
      }

      found++;
      onEvent?.(note, false, '');
    }

    return Promise.resolve(found);
  }

  accept(container: NoteContainer) : boolean {
    if(!container) return false;
    //if(this.#seen?.has(container.id)) return false; // Filter out events that have already been seen
    let note = container.event!;
    //if (note.created_at > this.until) return false; // E.g.: since <= note.created_at <= until
    if (note.created_at < this.since) return false; // E.g.: since <= note.created_at <= until
    if(!this.authors.has(container?.authorId!)) return false; // If user is not following the author, skip
    if(!this.kinds.has(note.kind)) return false; // Only show reposts and notes
    if(!this.options?.includeReplies && container.subtype == 2) return false; // Skip replies
    if(!this.options?.includeReposts && container.subtype == 3) return false; // Skip reposts

    if(this.options.postFilter && !this.options.postFilter(container)) return false; // Skip events that don't match the filterFn, undefined means match

    return true;
  }

  take(count: number): Events {
    return this.buffer.splice(0, count);
  }

  count(): number {
    return this.buffer.length;
  }

  newCount(): number {
    return this.preBuffer.length;
  }

  peek(): Event | undefined {
    return this.buffer[0];
  }

  pop(): Event | undefined {
    return this.buffer.shift();
  }

  #done(onClose?: OnClose, onDone?: OnDone) {
    this.done = true;
    onClose?.(-1);
    onDone?.(-1);
  }
}

export default NotesCursor;
