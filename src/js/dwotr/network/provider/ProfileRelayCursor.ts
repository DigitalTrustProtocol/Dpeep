import { FeedOption } from '../WOTPubSub';
import { NoteContainer } from '@/dwotr/model/ContainerTypes';
import { RelayCursor } from './RelayCursor';
import noteManager from '@/dwotr/NoteManager';
import eventManager from '@/dwotr/EventManager';
import { UID } from '@/utils/UniqueIds';
import { noteKinds } from '@/dwotr/Utils/Nostr';

export class ProfileRelayCursor extends RelayCursor<NoteContainer> {

  authors = new Set<UID>();
  kinds = new Set<number>();

  constructor(opts: FeedOption) {
    super(opts);
    noteKinds.forEach((kind) => this.kinds.add(kind));
    this.authors.add(opts.user!);
  }

  // Load all know notes first, then call the relay server
  preLoad(): NoteContainer[] {
    let result = [] as NoteContainer[];
    let iterator = noteManager.notes.values(); // Get an iterator to the notes map

    for(let note of iterator) {
      let container = eventManager.getContainerByEvent(note) as NoteContainer;
      if(!container) continue;

      if(!this.include(container)) continue;
      result.push(container);
    }

    return result;
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
