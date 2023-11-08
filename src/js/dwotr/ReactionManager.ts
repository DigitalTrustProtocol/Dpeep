import { ID, STR, UID } from '@/utils/UniqueIds';
import { Event } from 'nostr-tools';
import { FeedOption, ReactionKind } from './network/provider';
import { getNostrTime } from './Utils';
import storage from './Storage';
import followManager from './FollowManager';
import Key from '@/nostr/Key';
import blockManager from './BlockManager';
import eventManager from './EventManager';
import SortedMap from '@/utils/SortedMap/SortedMap';
import { ReactionEvent } from './network/types';
import { BulkStorage } from './network/BulkStorage';
import EventCallbacks from './model/EventCallbacks';
import relaySubscription from './network/RelaySubscription';
import serverManager from './ServerManager';



export const isLike = (content: string) =>
  ['+', '🤙', '👍', '❤️', '😎', '🏅','up','upvote'].includes(content);

export const isDownvote = (content: string) =>
  ['-', 'down','downvote'].includes(content);

export class ReactionRecord {
  id: string = '';
  eventId: string = '';
  profileId: string = '';
  value: number = 0;
  created_at: number = 0;

  getReaction() {
    let r = {
      id: ID(this.id),
      subjectEventId: ID(this.eventId),
      authorId: ID(this.profileId),
      value: this.value,
      created_at: this.created_at,
    } as Reaction;
    return r;
    }
}

export type Reaction = {
  id: UID; 
  subjectEventId: UID;
  subjectAuthorId?: UID;
  authorId: UID;
  value: number;
  created_at: number;
}

type Container = {
  likes?: Set<UID>;
  downVotes?: Set<UID>;
  reactions?: SortedMap<UID, Reaction>; // Key is event Id
}

export type ReactionMap = SortedMap<UID, Reaction> | undefined;


const sortCreated_at = (a: [UID, Reaction], b: [UID, Reaction]) => {
  if (!a[1]) return 1;
  if (!b[1]) return -1;

  return b[1].created_at - a[1].created_at;
};


// Blocks that are aggregated from multiple profiles
class ReactionManager {
  //subscriptions = new Subscriptions(); // Callbacks to call when the mutes change

  likes = new Map<UID, Set<UID>>();
  downVotes = new Map<UID, Set<UID>>();

  // Map Key is : AuthorId, SortedMap is eventId, created_at
  authors: Map<UID, ReactionMap> = new Map();

  onEvent = new EventCallbacks(); // Callbacks to call new notes



  metrics = {
    TotalMemory: 0,
    Loaded: 0,
    Handle: 0,
    Saved: 0,
  };

  table = new BulkStorage(storage.reactions);

  getLikes(eventId: UID): Set<UID> {
    return this.#getLikes(eventId);
  }

  getDownVotes(eventId: UID): Set<UID> {
    return this.#getDownVotes(eventId);
  }

  // Block the public key using the logged in user as the Blocker
  submitLike(subjectEventId: string, subjectEventPubKey: string, value: number = 1) {
    let myKey = Key.getPubKey();
    let myId = ID(myKey);
    
    let time = getNostrTime();

    let event = this.createEvent(subjectEventId, subjectEventPubKey, value, time);

    let reaction = this.#getReactionByEvent(event as Event);
    if(!reaction) return;

    this.addValue(reaction);

    serverManager.publish(event); // Publish the event to the network

    let record = {
      id: event.id,
      eventId: subjectEventId,
      profileId: STR(myId),
      value,
      created_at: time,
    } as ReactionRecord;

    this.save(record); // Save the event to the local database

    this.onEvent.dispatch(reaction.subjectEventId, reaction);
  }

  async handle(event: ReactionEvent) {
    let authorId = ID(event.pubkey);

    // Ignore events from profiles that are blocked
    if (blockManager.isBlocked(authorId)) return;


    let reaction = this.#getReactionByEvent(event);
    if(!reaction) return;

    // let p = reverseTags.find((tag) => tag[0] === 'p'); // Subject Event owner pubkey
    // Notify the profile if its me!?

    this.metrics.Handle++;

    this.addValue(reaction);

    event.meta = reaction; // Meta property is never saved to Database  

    this.onEvent.dispatch(reaction.subjectEventId, reaction);

    // Only save the event if the profile is followed by our WoT
    if (followManager.isAllowed(authorId)) {
      let record = {
        id: event.id,
        eventId: STR(reaction.subjectEventId),
        profileId: event.pubkey,
        value: reaction.value,
        created_at: event.created_at,
      } as ReactionRecord;

      this.save(record);
    }
  }

  addValue(reaction: Reaction) {
    const { id: eventId, subjectEventId: subjectId, authorId, value } = reaction;
    let likes = this.#getLikes(subjectId);
    let downVotes = this.#getDownVotes(subjectId);
    let authorMap = this.getAuthor(authorId);

    authorMap?.set(eventId, reaction);

    if (reaction.value == 1) {
      likes.add(authorId);
      downVotes.delete(authorId);
    } else if (value == -1) {
      likes.delete(authorId);
      downVotes.add(authorId);
    } else {
      // No votes given, remove any existing votes
      likes.delete(authorId);
      downVotes.delete(authorId);
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

  #parseTags(event: Event) {
    let reverseTags = event.tags.reverse();
    let eTag = reverseTags.find((tag) => tag[0] === 'e'); // Subject Event ID
    let pTag = reverseTags.find((tag) => tag[0] === 'p'); // Subject Event owner pubkey
    let e = eTag ? eTag[1] : undefined;
    let p = pTag ? pTag[1] : undefined;
    return {e, p};
  }

  #getReactionByEvent(event: Event) : Reaction | undefined {
    let {e, p} = this.#parseTags(event);
    if(!e) return;

    let value = isLike(event.content) ? 1 : isDownvote(event.content) ? -1 : 0;

    let reaction = {
      id: ID(event.id),
      subjectEventId: ID(e),
      subjectAuthorId: (p) ? ID(p) : undefined,
      authorId: ID(event.pubkey),
      value,
      created_at: event.created_at,
    } as Reaction;

    return reaction;
  }

  async load() {
    let records = await this.table.toArray();
    this.metrics.Loaded = records.length;

    let deltaDelete: Array<string> = [];

    for (let record of records) {

      let reaction = {
        id: ID(record.id),
        subjectEventId: ID(record.eventId),
        authorId: ID(record.profileId),
        value: record.value,
        created_at: record.created_at,
      } as Reaction;

      eventManager.addSeen(reaction.id); // No need to handle this event again from Relays

      if (followManager.isAllowed(reaction.authorId)) {
        this.addValue(reaction);
      } else {
        deltaDelete.push(record.id);
      }
    }

    // Remove reactions from profiles that are not followed
    if (deltaDelete.length > 0) {
      await storage.reactions.bulkDelete(deltaDelete);
    }
  }

  save(record: ReactionRecord) {
    this.table.save(ID(record.id), record);
  }

  #relayCallback(event: Event) {
    reactionManager.handle(event);
  }

  getAuthor(authorId: UID, create = true): ReactionMap | undefined {
    let map = this.authors.get(authorId);
    if (!map && create  ) {
      map = new SortedMap<UID, Reaction>([], sortCreated_at) as ReactionMap;
      this.authors.set(authorId, map);
    }
    return map;

  }



  subscribeRelays(eventId: UID, since: number = 0, limit: number = 1000) {
    let options = {
      filter: {
        '#e': [STR(eventId)],
        kinds: [ReactionKind],
      },
    } as FeedOption;

    return relaySubscription.map(options);
  }



  getEvent(reaction: Reaction) : Event | undefined {
    let event = this.createEvent(STR(reaction.subjectEventId), STR(reaction.subjectAuthorId), reaction.value, reaction.created_at, false);

    event.id = STR(reaction.id) as string;
    event.created_at = reaction.created_at;
    event.pubkey = STR(reaction.authorId) as string;

    return event as Event;
  }

  createEvent(
    subjectEventId: string | undefined,
    subjectAuthorPubKey?: string | undefined,
    value: number = 1,
    time = getNostrTime(),
    sign = true
  ): Event {
    let content = value == 1 ? '+' : value == -1 ? '-' : '';

    const event = {
      kind: ReactionKind,
      content,
      created_at: time,
      tags: [
        ['e', subjectEventId], // 
        ['p', subjectAuthorPubKey], // Profile ID
      ],
    } as Event;

    if (sign)
      serverManager.sign(event);

    return event;
  }



  getMetrics() {
    this.metrics.TotalMemory = this.likes.size + this.downVotes.size;

    return this.metrics;
  }
}

const reactionManager = new ReactionManager();
export default reactionManager;
