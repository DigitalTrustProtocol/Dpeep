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
import { RepostContainer } from './model/DisplayEvent';


// Decorate the event with the repost_of meta data
// The intention is to store the repost_of in the IndexedDB, so its faster, and more intuitive. (overkill?)
// export type RepostEvent<K extends number = number> = Event<K> & {
//   meta: {
//     repost_of?: string; // This gets stored in IndexedDB
//   }
// };

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

    let container = this.parse(event) as RepostContainer;

    this.handleContainer(container);

  }

  handleContainer(container: RepostContainer) {
    if(!this.#canAdd(container)) return;

    this.#addEvent(container);

    this.save(container.event!); // Save all for now, asynchronusly

    this.onEvent.dispatch(container.id, container.event!);

  }

  // Optionally save and load view order on nodes, so that we can display them in the same order, even if they are received out of order
  // This could be for like the last viewed 100 to 1000 events, as the time sort should be good enough for the rest.

  async load() {
    let events = await this.table.toArray();
    this.metrics.Loaded = events.length;

    //let deltaDelete: Array<string> = [];

    for (let note of events) {
      eventManager.addSeen(ID(note.id));
      eventManager.eventIndex.set(ID(note.id), note);
      
      let container = this.parse(note)!;
      eventManager.containers.set(container.id, container);

      if (this.#canAdd(container)) {
        this.#addEvent(container);
      } else {
        //deltaDelete.push(note.id);
      }
    }

    //this.metrics.Deleted += deltaDelete.length;

    // Remove notes from profiles that are not relevant
    // if (deltaDelete.length > 0) 
    //   this.table.delete(deltaDelete); // Delete asynchronously
  }

  save(event: Event) {
    this.table.save(ID(event.id), event);
  }


  parse(event: Event, url?: string): RepostContainer | undefined {
    if(!this.isRepostEvent(event)) return undefined;

    let repostOfId = getRepostedEventId(event);
    if(!repostOfId) return undefined;

    let container = eventManager.parse(event, url) as RepostContainer;
    container.kind= RepostKind; // Repost
    container.repostOf = ID(repostOfId);

    return container;
  }


  // ---- Private methods ----


  #canAdd(container: RepostContainer): boolean {
    if(!container) return false;
    if(!container?.repostOf) return false; // A repost must have a repostOf
    if (eventDeletionManager.deleted.has(container.id)) return false;
    if (blockManager.isBlocked(ID(container?.event!.pubkey))) return false; // May already been blocked, so redudant code

    return true;
  };


  #addEvent(container: RepostContainer) : void {

    noteManager.notes.set(container.id, container.event!); // Add to the noteManager, so its in the feed
    eventManager.containers.set(container.id, container);
    eventManager.eventIndex.set(container.id, container.event!);


    let repostOf = container.repostOf!;

    let repostSet = this.reposts.get(repostOf) || this.reposts.set(repostOf, new Set()).get(repostOf);

    repostSet!.add(container.event!);
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

  static isRepost(event: Event) {
    if (event.kind === 6) {
      return true;
    }
    const mentionIndex = event.tags?.findIndex((tag) => tag[0] === 'e' && tag[3] === 'mention');
    if (event.kind === 1 && event.content === `#[${mentionIndex}]`) {
      return true;
    }
    return false;
  }

}

const repostManager = new RepostManager();
export default repostManager;
