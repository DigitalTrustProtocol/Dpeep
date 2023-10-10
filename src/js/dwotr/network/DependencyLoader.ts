import { Event, Filter } from 'nostr-tools';
import profileManager from '../ProfileManager';
import { ID, STR, UID } from '@/utils/UniqueIds';
import relaySubscription from './RelaySubscription';
import { getEventReplyingTo, getRepostedEventId, isRepost } from '@/nostr/utils';
import noteManager from '../NoteManager';
import { MetadataKind, ReactionKind, RepostKind, TextKind } from './WOTPubSub';
import { Events, ReactionEvent } from './types';
import eventManager from '../EventManager';
import { RepostEvent } from '../RepostManager';
import replyManager from '../ReplyManager';

export class DependencyLoader {
  logging = false;

  eventIds: Set<UID> = new Set();
  authorIds: Set<UID> = new Set();
  kinds: Set<number> = new Set();
  items: Events = [];

  async getEventsByIdWithContext(ids: Array<UID>): Promise<Array<Event>> {
    let list = ids.map((id) => STR(id) as string);
    let events = await relaySubscription.getEventByIds(list);
    await this.resolve(events);
    return events;
  }

  // Profiles
  // Replies
  // Reactions
  // Reposts
  // Zaps

  async resolve(events: Array<Event>): Promise<void> {
    if (events.length == 0) return;
    // The number of events should not be more than between 10-50, so we can load all context in one go
    if (events.length > 50) throw new Error('Too many events to load context for');

    // Clear previous
    this.clear();

    this.items = events;

    await this.#loadContext();
  }

  async #loadContext(): Promise<void> {
    // Run mutiple times to load all dependencies as they can be nested
    for (let i = 0; i < 3; i++) {
      this.#doItems();

      if (this.logging)
        console.log(
          'ContextLoader:loadContext:Load dependencies:',
          ' - Events:',
          this.eventIds.size,
          [...this.eventIds.values()].map((id) => STR(id)),
          ' - Profiles:',
          this.authorIds.size,
          [...this.authorIds.values()].map((id) => STR(id)),
        );

      if (!this.eventIds.size && !this.authorIds.size) break; // Nothing to load

      // Loading missing, can generate more items
      await this.#loadEvents();
      await this.#loadProfiles();
    }

    if (this.eventIds.size > 0) {
      if (this.logging)
        console.log(
          'ContextLoader:loadContext:Missing not loaded!',
          this.eventIds.size,
          this.eventIds,
        );
    }
  }

  async #loadEvents() {
    if (!this.eventIds.size) return;

    let filter = { kinds: [] } as Filter;
    filter.ids = [...this.eventIds.values()].map((id) => STR(id) as string);
    filter.kinds?.push(...this.kinds.values());
  

    const cb = (event: Event, afterEose: boolean, url: string | undefined) => {
      this.items.push(event);
    };

    await relaySubscription.getEventsByFilter(filter, cb);

    console.log('ContextLoader:loadEvents:Loading events:', filter, this.items);
  }

  async #loadProfiles() {
    if (!this.authorIds.size) return;

    let filter = { kinds: [] } as Filter;
    filter.authors = [...this.authorIds.values()].map((id) => STR(id) as string);
    filter.kinds?.push(MetadataKind);

    const cb = (event: Event, afterEose: boolean, url: string | undefined) => {
      this.items.push(event);
    };

    await relaySubscription.getEventsByFilter(filter, cb);

    console.log('ContextLoader:loadProfiles:Loading profiles:', filter, this.items);
  }


  #doItems() {
    this.eventIds.clear();
    this.authorIds.clear();
    this.kinds.clear();

    for (const event of this.items) {
      // Load profiles from every event pubKey
      this.#doProfile(event);

      switch (event.kind) {
        case MetadataKind:
          // Nothing to do
          break;

        case TextKind: {
          if (replyManager.isReplyEvent(event)) {
            this.#doReply(event); // Can be a reply
            break;
          }

          if (isRepost(event)) {
            // Check if the event is a repost even that the kind is 1
            this.#doRepost(event as RepostEvent); // Can be a repost
            break;
          }

          this.#doText(event); // Handle the event as a note
          break;
        }

        case RepostKind:
          this.#doRepost(event as RepostEvent);
          break;
        case ReactionKind:
          this.#doReactions(event as ReactionEvent);
          break;
      }
    }

    this.items = [];
  }

  addAuthor(id: UID) {
    if (this.authorIds.has(id)) return; // Already seen

    this.authorIds.add(id);
  }

  addEvent(id: UID, kind: number) : boolean {
    if (eventManager.seen(id)) return false; // Already seen

    this.eventIds.add(id);
    this.kinds.add(kind);
    if (kind == RepostKind) this.kinds.add(TextKind); // Add text kind if repost, as it can be a text kind

    return true;
  }

  clear() {
    this.eventIds.clear();
    this.authorIds.clear();
    this.kinds.clear();
    this.items = [];
  }

  #doProfile(event: Event) {
    let id = ID(event.pubkey);
    this.#addProfile(id);
  }

  #doText(event: Event) {
    // Check content for mentions of profiles
  }

  #doReactions(event: ReactionEvent) {
    let meta = event.meta;
    if (!meta || !meta.subjectEventId) return;

    if(!this.addEvent(meta.subjectEventId, TextKind)) return;

    if (!meta.subjectAuthorId) return;
    if (!this.#hasProfile(meta.subjectAuthorId)) return;

    this.#addProfile(meta.subjectAuthorId);
  }

  #doRepost(event: RepostEvent) {
    if (!isRepost(event)) return;

    let repostId = event?.meta?.repost_of || getRepostedEventId(event);
    if (!repostId) return;

    this.addEvent(ID(repostId), RepostKind);
  }

  #doReply(event: Event) {

    let replies = replyManager.getRepliesTo(event);

    for (const parentId of replies) {
      this.addEvent(parentId, RepostKind); // Automatically adds text kind
    }
  }

  #hasProfile(authorId: UID): boolean {
    if (!profileManager.hasProfile(authorId)) return false;
    let profile = profileManager.getMemoryProfile(authorId);
    return !profile.isDefault;
  }

  #addProfile(uid: UID) {
    if (this.#hasProfile(uid)) return;

    this.addAuthor(uid);
  }
}

const contextLoader = new DependencyLoader();
export default contextLoader;
