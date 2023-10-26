import { Event } from 'nostr-tools';
import storage from './Storage';
import { ID, STR, UID } from '@/utils/UniqueIds';
import blockManager from './BlockManager';
import { getNoteReplyingTo } from '@/nostr/utils';
import eventManager from './EventManager';
import EventCallbacks from './model/EventCallbacks';
import eventDeletionManager from './EventDeletionManager';
import Key from '@/nostr/Key';
import followManager from './FollowManager';
import { BulkStorage } from './network/BulkStorage';
import { ReplyContainer } from './model/ContainerTypes';
import noteManager from './NoteManager';


export class ReplyManager {

  logging = false;

  replies: Map<UID, Set<UID>> = new Map(); // Index of all replies of an specific events, the parent event may not have been loaded yet

  updated = new EventCallbacks(); // Callbacks to call when the follower change

  private metrics = {
    TableCount: 0,
    Loaded: 0,
    Saved: 0,
    Deleted: 0,
    RelayEvents: 0,
  };

  table = new BulkStorage(storage.replies);

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

  getReplies(parentId: UID) : Array<ReplyContainer> {
    let preBuffer: Array<ReplyContainer> = [];
    let afterBuffer: Array<ReplyContainer> = [];

    for (const replyId of replyManager.replies.get(parentId) || []) {
      let container = eventManager.containers.get(replyId) as ReplyContainer;
      let event = container?.event;
      if (event) {
        if (event.pubkey == Key.getPubKey()) preBuffer.unshift(container); // Put my replies at the top
        else if (followManager.isAllowed(ID(event.pubkey)))
          preBuffer.push(container); // Put known users replies at the top'ish
        else afterBuffer.push(container);
      }
    }
    return preBuffer.concat(afterBuffer);
  }

  handleContainer(container: ReplyContainer) {
    
    this.metrics.RelayEvents++;

    if(!this.#canAdd(container)) return;

    this.#addEvent(container);

    this.save(container.event!); // Save all for now, asynchronusly

    if(container.rootId) 
      this.updated.dispatch(container.rootId, container);
    if(container.repliedTo && container.repliedTo != container.rootId)
      this.updated.dispatch(container.repliedTo, container);
  }

  // Optionally save and load view order on nodes, so that we can display them in the same order, even if they are received out of order
  // This could be for like the last viewed 100 to 1000 events, as the time sort should be good enough for the rest.

  async load() {
    let events = await this.table.toArray();
    this.metrics.Loaded = events.length;

    let deltaDelete: Array<string> = [];

    for (let note of events) {

      let container = noteManager.parse(note)!;
      eventManager.addSeen(container.id);
      eventManager.eventIndex.set(container.id, note);
      eventManager.containers.set(container.id, container);

      if (this.#canAdd(container)) {
        this.#addEvent(container);
      } else {
        //deltaDelete.push(STR(container.id));
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

  #canAdd(container: ReplyContainer): boolean {

    if (eventDeletionManager.deleted.has(container.id)) return false;

    if(container?.event)
      if (blockManager.isBlocked(ID(container.event?.pubkey))) return false;

    return true;
  };


  #addEvent(container: ReplyContainer) : void {

    noteManager.notes.set(container.id, container?.event!); // Add to the noteManager, so its in the feed
    eventManager.eventIndex.set(container.id, container.event!);
    eventManager.containers.set(container.id, container);

    if(container.rootId) this.#addToReplies(container.rootId, container.id);
    if(container.repliedTo) this.#addToReplies(container.repliedTo, container.id);
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

  parse(event: Event, relayUrl?: string) : ReplyContainer {
    let container = noteManager.parse(event, relayUrl) as ReplyContainer;

    container.involved = new Set<UID>();
    for(let tag of event.tags) {
      if(tag[0] == 'p') container.involved.add(ID(tag[1]));
      
      if(tag[0] == 'e') {
        if(tag[3] == 'root')  container.rootId = ID(tag[1]);
        if(tag[3] == 'reply') container.repliedTo = ID(tag[1]);
        if(tag[3] === '') container.repliedTo = ID(tag[1]);

        container.subtype = 2; // Reply
      }
    }

    if(container.rootId && !container.repliedTo) container.repliedTo = container.rootId;

    return container;
  }

  // ---- Static methods ----

  static isReplyEvent(event: Event) : boolean {
    return !!getNoteReplyingTo(event);
  }


}

const replyManager = new ReplyManager();
export default replyManager;
