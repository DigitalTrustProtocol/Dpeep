import { throttle } from 'lodash';
import { Event } from 'nostr-tools';
import storage from './Storage';
import { ID, STR, UID } from '@/utils/UniqueIds';
import { TextKind } from './network/WOTPubSub';
import blockManager from './BlockManager';
import Key from '@/nostr/Key';
import { getNoteReplyingTo, getRepostedEventId, isRepost } from '@/nostr/utils';
import eventManager from './EventManager';
import SortedMap from '@/utils/SortedMap/SortedMap';
import EventCallbacks from './model/EventCallbacks';
import relaySubscription from './network/RelaySubscription';
import eventDeletionManager from './EventDeletionManager';

const sortCreated_at = (a: [UID, Event], b: [UID, Event]) => {
  if (!a[1]) return 1;
  if (!b[1]) return -1;

  return b[1].created_at - a[1].created_at;
};


class NoteManager {

  logging = false;
  notes: SortedMap<UID, Event> = new SortedMap([], sortCreated_at);

  deletedEvents: Set<UID> = new Set();
  replies: Map<UID, Set<UID>> = new Map(); // Index of all replies of an specific events, the parent event may not have been loaded yet

  // Index of all reposts of an specific events, 
  reposts: Map<UID, Set<UID>> = new Map();
  //replies: Map<UID, Set<Event>> = new Map();


  onEvent = new EventCallbacks(); // Callbacks to call when the follower change

  private metrics = {
    TableCount: 0,
    Loaded: 0,
    Saved: 0,
    Deleted: 0,
    RelayEvents: 0,

  };

  #saveQueue: Map<number, Event> = new Map();
  #saving: boolean = false;
  private saveBulk = throttle(() => {
    if (this.#saving) {
      this.saveBulk(); // try again later
      return;
    }

    this.#saving = true;

    const queue = [...this.#saveQueue.values()];
    this.#saveQueue = new Map<number, Event>();

    this.metrics.Saved += queue.length;

    storage.notes.bulkPut(queue).finally(() => {
      this.#saving = false;
    });
  }, 1000);

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
    this.#saveQueue.set(ID(event.id), event);
    this.saveBulk(); // Save to IndexedDB in bulk by throttling
  }

  // createEvent() {
  //   const event = {
  //     kind: TextKind,
  //     content: '',
  //     created_at: getNostrTime(),
  //     // tags: [
  //     //   ['e', eventId], // Event ID
  //     //   ['p', eventPubKey], // Profile ID
  //     // ],
  //   };

  //   wotPubSub.sign(event);

  //   return event;
  // }

  async onceNote(id: UID) {
    if (this.notes.has(id)) return;

    let eventId = STR(id) as string;

    let events = await relaySubscription.getEventByIds([eventId], [TextKind]);

    return events?.[0];
  }
  // requestNote(id: UID) {
  //   if (this.notes.has(id)) return;

  //   wotPubSub.getEvent(id, undefined, 1000);
  // }


  // ---- Private methods ----

  // #getEventRecord(event: Event) {
  //   const { uId, authorId, ...safeProperties } = event;
  //   return safeProperties;
  // }

  #canAdd(note: Event): boolean {
    let eventId = ID(note.id);
    let authorId = ID(note.pubkey);

    if (eventDeletionManager.deleted.has(eventId)) return false;

    if (blockManager.isBlocked(authorId)) return false;

    return true;
  };


  #addEvent(event: Event) {

    let eventId = ID(event.id);

    eventManager.eventIndex.set(eventId, event);
    this.notes.set(eventId, event);

    // TODO: Not sure that this is the correct implementation of Nip
    const eventIsRepost = isRepost(event);
    if (eventIsRepost) {
      this.#addRepost(event);
      return;
    }

    // TODO: Not sure that this is the correct implementation of Nip
    const replyingTo = getNoteReplyingTo(event);
    if (replyingTo) {
      const repliedMsgs = event.tags
        .filter((tag) => tag[0] === 'e')
        .map((tag) => tag[1])
        .slice(0, 2);
      for (const parent of repliedMsgs) {
        this.#addReply(ID(parent), eventId);
      }
    }
  }


  #addRepost(event: Event) {
    const repostkey = getRepostedEventId(event);
    if (!repostkey) return;
    let repostId = ID(repostkey);
    let repostSet = this.reposts.get(repostId) || this.reposts.set(repostId, new Set()).get(repostId);
    repostSet!.add(ID(event.pubkey));
  }

  #addReply(id: UID, parentId: UID) {
    if (!this.replies.has(id)) {
      this.replies.set(id, new Set<UID>());
    }
    this.replies.get(id)?.add(parentId);
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
