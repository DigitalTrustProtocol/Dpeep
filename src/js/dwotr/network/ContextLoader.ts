import { Event } from 'nostr-tools';
import profileManager from '../ProfileManager';
import { getNostrTime } from '../Utils';
import { seconds } from 'hurdak';
import { ID, UID } from '@/utils/UniqueIds';
import relaySubscription from './RelaySubscription';
import { getRepostedEventId, isRepost } from '@/nostr/utils';
import noteManager from '../NoteManager';
import eventManager from '../EventManager';

export class ContextLoader {
  time10minute: number = seconds(10, 'minute');
  timeout = 9000;

  async loadDependencies(events: Array<Event>): Promise<void> {
    if (events.length == 0) return;
    // The number of events should not be more than between 10-50, so we can load all context in one go
    if (events.length > 50) throw new Error('Too many events to load context for');

    // Load
    // Profiles
    // Replies
    // Reactions
    // Zaps
    //let r = events.map(asDisplayEvent);

    let repostEvents = await this.loadReposts(events);

    let profileLookupEvents = events.concat(repostEvents);

    await this.loadProfiles(profileLookupEvents);
  }

  async loadProfiles(events: Array<Event>): Promise<boolean> {
    let authors = [
      ...new Set(events.filter((e) => this.getProfile(ID(e.pubkey))).map((e) => e.pubkey)).values(),
    ];

    console.log('loadProfiles dependencies', authors.length, authors);
    if (authors.length == 0) return true;

    return await relaySubscription.getEventsByAuthor(authors, [0], undefined, 1);
  }

  async loadReposts(events: Array<Event>): Promise<Array<Event>> {
    let items: Array<Event> = [];
    let ids = [
      ...new Set(
        events.filter((e) => isRepost(e)).map((e) => getRepostedEventId(e) as string),
      ).values(),
    ];
    if (!ids || ids.length == 0) return items;

    console.log('loadReposts dependencies', ids.length, ids);

    const cb = (e: Event) => {
      items.push(e);
    };

    await relaySubscription.getEventsById(ids, [1, 6], cb);
    return items;
  }

  // async loadEventsById(events: Array<Event>) : Promise<boolean> {
  //   if(events.length == 0) return true;
  //   let ids = events.map((e) => e.id);
  //   return await relaySubscription.getEventsById(ids, [1,6]);
  // }

  getProfile(authorId: UID): boolean {
    let time = getNostrTime() - this.time10minute;
    let profile = profileManager.getMemoryProfile(authorId);
    if (!profile.isDefault && profile.created_at > time) return false;

    return true;
  }

  //   // This is a cursor as well, therefore we can load the last 10-50 events
  //   loadReplies(events: Array<DisplayEvent>) {

  //     // getThreadRepliesCount(id: string, cb?: (threadReplyCount: number) => void): Unsubscribe {
  //     //     const callback = () => {
  //     //       cb?.(this.threadRepliesByMessageId.get(id)?.size ?? 0);
  //     //     };
  //     //     callback();
  //     //     return PubSub.subscribe({ '#e': [id], kinds: [1] }, callback, false);
  //     //   },

  //   }
}
