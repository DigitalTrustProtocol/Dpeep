import { Event } from 'nostr-tools';
import { ID } from '@/utils/UniqueIds';
import blockManager from './BlockManager';
import eventManager from './EventManager';
import EventCallbacks from './model/EventCallbacks';
import eventDeletionManager from './EventDeletionManager';
import { RecommendRelayKind } from './network/WOTPubSub';
import noteManager from './NoteManager';
import { RecommendRelayContainer } from './model/ContainerTypes';
import { Url } from './network/Url';
import profileManager from './ProfileManager';
import { ProfileMemory } from './model/ProfileRecord';

type ProfileRelays = {
  relays: {
    recommendRelays: string[];
    contactRelays: string[];
  };
};

class RecommendRelayManager {
  logging = false;

  onEvent = new EventCallbacks(); // Callbacks to call on new events

  private metrics = {
    RelayEvents: 0,
  };

  registerHandlers() {
    eventManager.eventHandlers.set(RecommendRelayKind, this.handle.bind(this));
    eventManager.containerParsers.set(RecommendRelayKind, this.parse.bind(this));
  }

  handle(event: Event, url?: string) {
    this.metrics.RelayEvents++;

    let container = this.parse(event, url);

    this.handleContainer(container);
  }

  handleContainer(container: RecommendRelayContainer | undefined) {
    if (!this.#canAdd(container)) return;

    this.#addEvent(container!);

    this.onEvent.dispatch(container!.id, container);
  }

  parse(event: Event, url?: string): RecommendRelayContainer | undefined {
    let container = eventManager.parse(event, url) as RecommendRelayContainer;
    let recommendUrl = Url.isValid(event.content) ? event.content : ''; //
    container.recommendRelays = new Set(recommendUrl);

    return container;
  }

  #canAdd(container: RecommendRelayContainer | undefined): boolean {
    if (!container) return false;
    if (eventDeletionManager.deleted.has(container.id)) return false;
    if (blockManager.isBlocked(ID(container?.event!.pubkey))) return false; // May already been blocked, so redudant code

    return true;
  }
  #addEvent(container: RecommendRelayContainer): void {
    noteManager.notes.set(container.id, container.event!); // Add to the noteManager, so its in the feed
    eventManager.containers.set(container.id, container);
    eventManager.eventIndex.set(container.id, container.event!);

    let profile = profileManager.getMemoryProfile(container.authorId!) as any as ProfileRelays;
    if (!profile.relays) profile.relays = { recommendRelays: [], contactRelays: [] };
    if (!profile.relays.recommendRelays) profile.relays.recommendRelays = [];

    profile.relays.recommendRelays = Array.from(container.recommendRelays!);
    profileManager.save(profile as any as ProfileMemory);
  }

  getMetrics() {
    return this.metrics;
  }
}

const recommendRelayManager = new RecommendRelayManager();
export default recommendRelayManager;
