import { Event } from 'nostr-tools';
import storage from './Storage';
import { ID, STR, UID } from '@/utils/UniqueIds';
import { TextKind } from './network/WOTPubSub';
import blockManager from './BlockManager';
import Key from '@/nostr/Key';
import eventManager from './EventManager';
import SortedMap from '@/utils/SortedMap/SortedMap';
import EventCallbacks from './model/EventCallbacks';
import relaySubscription from './network/RelaySubscription';
import eventDeletionManager from './EventDeletionManager';
import { BulkStorage } from './network/BulkStorage';

const sortCreated_at = (a: [UID, Event], b: [UID, Event]) => {
  if (!a[1]) return 1;
  if (!b[1]) return -1;

  return b[1].created_at - a[1].created_at;
};

class NoteManager {
  logging = false;
  notes: SortedMap<UID, Event> = new SortedMap([], sortCreated_at);

  deletedEvents: Set<UID> = new Set();

  onEvent = new EventCallbacks(); // Callbacks to call when the follower change

  table = new BulkStorage(storage.notes);

  private metrics = {
    TableCount: 0,
    Loaded: 0,
    Saved: 0,
    Deleted: 0,
    RelayEvents: 0,
  };

  hasNode(id: UID) {
    return this.notes.has(id);
  }

  getNode(id: UID) {
    return this.notes.get(id);
  }

  handle(event: Event) {
    let authorId = ID(event.pubkey);

    let myId = ID(Key.getPubKey());
    let isMe = authorId === myId;

    if (isMe && this.logging) {
      console.log('My own contact event', event);
    }

    this.metrics.RelayEvents++;

    this.#addEvent(event);

    //if (followManager.isAllowed(authorId) || reactionManager.)
    this.save(event); // Save all for now

    this.onEvent.dispatch(authorId, event);
  }

  // Optionally save and load view order on nodes, so that we can display them in the same order, even if they are received out of order
  // This could be for like the last viewed 100 to 1000 events, as the time sort should be good enough for the rest.

  async load() {
    let notes = await storage.notes.toArray();
    this.metrics.Loaded = notes.length;

    let deltaDelete: Array<string> = [];

    for (let note of notes) {
      eventManager.addSeen(ID(note.id));

      if (this.#canAdd(note)) {
        this.#addEvent(note);
      } else {
        deltaDelete.push(note.id);
      }
    }

    this.metrics.Deleted += deltaDelete.length;

    // Remove notes from profiles that are not relevant
    //if (deltaDelete.length > 0) await storage.notes.bulkDelete(deltaDelete);
  }

  save(event: Event) {
    this.table.save(ID(event.id), event);
  }

  async onceNote(id: UID) {
    if (this.notes.has(id)) return;

    let eventId = STR(id) as string;

    let events = await relaySubscription.getEventByIds([eventId], [TextKind]);

    return events?.[0];
  }

  // ---- Private methods ----

  #canAdd(note: Event): boolean {
    let eventId = ID(note.id);
    let authorId = ID(note.pubkey);

    if (eventDeletionManager.deleted.has(eventId)) return false;

    if (blockManager.isBlocked(authorId)) return false;

    return true;
  }

  #addEvent(event: Event) {
    let eventId = ID(event.id);

    eventManager.eventIndex.set(eventId, event);
    this.notes.set(eventId, event);
    
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

const noteManager = new NoteManager();
export default noteManager;
