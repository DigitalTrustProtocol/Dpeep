import { throttle } from 'lodash';
import { Event } from 'nostr-tools';
import storage from './Storage';
import { ID,  UID } from '@/utils/UniqueIds';
import wotPubSub, { EventDeletionKind } from './network/WOTPubSub';
import { getNostrTime } from './Utils';
import eventManager from './EventManager';
import EventCallbacks from './model/EventCallbacks';
import noteManager from './NoteManager';



class EventDeletionManager {

  logging = false;
  
  deleted: Set<UID> = new Set();

  onEvent = new EventCallbacks(); // Callbacks to call when the follower change

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

    storage.eventDeletions.bulkPut(queue).finally(() => {
      this.#saving = false;
    });
  }, 1000);



  handle(event: Event) {
    
    this.metrics.RelayEvents++;

    if(!this.#canAdd(event)) return;

    let subjectIds =  this.#addEvent(event);

    if(subjectIds.length == 0) return;

    this.save(event); // Save all for now

    //this.onEvent.dispatch();
  }

  // Optionally save and load view order on nodes, so that we can display them in the same order, even if they are received out of order
  // This could be for like the last viewed 100 to 1000 events, as the time sort should be good enough for the rest.

  async load() {
    let events = await storage.eventDeletions.toArray();
    this.metrics.Loaded = events.length;

    let deltaDelete: Array<string> = [];

    for (let event of events) {
      eventManager.addSeen(ID(event.id));

      if (this.#canAdd(event)) {
        this.#addEvent(event);
      } else {
        deltaDelete.push(event.id);
      }
    }

    this.metrics.Deleted += deltaDelete.length;

    // Remove notes from profiles that are not relevant
    //if (deltaDelete.length > 0) await storage.deleted.bulkDelete(deltaDelete);
  }

  save(event: Event) {
    this.#saveQueue.set(ID(event.id), event);
    this.saveBulk(); // Save to IndexedDB in bulk by throttling
  }

  createEvent() {

    const event = {
      kind: EventDeletionKind,
      content: '',
      created_at: getNostrTime(),
      // tags: [
      //   ['e', eventId], // Event ID
      //   ['p', eventPubKey], // Profile ID
      // ],
    };

    wotPubSub.sign(event);

    return event;
  }

  // async onceZap(id: UID) {
  //   let eventId = STR(id) as string;

  //   let events = await relaySubscription.getEventByIds([eventId], [9735]);

  //   return events?.[0];
  // }


  relayRequests = new Set<UID>();

  // mapZapsBy(id: UID, onEvent?: OnEvent): number {
  //   if (this.relayZapsByRequests.has(id)) return -1; // Already requested
  //   this.relayZapsByRequests.add(id);

  //   let opt = {
  //     filter: { '#e': [STR(id) as string], kinds: [9735] } as Filter,
  //     onClose: () => this.relayZapsByRequests.delete(id),
  //     onEvent
  //   } as FeedOptions;

  //   return relaySubscription.map(opt);
  // }


  #canAdd(event: Event): boolean {

    return true;
  };


  #addEvent(event: Event) : Array<UID> {

  
    let subjectIds = event.tags.filter((tag) => tag[0] === 'e').map((tag) => ID(tag[1]));
    let authorId = ID(event.pubkey);

    let result: Array<UID> = [];
    for (let subjectId of subjectIds) {

      // We can only add the deleted ID if we can verify that the author of the event is the author of the note
      let subjectEvent = eventManager.eventIndex.get(subjectId);
      if(!subjectEvent || ID(subjectEvent.pubkey) != authorId) continue; // We don't have the note, or the note is not the same as the event

      this.deleted.add(subjectId);
      result.push(subjectId);
    }

    if(result.length == 0) return result;

    eventManager.eventIndex.set(ID(event.id), event);
    return result;
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

const eventDeletionManager = new EventDeletionManager();
export default eventDeletionManager;
