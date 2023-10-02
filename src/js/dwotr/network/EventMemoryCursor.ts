import { Event } from 'nostr-tools';
import { FeedOptions, OnClose, OnDone } from './WOTPubSub';
import { Events, ICursor } from './types';
import noteManager from '../NoteManager';

class EventMemoryCursor implements ICursor {
  limit = 50;

  delta: number = 0; // Not needed
  since: number = 0; // Not needed

  done: boolean = false;
  feedOptions: FeedOptions;

  buffer: Events = [];

  #valuePointer: IterableIterator<Event>; // Pointer to the current value in the notes map
  #authors = new Set<string>();
  #kinds = new Set<number>();
  #ids = new Set<string>();

  constructor(opt: FeedOptions, size = 50) {
    this.limit = size;
    this.feedOptions = opt;
    this.#valuePointer = noteManager.notes.values(); // Get an iterator to the notes map
    this.#authors = new Set<string>(opt.filter.authors);
    this.#kinds = new Set<number>(opt.filter.kinds);
    this.#ids = new Set<string>(opt.filter.ids);
  }

  async load(): Promise<number> {
    if (this.done) return 0;

    let { since, until } = this.feedOptions.filter;
    until ??= Number.MAX_SAFE_INTEGER;
    since ??= 0;

    const { onEvent, onClose, onDone } = this.feedOptions;

    let found = 0;
    let remaning = this.limit - this.buffer.length;

    while (remaning > 0 && !this.done) {
      let note = this.#valuePointer.next().value as Event;
      if (note === undefined) {
        // If the iterator is done, we're done
        this.#done(onClose, onDone);
        break;
      }

      if (note.created_at > until) continue; // E.g.: since <= note.created_at <= until
      if (this.#authors.size && !this.#authors.has(note.pubkey)) continue; // If the author is not in the filter, skip
      if (this.#kinds.size && !this.#kinds.has(note.kind)) continue; // If the kind is not in the filter, skip
      if (this.#ids.size && !this.#ids.has(note.id)) continue; // If the id is not in the filter, skip
      if (this.feedOptions.filterFn?.(note) === false) continue;

      this.buffer.push(note); // Add the note to the buffer to save the next() value, iterator cannot be rewound
      remaning--;

      if (note.created_at < since) {
        // E.g.: since <= note.created_at <= until
        this.#done(onClose, onDone);
        break;
      }

      found++;
      onEvent?.(note, false, '');
    }

    return Promise.resolve(found);
  }

  take(count: number): Events {
    return this.buffer.splice(0, count);
  }

  count(): number {
    return this.buffer.length;
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

export default EventMemoryCursor;
