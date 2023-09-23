import { ID, STR, UID } from '@/utils/UniqueIds';
import { Event, Filter } from 'nostr-tools';
import wotPubSub, { ReactionKind } from './network/WOTPubSub';
import { getNostrTime } from './Utils';
import { throttle } from 'lodash';
import storage from './Storage';
import followManager from './FollowManager';
import Key from '@/nostr/Key';
import blockManager from './BlockManager';
import { EventMetadata, EventTag } from './Utils/EventParser';
import eventManager from './EventManager';



// class ETagReaction extends EventTag  {

//   id: UID = 0;
//   value: number = 0;

//   static parse(tag: Array<string>) : ETagReaction {
//     let p = new ETagReaction();
//     p.name = tag[0];
//     p.source = tag;
//     p.value = parseInt(tag[1]);
//     return p;
//   }
// }
// class ReactionMetadata extends EventMetadata {

//   subjectId: UID = 0;
//   value: number = 0;

//   static parse(event: Event) : ReactionMetadata {
//     let m = EventMetadata.parse(event);

//     return m as ReactionMetadata;
//   }
// }

export class ReactionRecord {
  id: string = '';
  eventId: string = '';
  profileId: string = '';
  value: number = 0;
  created_at: number = 0;
}

// Blocks that are aggregated from multiple profiles
class ReactionManager {
  //subscriptions = new Subscriptions(); // Callbacks to call when the mutes change

  likes = new Map<UID, Set<number>>();
  downVotes = new Map<UID, Set<number>>();

  #saveQueue: Map<number, ReactionRecord> = new Map();
  #saving: boolean = false;

  metrics = {
    TotalMemory: 0,
    Loaded: 0,
    Handle: 0,
    Saved: 0,
  };

  saveBulk = throttle(() => {
    if (this.#saving) {
      this.saveBulk(); // try again later
      return;
    }

    this.#saving = true;

    const queue = [...this.#saveQueue.values()];
    this.#saveQueue = new Map<number, ReactionRecord>();

    this.metrics.Saved += queue.length;

    storage.reactions.bulkPut(queue).finally(() => {
      this.#saving = false;
    });
  }, 1000);

  getLikes(eventId: UID): Set<UID> {
    return this.#getLikes(eventId);
  }

  getDownVotes(eventId: UID): Set<UID> {
    return this.#getDownVotes(eventId);
  }

  // Block the public key using the logged in user as the Blocker
  onLike(subjectEventId: string, subjectEventPubKey: string, value: number = 1) {
    let myKey = Key.getPubKey();
    let myId = ID(myKey);

    this.addValue(ID(subjectEventId), myId, value);

    let time = getNostrTime();

    let event = this.createEvent(subjectEventId, subjectEventPubKey, value, time);
    wotPubSub.publish(event); // Publish the event to the network

    let record = {
      id: event.id,
      eventId: subjectEventId,
      profileId: STR(myId),
      value,
      created_at: time,
    } as ReactionRecord;

    this.save(record); // Save the event to the local database
  }

  async handle(event: Event) {
    let authorId = ID(event.pubkey);

    // Ignore events from profiles that are blocked
    if (blockManager.isBlocked(authorId)) return;

    let reverseTags = event.tags.reverse();
    let e = reverseTags.find((tag) => tag[0] === 'e'); // Subject Event ID
    if (!e) return;

    // let p = reverseTags.find((tag) => tag[0] === 'p'); // Subject Event owner pubkey
    // Notify the profile if its me!?

    let targetEventKey = e[1];
    if (!targetEventKey) return;

    this.metrics.Handle++;

    let value = event.content == '+' ? 1 : event.content == '-' ? -1 : 0;

    let targetEventId = ID(targetEventKey);

    this.addValue(targetEventId, authorId, value);

    // Only save the event if the profile is followed by our WoT
    if (followManager.isAllowed(authorId)) {
      let record = {
        id: event.id,
        eventId: targetEventKey,
        profileId: event.pubkey,
        value,
        created_at: event.created_at,
      } as ReactionRecord;

      this.save(record);
    }
  }

  // parseEvent(event: Event) {

  // }

  addValue(targetId: UID, profileId, value: number) {
    let likes = this.#getLikes(targetId);
    let downVotes = this.#getDownVotes(targetId);

    if (value == 1) {
      likes.add(profileId);
      downVotes.delete(profileId);
    } else if (value == -1) {
      likes.delete(profileId);
      downVotes.add(profileId);
    } else {
      // No votes given, remove any existing votes
      likes.delete(profileId);
      downVotes.delete(profileId);
    }
  }

  #getLikes(eventId: UID): Set<UID> {
    let likes = this.likes.get(eventId);
    if (!likes) {
      likes = new Set<UID>();
      this.likes.set(eventId, likes);
    }
    return likes;
  }

  #getDownVotes(eventId: UID): Set<UID> {
    let downVotes = this.downVotes.get(eventId);
    if (!downVotes) {
      downVotes = new Set<UID>();
      this.downVotes.set(eventId, downVotes);
    }
    return downVotes;
  }

  async load() {
    let reactions = await storage.reactions.toArray();
    this.metrics.Loaded = reactions.length;

    let deltaDelete: Array<string> = [];

    for (let reaction of reactions) {
      let profileId = ID(reaction.profileId);

      eventManager.addSeenEvent(ID(reaction.id)); // No need to handle this event again from Relays

      if (followManager.isAllowed(profileId)) {
        this.addValue(ID(reaction.eventId), ID(reaction.profileId), reaction.value);
      } else {
        deltaDelete.push(reaction.id);
      }
    }

    // Remove reactions from profiles that are not followed
    if (deltaDelete.length > 0) {
      await storage.reactions.bulkDelete(deltaDelete);
    }
  }

  async save(record: ReactionRecord) {
    this.#saveQueue.set(ID(record.id), record);
    this.saveBulk(); // Save to IndexedDB in bulk by throttling
  }

  #relayCallback(event: Event) {
    reactionManager.handle(event);
  }

  subscribeRelays(eventId: string, cb: any, since: number = 0, limit: number = 1000) {
    let filters = [
      {
        '#e': [eventId],
        kinds: [ReactionKind],
      },
    ] as Array<Filter>;

    const cbInstance = (event: Event) => {
      reactionManager.#relayCallback(event);
      if (cb) cb(reactionManager.getLikes(ID(eventId)), reactionManager.getDownVotes(ID(eventId)));
    };

    return wotPubSub.subscribeFilter(filters, cbInstance);
  }

  createEvent(
    eventId: string,
    eventPubKey: string,
    value: number = 1,
    time = getNostrTime(),
  ): Partial<Event> {
    let content = value == 1 ? '+' : value == -1 ? '-' : '';

    const event = {
      kind: ReactionKind,
      content,
      created_at: time,
      tags: [
        ['e', eventId], // Event ID
        ['p', eventPubKey], // Profile ID
      ],
    };

    wotPubSub.sign(event);

    return event;
  }

  getMetrics() {
    this.metrics.TotalMemory = this.likes.size + this.downVotes.size;

    return this.metrics;
  }
}

const reactionManager = new ReactionManager();
export default reactionManager;
