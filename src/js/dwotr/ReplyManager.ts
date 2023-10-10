import { throttle } from 'lodash';
import { Event } from 'nostr-tools';
import storage from './Storage';
import { ID, UID } from '@/utils/UniqueIds';
import blockManager from './BlockManager';
import { getNoteReplyingTo } from '@/nostr/utils';
import eventManager from './EventManager';
import EventCallbacks from './model/EventCallbacks';
import eventDeletionManager from './EventDeletionManager';
import Key from '@/nostr/Key';
import followManager from './FollowManager';
import { BulkStorage } from './network/BulkStorage';
import noteManager from './NoteManager';



class ReplyManager {

  logging = false;

  replies: Map<UID, Set<UID>> = new Map(); // Index of all replies of an specific events, the parent event may not have been loaded yet

  onEvent = new EventCallbacks(); // Callbacks to call when the follower change

  private metrics = {
    TableCount: 0,
    Loaded: 0,
    Saved: 0,
    Deleted: 0,
    RelayEvents: 0,
  };

  table = new BulkStorage(storage.replies);

  isReplyEvent(event: Event) : boolean {
    return !!getNoteReplyingTo(event);
  }

  getEventReplies(parentId: UID) : Array<Event> {
    let preBuffer: Array<Event> = [];
    let afterBuffer: Array<Event> = [];

    for (const replyId of replyManager.replies.get(parentId) || []) {
      let event = eventManager.eventIndex.get(replyId);
      if (event) {
        if (event.pubkey == Key.getPubKey()) preBuffer.unshift(event); // Put my replies at the top
        else if (followManager.isAllowed(ID(event.pubkey)))
          preBuffer.push(event); // Put known users replies at the top'ish
        else afterBuffer.push(event);
      }
    }
    return preBuffer.concat(afterBuffer);
  }

  handle(event: Event) {
    
    this.metrics.RelayEvents++;

    let repliesTo = this.#addEvent(event);
    if(repliesTo.length == 0) return;

    this.save(event); // Save all for now, asynchronusly

    for(let parentId of repliesTo) {
      this.onEvent.dispatch(parentId, event);
    }
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

  save(event: Event) {
    this.table.save(ID(event.id), event);
  }

  #canAdd(note: Event): boolean {
    let eventId = ID(note.id);
    let authorId = ID(note.pubkey);

    if (eventDeletionManager.deleted.has(eventId)) return false;

    if (blockManager.isBlocked(authorId)) return false;

    return true;
  };


  #addEvent(event: Event) : Array<UID> {

    let eventId = ID(event.id);

    noteManager.notes.set(eventId, event); // Add to the noteManager, so its in the feed

    // TODO: Not sure that this is the correct implementation of Nip
    let replies = this.getRepliesTo(event);

    for (const parentId of replies) {
      this.#addToReplies(parentId, eventId);
    }
    return replies;
  }

  getRepliesTo(event: Event) : Array<UID> {
    const replyingTo = getNoteReplyingTo(event);
    if (replyingTo) {
      const repliedMsgs = event.tags
        .filter((tag) => tag[0] === 'e')
        .map((tag) => tag[1])
        .slice(0, 2);  
      return repliedMsgs.map(ID);
    }
    return [];
  }

  #addToReplies(parentId: UID, replyId: UID) {
    if (!this.replies.has(parentId)) {
      this.replies.set(parentId, new Set<UID>());
    }
    this.replies.get(parentId)?.add(replyId);
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

const replyManager = new ReplyManager();
export default replyManager;
