import { Event } from 'nostr-tools';
import { ID, UID } from '@/utils/UniqueIds';
import blockManager from './BlockManager';
import eventManager from './EventManager';
import EventCallbacks from './model/EventCallbacks';
import eventDeletionManager from './EventDeletionManager';
import { RelayListKind } from './network/provider';
import { BulkStorage } from './network/BulkStorage';
import storage from './Storage';
import { Url } from './network/Url';
import serverManager, { PublicRelaySettings } from './ServerManager';





// NIP-65
class RelayListManager {
  logging = false;

  onEvent = new EventCallbacks(); // Callbacks to call on new events

  table = new BulkStorage(storage.relayList);

  private metrics = {
    Table: 0,
    Events: 0,
  };

  registerHandlers() {
    eventManager.eventHandlers.set(RelayListKind, this.handle.bind(this));
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

    return true;
  }

  #addEvent(event: Event): void {
    eventManager.eventIndex.set(ID(event.id), event);

    let authorId = ID(event.pubkey);

    for(let tag of event.tags) {
      if(tag[0] != 'r') continue;
      let relayUrl = Url.sanitize(tag[1]);
      if(!relayUrl) continue; // Invalid url
      this.addRelay(authorId, relayUrl, tag[2], event.created_at);
    }
  }

  addRelay(authorId: UID, url: string, action: string, created_at: number) {
    let read = !action || action == "read";
    let write = !action || action == "write";
    let settings = {read, write, created_at} as PublicRelaySettings;
    serverManager.addRelay(authorId, url, settings);
  }

  async load() {
    let records = await this.table.toArray();

    records.forEach((record) => {
      let event = record as Event;
      this.#addEvent(event);
    });
  }

  getMetrics() {
    //this.table.count().then((count) => this.metrics.Table = count);
    //this.metrics.Authors = this.authorRelays.size;
    return this.metrics;
  }
}

const relayListManager = new RelayListManager();
export default relayListManager;
