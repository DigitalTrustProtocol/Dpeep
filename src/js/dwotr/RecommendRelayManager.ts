import { Event } from 'nostr-tools';
import { ID, UID } from '@/utils/UniqueIds';
import blockManager from './BlockManager';
import eventManager from './EventManager';
import EventCallbacks from './model/EventCallbacks';
import eventDeletionManager from './EventDeletionManager';
import { RecommendRelayKind } from './network/WOTPubSub';
import { BulkStorage } from './network/BulkStorage';
import storage from './Storage';
import { Url } from './network/Url';

class RecommendRelayManager {
  logging = false;

  authorRelays: Map<UID, Set<string>> = new Map();
  relayAuthors: Map<string, Set<UID>> = new Map();

  onEvent = new EventCallbacks(); // Callbacks to call on new events

  table = new BulkStorage(storage.recommendRelays);

  private metrics = {
    Table: 0,
    Events: 0,
    Authors: 0,
  };

  registerHandlers() {
    eventManager.eventHandlers.set(RecommendRelayKind, this.handle.bind(this));
  }

  handle(event: Event, url?: string) {
    this.metrics.Events++;
    if (!this.#canAdd(event)) return;

    this.#addEvent(event);

    this.table.save(ID(event.id), event);

    this.onEvent.dispatch(ID(event!.id), event);
  }

  #canAdd(event: Event): boolean {
    if (eventDeletionManager.deleted.has(ID(event.id))) return false;
    if (blockManager.isBlocked(ID(event!.pubkey))) return false; // May already been blocked, so redudant code

    if (!Url.isWss(event.content)) return false;

    return true;
  }

  #addEvent(event: Event): void {
    eventManager.eventIndex.set(ID(event.id), event);

    let authorId = ID(event.pubkey);
    let url = Url.sanitize(event.content);
    if (url) {
        this.addRelayUrl(authorId, url);
    } 
  }

  addRelayUrl(authorId: UID, url: string) {
    let relays = this.authorRelays.get(authorId) || new Set<string>();
    relays.add(url);
    this.authorRelays.set(authorId, relays);

    let authors = this.relayAuthors.get(url) || new Set<UID>();
    authors.add(authorId);
    this.relayAuthors.set(url, authors);
  }

  async load() {
    let records = await this.table.toArray();

    records.forEach((record) => {
      let event = record as Event;
      this.#addEvent(event);
    });
  }

  async getMetrics() {
    this.table.count().then((count) => this.metrics.Table = count);
    this.metrics.Authors = this.authorRelays.size;
    return this.metrics;
  }
}

const recommendRelayManager = new RecommendRelayManager();
export default recommendRelayManager;
