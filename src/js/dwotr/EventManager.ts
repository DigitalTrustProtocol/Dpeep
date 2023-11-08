import { ID, UID } from '@/utils/UniqueIds';
import { Event, verifySignature } from 'nostr-tools';
import {
  BlockKind,
  ContactsKind,
  EventDeletionKind,
  MetadataKind,
  MuteKind,
  ReactionKind,
  RecommendRelayKind,
  RelayListKind,
  RepostKind,
  Trust1Kind,
  ZapKind,
} from './network/provider';
import muteManager from './MuteManager';
import blockManager from './BlockManager';
import followManager from './FollowManager';
import profileManager from './ProfileManager';
import reactionManager from './ReactionManager';
import noteManager from './NoteManager';
import zapManager from './ZapManager';
import EventDeletionManager from './EventDeletionManager';
import repostManager from './RepostManager';
import { EventContainer } from './model/ContainerTypes';
import recommendRelayManager from './RecommendRelayManager';
import { BulkStorage } from './network/BulkStorage';
import storage from './Storage';
import relayListManager from './RelayListManager';
import trustManager from './TrustManager';

// Define the event with the DWoTR metadata object
export type DWoTREvent = Event & {
  dwotr: {
    //relay: string;
    relays?: string[];
  };
};
class EventManager {
  relayEventCount: Map<string, number> = new Map();

  seenRelayEvents: Map<UID, Set<string>> = new Map();

  eventIndex: Map<UID, Event> = new Map();

  containers: Map<UID, EventContainer> = new Map(); // Index of all containers, eventid, eventcontainer

  containerParsers: Map<number, (event: Event, url?: string) => EventContainer | undefined> =
    new Map();
  eventHandlers: Map<number, (event: Event, url?: string) => void> = new Map();
  eventLoaders: Map<number, (event: Event) => void> = new Map();

  table = new BulkStorage(storage.events);

  metrics = {
    TotalMemory: 0,
    Loaded: 0,
    HandleEvents: 0,
  };

  increaseRelayEventCount(relay: string) {
    let count = this.relayEventCount.get(relay) || 0;
    count++;
    this.relayEventCount.set(relay, count);
  }

  getContainer<T extends EventContainer>(id: UID): T | undefined {
    let container = eventManager.containers.get(id) as T;
    if (container) return container;

    let event = eventManager.eventIndex.get(id);
    if (!event) return;

    container = this.createContainer<T>(event) as T;
    eventManager.containers.set(id, container);

    return container as T;
  }

  getContainerByEvent<T extends EventContainer>(event: Event): T | undefined {
    let container = eventManager.containers.get(ID(event.id)) as T;
    if (container) return container;

    container = this.createContainer<T>(event) as T;
    if (!container) return;
    eventManager.containers.set(container.id, container);

    return container as T;
  }

  createContainer<T extends EventContainer>(event: Event): T | undefined {
    let relayUrl = event['dwotr']?.relay;

    let parser = this.containerParsers.get(event.kind);
    if (!parser) return undefined;

    let container = parser(event, relayUrl) as T;
    return container;
  }

  parse(event: Event, relayUrl?: string): EventContainer {
    let eventId = ID(event.id);
    let container = {
      id: eventId,
      kind: event.kind,
      event: event,
      relay: relayUrl,
      authorId: ID(event.pubkey),
    };

    return container;
  }



  seen(eventId: UID) {
    if (eventId == 0) return true; // 0 is a special case, as representing null event, therefore it is always seen
    return this.seenRelayEvents.has(eventId);
  }

  seenRelay(eventId: UID, relay: string) {
    if (eventId == 0) return true; // 0 is a special case, as representing null event, therefore it is always seen
    let relays = this.seenRelayEvents.get(eventId);
    if (!relays) return false;
    return relays.has(relay);
  }

  addSeen(eventId: UID, relay?: string) {
    if (eventId == 0) return; // 0 is a special case, as representing null event, therefore it is always seen

    let relays = this.seenRelayEvents.get(eventId);
    if (!relays) {
      relays = new Set();
      this.seenRelayEvents.set(eventId, relays);
    }
    if(relay) relays.add(relay);
  }

  verify(event: Event) {
    return verifySignature(event);
  }

  // doRelayEvent(event: Event): boolean {
  //   if (!event?.id) return false;
  //   let eventId = ID(event.id); // add Event ID to UniqueIds

  //   if (this.seenRelayEvents.has(eventId)) {
  //     return false; // already seen this event, skip it
  //   }

  //   // Relay-pool do not validate events, so we need to do it here.
  //   // Validate an event takes about 14ms, so this is a big performance boost avoid validating events that we have already seen
  //   if (!validateEvent(event) || !verifySignature(event)) return false;

  //   this.seenRelayEvents.add(eventId);
  //   return true;
  // }

  async eventCallback(event: Event, afterEose?: boolean, url?: string | undefined) {
    if (!event) return false;

    eventManager.addSeen(ID(event.id));

    // Check if the event has been ordered deleted
    if (EventDeletionManager.deleted.has(ID(event.id))) return false;

    eventManager.metrics.HandleEvents++;

    // if (url) {
    //   // Add the relay to the event, so we know where it came from.
    //   event['dwotr'] = {
    //     relays: [url],
    //   };
    // }

    // Handle the event as a note
    if (noteManager.supportedKinds.has(event.kind)) return noteManager.handle(event, url);

    // Else check here if the event is a supported kind
    switch (event.kind) {
      case MetadataKind:
        profileManager.handle(event, url);
        break;

      case RecommendRelayKind:
        recommendRelayManager.handle(event, url);
        break;

      case RelayListKind:
        relayListManager.handle(event, url);
        break;

      case RepostKind:
        repostManager.handle(event);
        break;

      case ContactsKind:
        followManager.handle(event);
        break;

      case EventDeletionKind:
        EventDeletionManager.handle(event);
        break;

      case ReactionKind:
        reactionManager.handle(event);
        break;

      case Trust1Kind:
        await trustManager.handle(event);
        break;
      case MuteKind:
        await muteManager.handle(event);
        break;
      case BlockKind:
        await blockManager.handle(event);
        break;

      case ZapKind:
        zapManager.handle(event);
        break;

      default:
        //Events.handle(event, false, true);
        break;
    }

    return true;
  }

  async load() {
    // Load all events from storage
    let events = await this.table.toArray() as DWoTREvent[]; 
    for (let event of events) {
      let id = ID(event.id);
      this.eventIndex.set(id, event);
      this.addSeen(id);
      this.#addRelayEventCount(event);

      this.eventCallback(event);
    }
  }

  #addRelayEventCount(event: DWoTREvent) {
    event.dwotr?.relays?.forEach((relay) => this.increaseRelayEventCount(relay));
  }

  getMetrics() {
    return this.metrics;
  }
}

const eventManager = new EventManager();

export default eventManager;
