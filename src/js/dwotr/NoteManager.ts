import { get, throttle } from 'lodash';
import { Event } from 'nostr-tools';
import storage from './Storage';
import { ID, UID } from '@/utils/UniqueIds';
import wotPubSub, { TextKind } from './network/WOTPubSub';
import { getNostrTime } from './Utils';
import blockManager from './BlockManager';
import Key from '@/nostr/Key';
import { getNoteReplyingTo, getRepostedEventId, isRepost } from '@/nostr/utils';
import eventManager from './EventManager';
import followManager from './FollowManager';
import SortedMap from '@/utils/SortedMap/SortedMap';
import EventDB from '@/nostr/EventDB';
import reactionManager from './ReactionManager';



const sortCreated_at = (a: [UID, Event], b: [UID, Event]) => {
  if (!a[1]) return 1;
  if (!b[1]) return -1;

  return b[1].created_at - a[1].created_at;
};


export type EventCallback = (event: Event) => void;

class NoteManager {

  notes: SortedMap<UID, Event> = new SortedMap([], sortCreated_at);

  deletedEvents: Set<UID> = new Set();
  threadRepliesByMessageId: Map<string, Set<string>> = new Map();
  repostsByMessageId: Map<string, Set<string>> = new Map();


  onEvent: Set<EventCallback> = new Set();

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

  handle(event: Event) {
    let authorId = ID(event.pubkey);
    let myId = ID(Key.getPubKey());
    let isMe = authorId === myId;

    if (isMe) {
      console.log('My own contact event', event);
    }

    this.metrics.RelayEvents++;

    // Ignore events from profiles that are blocked
    if (blockManager.isBlocked(authorId)) return;

    this.#addNote(event);

    //if (followManager.isAllowed(authorId) || reactionManager.) 
    this.save(event); // Save all for now
  }

  // Optionally save and load view order on nodes, so that we can display them in the same order, even if they are received out of order
  // This could be for like the last viewed 100 to 1000 events, as the time sort should be good enough for the rest.

  async load() {
    let notes = await storage.notes.toArray();
    this.metrics.Loaded = notes.length;

    let deltaDelete: Array<string> = [];

    for (let note of notes) {
      eventManager.addSeen(ID(note.id));

      if (this.#canAddNote(note)) {
        this.#addNote(note);
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

  createEvent() {
    let content = 'test';

    const event = {
      kind: TextKind,
      content,
      created_at: getNostrTime(),
      // tags: [
      //   ['e', eventId], // Event ID
      //   ['p', eventPubKey], // Profile ID
      // ],
    };

    wotPubSub.sign(event);

    return event;
  }

  requestNote(id: UID) {
    if (this.notes.has(id)) return;

    wotPubSub.getEvent(id, undefined, 1000);
  }


  // ---- Private methods ----

  #canAddNote = (note: Event): boolean => {
    let eventId = ID(note.id);
    let authorId = ID(note.pubkey);

    if (this.deletedEvents.has(eventId)) return false;

    if (!followManager.isAllowed(authorId)) return false; // Not in network

    if (blockManager.isBlocked(authorId)) return false;

    return true;
  };

  #addNote(event: Event) {
    // TODO
    const eventIsRepost = isRepost(event);
    const replyingTo = !eventIsRepost && getNoteReplyingTo(event);

    if (replyingTo && !eventIsRepost) {
      const repliedMsgs = event.tags
        .filter((tag) => tag[0] === 'e')
        .map((tag) => tag[1])
        .slice(0, 2);
      for (const id of repliedMsgs) {
        // if (
        //   event.created_at > startTime ||
        //   event.pubkey === myPub ||
        //   SocialNetwork.isFollowing(myPub, event.pubkey)
        // ) {
        //   //Events.getEventById(id); // generates lots of subscriptions
        // }
        this.#addTreadReplies(id, event.id);
      }
    }

    if (eventIsRepost) this.#addRepost(event);

    EventDB.insert(event);
    this.#insert(ID(event.id), event);
    this.#dispatch(event);
  }

  #insert(id: UID, event: Event) {
    this.notes.set(id, event);
  }

  #dispatch(event: Event) {
    for (let callback of this.onEvent) {
      callback(event);
    }
  }

  #addRepost(event: Event) {
    const id = getRepostedEventId(event);
    if (!id) return;
    if (!this.repostsByMessageId.has(id)) {
      this.repostsByMessageId.set(id, new Set());
    }
    this.repostsByMessageId.get(id)?.add(event.pubkey);
  }

  #addTreadReplies(id: string, eventId: string) {
    if (!this.threadRepliesByMessageId.has(id)) {
      this.threadRepliesByMessageId.set(id, new Set<string>());
    }
    this.threadRepliesByMessageId.get(id)?.add(eventId);
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
