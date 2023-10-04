import { Event, Filter } from 'nostr-tools';
import profileManager from '../ProfileManager';
import { seconds } from 'hurdak';
import { ID, STR, UID } from '@/utils/UniqueIds';
import relaySubscription from './RelaySubscription';
import { getEventReplyingTo, getRepostedEventId, isRepost } from '@/nostr/utils';
import noteManager from '../NoteManager';
import { MetadataKind, ReactionKind, RepostKind, TextKind } from './WOTPubSub';
import { Events, ReactionEvent } from './types';
import eventManager from '../EventManager';

export class ContextLoader {
  time10minute: number = seconds(10, 'minute');
  timeout = 9000;

  logging = true;

  eventIds: Set<UID> = new Set();
  authorIds: Set<UID> = new Set();
  kinds: Set<number> = new Set();
  items: Events = [];

  async getEventsByIdWithContext(ids: Array<UID>): Promise<Array<Event>> {
    let list = ids.map((id) => STR(id) as string);
    let events = await relaySubscription.getEventsById(list);
    await this.loadDependencies(events);
    return events;
  }

  // Profiles
  // Replies
  // Reactions
  // Reposts
  // Zaps

  async loadDependencies(events: Array<Event>): Promise<void> {
    if (events.length == 0) return;
    // The number of events should not be more than between 10-50, so we can load all context in one go
    if (events.length > 50) throw new Error('Too many events to load context for');

    // Clear previous
    this.clear();

    this.items = events;

    await this.loadContext();
  }

  async loadContext(): Promise<void> {
    // Run mutiple times to load all dependencies as they can be nested
    for (let i = 0; i < 3; i++) {
     
      this.doItems();

      if(this.logging)
        console.log('ContextLoader:loadContext:Load dependencies:', " - Events:", this.eventIds.size, [...this.eventIds.values()].map((id) => STR(id)), " - Profiles:", this.authorIds.size, [...this.authorIds.values()].map((id) => STR(id)));


      if (!this.eventIds.size && !this.authorIds.size) break; // Nothing to load

      // Loading missing, can generate more items
      await this.loadFromRelays();
    }

    if(this.eventIds.size > 0) {
      if(this.logging)
        console.log('ContextLoader:loadContext:Missing not loaded!', this.eventIds.size, this.eventIds);
    }
  }

  async loadFromRelays() {

    let filter = { kinds: [] } as Filter;
    if (this.eventIds.size > 0) {
       filter.ids = [...this.eventIds.values()].map((id) => STR(id) as string);
       filter.kinds?.push(...this.kinds.values());
    }
    if (this.authorIds.size > 0) {
      filter.authors = [...this.authorIds.values()].map((id) => STR(id) as string);
      filter.kinds?.push(MetadataKind);
    } 

    const cb = (event: Event, afterEose: boolean, url: string | undefined) => {
      this.items.push(event);
    };

    await relaySubscription.getEventsByFilters(filter, cb);
  }

  doItems() {
    this.eventIds.clear();
    this.authorIds.clear();
    this.kinds.clear();

    for (const event of this.items) {

      // Load profiles from every event pubKey
      this.doProfile(event);

      switch (event.kind) {
        case MetadataKind:
          // Nothing to do
          break;
        case TextKind:
          this.doReply(event); // Can be a reply
          this.doRepost(event); // Can be a repost
          break;

        case RepostKind:
          this.doRepost(event);
          break;
        case ReactionKind:
          this.doReactions(event as ReactionEvent);
          break;
      }
    }

    this.items = [];
  }

  addAuthor(id: UID) {
    if (this.authorIds.has(id)) return; // Already seen

    this.authorIds.add(id);
  }


  addEvent(id: UID, kind: number) {
    if (eventManager.seen(id)) return; // Already seen

    this.eventIds.add(id);
    this.kinds.add(kind);
    if (kind == TextKind) this.kinds.add(RepostKind);
  }


  doProfile(event: Event) {
    let id = ID(event.pubkey);
    this.#addProfile(id);
  }

  doText(event: Event) {
    // Check content for mentions of profiles
  }

  doReactions(event: ReactionEvent) {
    let meta = event.meta;
    if (!meta || !meta.subjectEventId) return;
    if (noteManager.hasNode(meta.subjectEventId)) return;
    this.addEvent(meta.subjectEventId, TextKind);

    if (!meta.subjectAuthorId) return;
    if (!this.#hasProfile(meta.subjectAuthorId)) return;

    this.#addProfile(meta.subjectAuthorId);
  }

  doRepost(event: Event) {
    if (!isRepost(event)) return;

    let eventId = getRepostedEventId(event);
    if (!eventId) return;

    if (noteManager.hasNode(ID(eventId))) return;

    this.addEvent(ID(eventId), TextKind);
  }

  async doReply(event: Event) {
    let eventId = getEventReplyingTo(event);
    if (!eventId) return;

    if (noteManager.hasNode(ID(eventId))) return;

    this.addEvent(ID(eventId), TextKind);
  }

  clear() {
    this.eventIds.clear();
    this.authorIds.clear();
    this.kinds.clear();
    this.items = [];
  }


  #hasProfile(authorId: UID): boolean {
    if(!profileManager.hasProfile(authorId)) return false;
    let profile = profileManager.getMemoryProfile(authorId);
    return !profile.isDefault;
  }


  #addProfile(uid: UID) {
    if (this.#hasProfile(uid)) return;

    this.addAuthor(uid);
  }

}

const contextLoader = new ContextLoader();
export default contextLoader;
