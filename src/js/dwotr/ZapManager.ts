import { throttle } from 'lodash';
import { Event, Filter } from 'nostr-tools';
import storage from './Storage';
import { ID, STR, UID } from '@/utils/UniqueIds';
import wotPubSub, { FeedOptions, OnEvent, TextKind, ZapKind } from './network/WOTPubSub';
import { getNostrTime } from './Utils';
import eventManager from './EventManager';
import EventCallbacks from './model/EventCallbacks';
import relaySubscription from './network/RelaySubscription';
import { decodeInvoice } from '@/utils/Lightning';
import { getZappingUser } from '@/nostr/utils';
import Key from '@/nostr/Key';




class ZapManager {

  logging = false;
  events: Map<UID, Event> = new Map();

  // Profile ID, Set of Event IDs
  zaps: Map<UID, Zap> = new Map();

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

    storage.zaps.bulkPut(queue).finally(() => {
      this.#saving = false;
    });
  }, 1000);



  hasZap(id: UID) {
    return this.events.has(id);
  }

  getZap(id: UID) {
    return this.events.get(id);
  }


  handle(event: Event) {
    
    this.metrics.RelayEvents++;

    let zapItem = this.#addZap(event);

    if(!zapItem) return;

    //if (followManager.isAllowed(authorId) || reactionManager.) 
    this.save(event); // Save all for now

    this.onEvent.dispatch(zapItem.subjectId, zapItem);
  }

  // Optionally save and load view order on nodes, so that we can display them in the same order, even if they are received out of order
  // This could be for like the last viewed 100 to 1000 events, as the time sort should be good enough for the rest.

  async load() {
    let zaps = await storage.zaps.toArray();
    this.metrics.Loaded = zaps.length;

    let deltaDelete: Array<string> = [];

    for (let event of zaps) {
      eventManager.addSeen(ID(event.id));

      if (this.#canAdd(event)) {
        this.#addZap(event);
      } else {
        deltaDelete.push(event.id);
      }
    }

    this.metrics.Deleted += deltaDelete.length;

    // Remove notes from profiles that are not relevant
    //if (deltaDelete.length > 0) await storage.zaps.bulkDelete(deltaDelete);
  }

  save(event: Event) {
    this.#saveQueue.set(ID(event.id), event);
    this.saveBulk(); // Save to IndexedDB in bulk by throttling
  }

  createEvent() {
    // TODO: Add tags

    const event = {
      kind: ZapKind,
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

  async onceZap(id: UID) {
    let eventId = STR(id) as string;

    let events = await relaySubscription.getEventByIds([eventId], [9735]);

    return events?.[0];
  }


  relayZapsByRequests = new Set<UID>();

  mapZapsBy(id: UID, onEvent?: OnEvent): number {
    if (this.relayZapsByRequests.has(id)) return -1; // Already requested
    this.relayZapsByRequests.add(id);

    let opt = {
      filter: { '#e': [STR(id) as string], kinds: [9735] } as Filter,
      onClose: () => this.relayZapsByRequests.delete(id),
      onEvent
    } as FeedOptions;

    return relaySubscription.map(opt);
  }


  #canAdd(zap: Event): boolean {
    return true;
  };


  #addZap(event: Event) : Zap | undefined {
    const zappedNoteId = Zap.decodeEventId(event);
    if (!zappedNoteId) {
      return undefined; // TODO: you can also zap profiles
    }

    this.events.set(ID(event.id), event);

    let id = ID(zappedNoteId);
    if (!this.zaps.has(id)) {
      this.zaps.set(id, new Zap(id));
    }
    return this.zaps.get(id)!.add(event);
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

const zapManager = new ZapManager();
export default zapManager;


export class Zap {
  subjectId: UID;
  amountPerUser: Map<string, number> = new Map();
  events: Set<Event> = new Set();
  amount: number = 0;
  zappedByMe: boolean = false;

  constructor(_subjectId: UID) {
    this.subjectId = _subjectId;
  }

  add(event: Event) : Zap | undefined {
    if(this.events.has(event)) return this;
    this.events.add(event);

    const zapAmount = this.#decodeAmount(event);
    this.amount += zapAmount;

    const zapper = getZappingUser(event);
    if (!zapper) return this;

    this.amountPerUser.set(zapper, (this.amountPerUser.get(zapper) || 0) + zapAmount);

    if(zapper === Key.getPubKey()) this.zappedByMe = true;

    return this;
  }

  #decodeAmount(event: Event) : number {
    const bolt11 = event?.tags.find((tag) => tag[0] === 'bolt11')?.[1];
    if (!bolt11) {
      console.log('Invalid zap, missing bolt11 tag');
      return 0;
    }
    const decoded = decodeInvoice(bolt11);
    const amount = (decoded?.amount || 0) / 1000;
    return amount;
  }

  static decodeEventId(event: Event): string | undefined {
    return event.tags?.find((tag) => tag[0] === 'e')?.[1];
  }

}
