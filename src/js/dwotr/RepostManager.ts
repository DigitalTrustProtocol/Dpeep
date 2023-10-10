import { Event } from 'nostr-tools';
import storage from './Storage';
import { ID, UID } from '@/utils/UniqueIds';
import blockManager from './BlockManager';
import { getRepostedEventId } from '@/nostr/utils';
import eventManager from './EventManager';
import EventCallbacks from './model/EventCallbacks';
import eventDeletionManager from './EventDeletionManager';
import { BulkStorage } from './network/BulkStorage';
import { RepostKind } from './network/WOTPubSub';
import noteManager from './NoteManager';


// Decorate the event with the repost_of meta data
// The intention is to store the repost_of in the IndexedDB, so its faster, and more intuitive. (overkill?)
export type RepostEvent<K extends number = number> = Event<K> & {
  meta: {
    repost_of?: string; // This gets stored in IndexedDB
  }
};

class RepostManager {

  logging = false;

  // Index of all reposts of an specific events,
  reposts: Map<UID, Set<Event>> = new Map();

  onEvent = new EventCallbacks(); // Callbacks to call when the follower change

  private metrics = {
    TableCount: 0,
    Loaded: 0,
    Saved: 0,
    Deleted: 0,
    RelayEvents: 0,
  };

  table = new BulkStorage(storage.reposts);

  isRepostEvent(event: Event) : boolean {
    return event.kind == RepostKind;
  }


  handle(event: Event) {
    
    this.metrics.RelayEvents++;

    this.#addEvent(event);

    this.table.save(event.id, event); // Save all for now, asynchronusly

    this.onEvent.dispatch(ID(event.id), event);
  }

  // Optionally save and load view order on nodes, so that we can display them in the same order, even if they are received out of order
  // This could be for like the last viewed 100 to 1000 events, as the time sort should be good enough for the rest.

  async load() {
    let events = await this.table.toArray();
    this.metrics.Loaded = events.length;

    let deltaDelete: Array<string> = [];

    for (let note of events) {
      eventManager.addSeen(ID(note.id));
      eventManager.eventIndex.set(ID(note.id), note);

      if (this.#canAdd(note)) {
        this.#addEvent(note);
      } else {
        deltaDelete.push(note.id);
      }
    }

    this.metrics.Deleted += deltaDelete.length;

    // Remove notes from profiles that are not relevant
    // if (deltaDelete.length > 0) 
    //   this.table.delete(deltaDelete); // Delete asynchronously
  }


  // ---- Private methods ----


  #canAdd(note: Event): boolean {
    let eventId = ID(note.id);
    let authorId = ID(note.pubkey);

    if (eventDeletionManager.deleted.has(eventId)) return false;

    if (blockManager.isBlocked(authorId)) return false;

    return true;
  };


  #addEvent(event: Event) : void {

    let eventId = ID(event.id);
    noteManager.notes.set(eventId, event); // Add to the noteManager, so its in the feed
    this.#addRepost(event as RepostEvent); // Add to the reposts index
  }

  #addRepost(event: RepostEvent) {
    if(!event?.meta?.repost_of) {
      event.meta = {
        repost_of: getRepostedEventId(event) // Decorate the event
      }
    }
    const repostkey = event.meta.repost_of ; // Get the repost key from the event, or from the content
    if (!repostkey) return;
    let repostId = ID(repostkey);
    let repostSet =
      this.reposts.get(repostId) || this.reposts.set(repostId, new Set()).get(repostId);
    repostSet!.add(event);
  }


  async tableCount() {
    return await storage.notes.count();
  }

  getMetrics() {
    this.tableCount().then((count) => {
        this.metrics.TableCount = count;
      });
  
    return this.metrics;
  }
}

const repostManager = new RepostManager();
export default repostManager;
