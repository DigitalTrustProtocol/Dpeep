import { ID, STR, UID } from '@/utils/UniqueIds';
import { Event } from 'nostr-tools';
import Key from '@/nostr/Key';
import wotPubSub, { ContactsKind } from './network/WOTPubSub';
import { getNostrTime } from './Utils';
import localState from '@/state/LocalState';
import Subscriptions from './model/Subscriptions';
import profileManager from './ProfileManager';
import storage from './Storage';
import graphNetwork from './GraphNetwork';

//const FOLLOW_STORE_KEY = 'myFollowList';
const DegreeInfinit = 99;

interface Item {
  id: UID;
  following?: Set<UID>;
  followedBy?: Set<UID>;
  degree?: number; // Degree of following
  timestamp?: number; // Last time we received an event from this profile
  pubsubRegistered?: boolean; // True if we have registered for nostr pubsub events from this profile
}

class FollowManager {
  filterEnabled = true;
  followSuggestionsSetting = undefined;

  items = new Map<UID, Item>();

  UISubs = new Subscriptions(); // Callbacks to call when the follower change

  subsQueue = new Set<UID>(); // A queue of profiles to subscribe to
  unsubQueue = new Set<UID>(); // A queue of profiles to unsubscribe from

  // Filter:
  // Used to only allow events from profiles that is in the filter.
  // Source of profiles to base filter on:
  // Owner and owner's follow list
  // Trusted and trusted's follow list
  // Optional: Secondary's follow list based on the degree of following
  filterDegree: number = 2; // 0 = only owner, 1 = trusted, 2 = secondary, 3 = tertiary, etc Filtering events based on the degree of following
  followDegree: number = 0; // 0 = only owner, 1 = first degree, 2 = second degree, 3 = third degree, etc Following based on the degree of following

  metrics = {
    TableCount: 0,
    EventsLoaded: 0,
    ItemsLoaded: 0,
    ItemsTotal: 0,
    UISubs: 0,
    SubscribeQueue: 0,
    UnsubscribeQueue: 0,
  };

  isFollowedByMe(profileId: UID): boolean {
    return this.isFollowedBy(profileId);
  }

  isFollowedBy(profileId: UID, byId = ID(Key.getPubKey())): boolean {
    return this.items?.get(profileId)?.followedBy?.has(byId) || false;
  }

  isFollowed(profileId: UID): boolean {
    return !!this.items?.get(profileId)?.followedBy?.size;
  }

  async handle(event: Event) {
    let pubkeyId = ID(event.pubkey);
    let myId = ID(Key.getPubKey());
    let isMe = pubkeyId === myId;

    if (isMe) {
      console.log('My own contact event', event);
    }

    let item = this.#getItem(pubkeyId);
    if (event.created_at <= (item.timestamp || 0)) {
      // Ignore old events
      // Replaypool promised to not send old events, but they do.
      // This is a check and should never happen and code is to be removed
      console.error('Handling following event that is older than a previous one!!!!', event);
      return;
    }

    // Ignore events from profiles that are not in the filter or trusted
    if(!this.isFollowed(pubkeyId) && !isMe) {
      if(!graphNetwork.isTrusted(pubkeyId)) return; // Ignore events from profiles that are not in the filter or trusted

      item.degree = 1; // Trust is degree 1
    }

    if(item.degree === undefined || item.degree >= DegreeInfinit)
      item.degree = this.getDegree(item);

    if (!isMe || item.degree > this.filterDegree) return; // Ignore events from profiles that are not in the filter

    let pTags = this.addEvent(event, item);

    this.#eventEffects(item, pTags);

    this.updateNetwork(); // Update the network subscriptions based on the new event

    // This is async
    this.save(event);

    //this.dispatchAll();
  }

  updateNetwork() {
    // Possible throttle this function

    this.#updateSubscriptions();
    this.#updateUnsubscriptions();
  }

  #updateSubscriptions() {
    let list = this.subsQueue;
    list.forEach((id) => this.#getItem(id).pubsubRegistered = true);
    this.subsQueue = new Set();
    wotPubSub.subscribeAuthors(list);
  }

  #updateUnsubscriptions() {
    let list = this.unsubQueue;
    list.forEach((id) => this.#getItem(id).pubsubRegistered = false);
    this.unsubQueue = new Set();
    wotPubSub.unsubscribeFlow(list);
  }




  getDegree(item: Item): number {
    if(item.id == ID(Key.getPubKey())) return 0; // Owner is always degree 0

    if (item.degree && item.degree < DegreeInfinit) return item.degree;

    return this.#calculateDegree(item);
  }

  #calculateDegree(item: Item): number {
    let followedBy = this.#getFollowedBySet(item);

    let list = [...followedBy].map((id) => this.#getItem(id).degree || DegreeInfinit);

    let degree = Math.min(...list);

    return degree < this.filterDegree ? degree + 1 : DegreeInfinit;
  }

  #getUrls(pTags: Array<Array<string>> | undefined) {
    return pTags?.map((tag) => tag[2]).filter((url) => url) || []; // Get urls from p tags, check if they are valid urls
  }

  #getPetNames(pTags: Array<Array<string>> | undefined) {
    return (
      pTags
        ?.filter((tag) => tag[3]?.length >= 1)
        .map((tag) => {
          return { id: ID(tag[1]), name: tag[3] };
        }) || []
    ); // Get pet names from p tags,
  }

  addEvent(event: Event, item: Item): Array<Array<string>> | undefined {
    let pTags = event.tags?.filter((tag) => tag[0] === 'p').filter((tag) => tag[1]?.length == 64);
    if (!pTags) return undefined; // No p tags in this event

    let pKeys = pTags?.map((tag) => tag[1]);
    let pKeySet = new Set<UID>(pKeys.map(ID));

    let pubkeyId = ID(event.pubkey);

    let following = this.#getFollowingSet(item);

    let deltaAdd = pKeys.map(ID).filter((id) => !following.has(id));
    let deltaDelete = [...following].filter((id) => !pKeySet.has(id));

    let childDegree = item.degree ? item.degree + 1 : DegreeInfinit;

    for (const id of deltaAdd) {
      let item = this.#getItem(id, childDegree);
      this.addFollower(item, pubkeyId);
      if (this.#possibleSubscription(item)) this.subsQueue.add(item.id);
    }

    for (const id of deltaDelete) {
      let item = this.#getItem(id);
      this.removeFollower(item, pubkeyId);
      if (this.#possibleUnsubscription(item)) this.unsubQueue.add(item.id);
    }

    item.timestamp = event.created_at;

    return pTags;
  }

  #getItem(profileId: UID, degree = DegreeInfinit): Item {
    let item = this.items.get(profileId);
    if (!item) {
      item = { id: profileId, degree };

      this.items.set(profileId, item);
    }
    return item;
  }

  #eventEffects(item: Item, pTags: Array<Array<string>> | undefined) {
    let myId = ID(Key.getPubKey());

    if (myId === item.id) {
      wotPubSub.updateRelays(this.#getUrls(pTags)); // Update relays from the p tags

      this.updateFollowSuggestionsSetting();
    }
    // Set pet names
    profileManager.setPetNames(item.id, this.#getPetNames(pTags)); // Update pet names from the p tags
  }

  #possibleSubscription(item: Item) {
    if (item?.degree === undefined) return false;
    if (item?.degree > this.filterDegree) return false;
    if (item?.pubsubRegistered) return false;
    return true;
  }

  #possibleUnsubscription(item: Item) {
    if (!item?.pubsubRegistered) return false; // Do not unsubscribe if not subscribed
    if (item.followedBy?.size) return false; // Do not unsubscribe if item are followed by someone
    return true;
  }

  async onFollow(profileId: UID, isFollowed: boolean) {
    let myId = ID(Key.getPubKey());

    let item = this.#getItem(profileId);
    if (isFollowed) {
      this.addFollower(item, myId);
    } else {
      this.removeFollower(item, myId);
    }

    this.UISubs.dispatch(profileId, isFollowed);

    let event = await this.createEvent();
    this.save(event);
    wotPubSub.publish(event);
  }

  addFollower(target: Item, followerId: UID): void {
    let followedBy = this.#getFollowedBySet(target);
    followedBy.add(followerId);

    let source = this.#getItem(followerId);
    let following = this.#getFollowingSet(source);
    following.add(target.id);
  }

  removeFollower(target: Item, followerId: UID): void {
    let followedBy = this.#getFollowedBySet(target);
    followedBy.delete(followerId);

    let source = this.#getItem(followerId);
    let following = this.#getFollowingSet(source);
    following.delete(target.id);
  }

  #getFollowingSet(item: Item): Set<UID> {
    return item.following || (item.following = new Set());
  }

  #getFollowedBySet(item: Item): Set<UID> {
    return item.followedBy || (item.followedBy = new Set());
  }

  
  async save(event: Event | Partial<Event>) {
    //localState.get(FOLLOW_STORE_KEY).put(JSON.stringify(event));
    //IndexedDB.saveEvent(event as Event & { id: string });
    await storage.follows.put(event as Event & { id: string });
  }

  // The load system supports multiple degrees of following
  // startId is the profile from which in focus of loading
  async load(startId: UID = ID(Key.getPubKey())) {
    let list = await storage.follows.toArray(); // Very fast load of all follow events
    let events: Map<UID, Event> = new Map(list.map((event) => [ID(event.pubkey), event]));

    this.metrics.EventsLoaded = list.length;
    this.metrics.ItemsLoaded = this.items.size;

    this.getMetrics();

    // Always create an item for the owner
    let startItem = this.#getItem(startId, 0);

    this.loadLegacy();

    // Load my own following
    let myEvent = events.get(startId);
    if (myEvent) {
      // Add the Event to the following list
      this.#eventEffects(startItem, this.addEvent(myEvent, startItem));
      events.delete(startId);
    }

    if (this.filterDegree > 0) {
      this.#addTrustedEvents(events);
    }

    // The WOT is more than enough to load in followings, a minor graph can quickly become huge number of followings
    // if (this.filterDegree > 1) {
    //   this.#addSecondaryEvents(events);
    // }

    // Remove all remaining events from Storage, as they are not needed anymore
    if (events.size > 0) {
      await this.#removeRemainingEvents(events);
    }

  }

  loadLegacy() {
    localState.get('myFollowList').once((myFollowList) => {
      if (!myFollowList) {
        return;
      }
      try {
        const event = JSON.parse(myFollowList);
        if (event?.kind === 3) {
          this.handle(event);
        }
      } catch (e) {
        // ignore
      }
    });
  }


  #addTrustedEvents(events: Map<UID, Event>) {
    // Load all trusted followings
    for (const id of events.keys()) {
      if (!graphNetwork.isTrusted(id)) continue;

      let event = events.get(id) as Event;

      let item = this.#getItem(id);
      item.degree = 1;
      // Add the Event to the following list
      this.#eventEffects(item, this.addEvent(event, item));

      events.delete(id);
    }
  }

  #addSecondaryEvents(events: Map<UID, Event>, filterDegree = 2) {
    // Load all secondary followings
    let more = true; // Keep looping until we are done
    let degree = 1;

    while (events.size > 0 && more && degree < filterDegree) {
      more = false; // Assume we are done
      degree++; // Increase the degree

      for (const id of events.keys()) {
        if (!this.isFollowed(id)) continue; // We are not following this profile

        more = true; // We are not done, as we found a new profile to follow
        let event = events.get(id) as Event;

        let item = this.#getItem(id);
        item.degree = degree;
        // Add the Event to the following list
        this.#eventEffects(item, this.addEvent(event, item));
        events.delete(id);
      }
    }
  }

  async #removeRemainingEvents(events: Map<UID, Event>) {
    // Remove all remaining events from Storage, as they are not needed anymore
    let keys = [...events.keys()].map((id) => STR(id));
    await storage.follows.bulkDelete(keys);
  }

  async createEvent(): Promise<Partial<Event>> {
    let item = this.#getItem(ID(Key.getPubKey()));
    let following = this.#getFollowingSet(item);
    let pTags = [...following].map((id) => ['p', STR(id)]);

    const event = {
      kind: ContactsKind,
      content: '',
      created_at: getNostrTime(),
      tags: [...pTags],
    };
    return event;
  }

  dispatchAll() {
    for (const id of this.UISubs.keys()) {
      this.UISubs.dispatch(id, this.isFollowed(id));
    }
  }

  updateFollowSuggestionsSetting(): void {
    if (this.followSuggestionsSetting === true) {
      this.#setFollowSuggestionsSetting();
      return;
    }

    if (this.followSuggestionsSetting === undefined) {
      localState.get('showFollowSuggestions').once((val) => {
        this.followSuggestionsSetting = val;
        this.#setFollowSuggestionsSetting();
      });
    }
  }

  #setFollowSuggestionsSetting() {
    if (this.followSuggestionsSetting === false) return; // Keep hiding the suggestions

    let item = this.#getItem(ID(Key.getPubKey()));
    let following = this.#getFollowingSet(item);
    if (following.size < 10) return; // Keep showing the suggestions

    localState.get('showFollowSuggestions').put(false);
  }

  nostrSubscribeFollowers(id: UID) {
    let parentItem = this.#getItem(id);

    let subSet = new Set<UID>();
    let following = this.#getFollowingSet(parentItem);
    for(const id of following) {
        let item = this.#getItem(id);
        if(this.#possibleSubscription(item)) {
          item.pubsubRegistered = true;
          subSet.add(id);
          this.subsQueue.delete(id);
        }
    }

    wotPubSub.subscribeAuthors(subSet);
  }

  getFollowedUsers(id: UID = ID(Key.getPubKey())): Array<UID> {
    let item = this.#getItem(id);
    let following = this.#getFollowingSet(item);

    return [...following];
  }

  async tableCount() {
    return await storage.follows.count();
  }

  getMetrics() : any {

    this.tableCount().then((count) => {
      this.metrics.TableCount = count;
    });

    this.metrics.ItemsTotal = this.items.size;
    this.metrics.UISubs = this.UISubs.sizeAll();
    this.metrics.SubscribeQueue = this.subsQueue.size;
    this.metrics.UnsubscribeQueue = this.unsubQueue.size;


    return this.metrics;
  }


}

const followManager = new FollowManager();
export default followManager;
