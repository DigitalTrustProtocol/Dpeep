import { Event } from 'nostr-tools';
import storage from './Storage';
import { ID, STR, UID } from '@/utils/UniqueIds';
import { TextKind, highlightKind } from './network/WOTPubSub';
import blockManager from './BlockManager';
import eventManager, { eventDWoTR as EventDWoTR } from './EventManager';
import SortedMap from '@/utils/SortedMap/SortedMap';
import EventCallbacks from './model/EventCallbacks';
import relaySubscription from './network/RelaySubscription';
import eventDeletionManager from './EventDeletionManager';
import { BulkStorage } from './network/BulkStorage';
import {
  HighlightContainer,
  NoteContainer,
  NoteSubtype,
  ReplyContainer,
  RepostContainer,
} from './model/ContainerTypes';
import replyManager from './ReplyManager';
import repostManager from './RepostManager';
import { noteKinds } from './Utils/Nostr';

const sortCreated_at = (a: [UID, Event], b: [UID, Event]) => {
  if (!a[1]) return 1;
  if (!b[1]) return -1;

  return b[1].created_at - a[1].created_at;
};

export class NoteManager {
  logging = false;
  notes: SortedMap<UID, Event> = new SortedMap([], sortCreated_at);

  deletedEvents: Set<UID> = new Set();

  onEvent = new EventCallbacks(); // Callbacks to call new notes

  table = new BulkStorage(storage.notes);

  supportedKinds: Set<number> = new Set(noteKinds);

  private metrics = {
    TableCount: 0,
    Loaded: 0,
    Saved: 0,
    Deleted: 0,
    RelayEvents: 0,
  };

  constructor() {
  }

  registerHandlers() {
    noteKinds.forEach((kind) => { eventManager.eventHandlers.set(kind, this.handle.bind(this)) });
    noteKinds.forEach((kind) => { eventManager.containerParsers.set(kind, this.parse.bind(this)) });
  }

  hasNode(id: UID) {
    return this.notes.has(id);
  }

  getNode(id: UID) {
    return this.notes.get(id);
  }


  handle(event: Event, relayUrl?: string): boolean {
    let container = this.parse(event, relayUrl);
    if (!container) return false;

    if (container.subtype == 2) {
      replyManager.handleContainer(container as ReplyContainer);
      return true;
    }

    if (container.subtype == 3) {
      repostManager.handleContainer(container as RepostContainer);
      return true;
    }

    let authorId = ID(event.pubkey);
    this.metrics.RelayEvents++;

    this.#addEvent(container);

    this.save(event); // Save all for now

    this.onEvent.dispatch(authorId, event);
    return true;
  }

  // Optionally save and load view order on nodes, so that we can display them in the same order, even if they are received out of order
  // This could be for like the last viewed 100 to 1000 events, as the time sort should be good enough for the rest.

  async load() {
    let notes = await storage.notes.toArray() as EventDWoTR[];
    this.metrics.Loaded = notes.length;

    //let deltaDelete: Array<string> = [];
    for (let note of notes) {
      let noteId = ID(note.id);
      eventManager.addSeen(noteId);

      if (this.#canAdd(note)) {
        this.notes.set(noteId, note);
        eventManager.eventIndex.set(noteId, note);

        if(note?.dwotr?.relay) eventManager.increaseRelayEventCount(note["dwotr"].relay);

      } else {
        //deltaDelete.push(container.id);
      }
    }

    //this.metrics.Deleted += deltaDelete.length;

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

  parse(event: Event, relayUrl?: string): NoteContainer | undefined {
    let container = eventManager.parse(event, relayUrl) as NoteContainer;
    if (!container) return;

    if (container.kind == highlightKind) return this.parseHighlight(container, relayUrl);

    container.subtype = NoteSubtype.Note; // Note subtype = 1
    //container.content = event.content;  Is the string copied or is it a reference? String is immutable, so it should be copied, but internaly it could be a reference

    let involved = new Map<UID, string>(); // Involved: UserId, relayUrl
    let reply = container as ReplyContainer;
    let repost = container as RepostContainer;

    for (let tag of event.tags) {
      let relayUrl = tag[2];

      if (tag[0] == 'p') involved.set(ID(tag[1]),relayUrl);

      if (tag[0] == 'e') {
        container.relay = relayUrl;

        if (tag[3] == 'root') {
          reply.rootId = ID(tag[1]);
          reply.subtype = NoteSubtype.Reply; // Reply subtype = 2
        }
        if (tag[3] == 'reply') {
          reply.repliedTo = ID(tag[1]);
          reply.subtype = NoteSubtype.Reply; // Reply subtype = 2
        }
        if (!tag[3]) {
          if(reply.repliedTo) 
            reply.rootId = reply.repliedTo;

          reply.repliedTo = ID(tag[1]);
          reply.subtype = NoteSubtype.Reply; // Reply subtype = 2
        }

        if (tag[3] == 'mention' && reply.subtype == NoteSubtype.Note) {
          repost.repostOf = ID(tag[1]);
          repost.subtype = NoteSubtype.Repost; // Repost subtype = 3
        }
      }
    }

    if (reply.subtype == 2) {
      if (reply.rootId && !reply.repliedTo) reply.repliedTo = reply.rootId;
    }

    return container;
  }

  parseHighlight(container: HighlightContainer, relayUrl?: string): NoteContainer | undefined {
    container.kind = TextKind;
    container.subtype = NoteSubtype.Highlight;

    for (let tag of container.event!.tags) {
      //if (tag[0] == 'p') involved.add(ID(tag[1]));
      if(tag[0] == 'title') container.title = tag[1];
      if(tag[0] == 'alt') container.alt = tag[1];
      if(tag[0] == 'context') container.context = tag[1];
      if(tag[0] == 'a') container.a = tag[1];
      if(tag[0] == 'r') container.soureUrl = tag[1];
    }

    return container;
  }

  // ---- Private methods ----

  #canAdd(event: Event): boolean {
    let eventId = ID(event.id);
    if (eventDeletionManager.deleted.has(eventId)) return false;

    if (event) if (blockManager.isBlocked(ID(event.pubkey))) return false;

    return true;
  }

  #addEvent(container: NoteContainer) {
    this.notes.set(container.id, container.event!);
    eventManager.eventIndex.set(container.id, container.event!);
    eventManager.containers.set(container.id, container);
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
