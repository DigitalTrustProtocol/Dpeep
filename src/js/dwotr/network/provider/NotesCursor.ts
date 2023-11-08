import { Event } from 'nostr-tools';
import { NoteContainer, ResolvedContainer } from '@/dwotr/model/ContainerTypes';
import { FeedOption, RepostKind } from '../provider';
import noteManager from '@/dwotr/NoteManager';
import { UID } from '@/utils/UniqueIds';
import eventManager from '@/dwotr/EventManager';
import { BaseCursor } from './BaseCursor';
import embedLoader from '../embed/EmbedLoader';

export class NotesCursor extends BaseCursor<NoteContainer> {
  newItems: NoteContainer[] = [];
  preItems: NoteContainer[] = [];
  notePointer: IterableIterator<Event>; // Pointer to the current value in the notes map
  resolving = false;
  resolveTimer: any = undefined;

  authors = new Set<UID>();
  kinds = new Set<number>();

  constructor(opt: FeedOption) {
    super(opt);
    this.notePointer = noteManager.notes.values(); // Get an iterator to the notes map
    if (opt.includeReposts) this.kinds.add(RepostKind); // Include reposts
  }

  eventHandler(event: Event) {
    let container = eventManager.getContainerByEvent(event) as NoteContainer;

    if (container.event!.created_at < this.until) return; // E.g.: since <= note.created_at <= until

    if (!this.include(container, Number.MAX_SAFE_INTEGER)) return; // Skip events that don't match the filterFn, undefined means match

    this.newItems.push(container);
  }

  #resolve = () => {
    if (this.resolving) return;
    this.resolving = true;

    let resolveList = (this.newItems as ResolvedContainer[]).filter((item) => !item.resolved).slice(0, 100); // Resolve the first 100 items
    let events = resolveList.map((item) => item.event!);

    embedLoader.resolve(events).finally(() => {
    
      resolveList.forEach((item) => item.resolved = true);

      this.newDataCount += resolveList.length;
      this.resolving = false;
    });
  }

  hasNew(): boolean {
    return !!this.newDataCount;
  }


  mount() {
    // Listen to new events
    noteManager.onEvent.addGenericListener(this.eventHandler.bind(this));
    // Resolve new events every second
    this.resolveTimer = setInterval(this.#resolve, 1000);
  }

  unmount() {
    noteManager.onEvent.removeGenericListener(this.eventHandler.bind(this));
    clearInterval(this.resolveTimer);
  }

  preLoad(): NoteContainer[] {
    return [];
  }

  async next(): Promise<NoteContainer | undefined> {
    let container: NoteContainer | undefined = undefined;

    // Watch out for infinite loops
    while(!this.done) {
      container = this.preItems.shift(); // If there are new items, return them first

      if (!container) {

        let { value, done } = this.notePointer.next(); // If the notePointer is done, then we're done
        if(done) {
          this.done = true;
          break;
        }

        container = eventManager.getContainerByEvent(value) as NoteContainer;
        if (!container) continue; // Skip if the container is undefined as the event is not parseable
      }

      if (this.include(container)) break; // If the container is included, then break the loop
    } 

    return container;
  }

  reset() {
    super.reset(); // Reset the base class including until and since
    this.notePointer = noteManager.notes.values(); // Get an new iterator to the notes map
    this.preItems = (this.newItems as ResolvedContainer[]).filter((item) => item.resolved);
    this.newItems = [];
    this.newDataCount = 0;
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
