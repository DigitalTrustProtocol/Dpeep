import { ID, STR, UID } from '@/utils/UniqueIds';
import { Event, Filter } from 'nostr-tools';
import Key from '@/nostr/Key';
import { ContactsKind, FeedOption, OnEvent } from './network/provider/';
import { getNostrTime } from './Utils';
import localState from '@/state/LocalState';
import EventCallbacks from './model/EventCallbacks';
import profileManager from './ProfileManager';
import storage from './Storage';
import graphNetwork from './GraphNetwork';
import { EventParser, PTagContact } from './Utils/EventParser';
import blockManager from './BlockManager';
import relaySubscription from './network/RelaySubscription';
import { EPOCH } from './Utils/Nostr';
import { BulkStorage } from './network/BulkStorage';
import { Url } from './network/Url';
import serverManager, { PublicRelaySettings } from './ServerManager';

//const FOLLOW_STORE_KEY = 'myFollowList';
const DegreeInfinit = 99;


export class AuthorFollowNetwork {
  id: UID = 0; // Author id
  follows: Set<UID> = new Set();
  followedBy: Set<UID> = new Set();
  degree: number = DegreeInfinit; // Degree of following
  timestamp: number = 0; // Last time we received an event from this profile
  pubsubRegistered: boolean = false; // True if we have registered for nostr pubsub events from this profile
  relays = new Map<string, PublicRelaySettings>();
}

class FollowManager {
  logging = false;
  filterEnabled = true;
  followSuggestionsSetting = undefined;

  network = new Map<UID, AuthorFollowNetwork>();
  //relayAuthors = new Map<string, Set<UID>>();

  onEvent = new EventCallbacks(); // Callbacks to call when the follower change

  #table = new BulkStorage(storage.follows);

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
    Authors: 0,
    UICallbacks: 0,
    // SubscribeQueue: 0,
    // UnsubscribeQueue: 0,
    SubscribedToRelays: 0,
  };

  isFollowedByMe(profileId: UID): boolean {
    return followManager.isFollowedBy(profileId);
  }

  isFollowingMe(profileId: UID): boolean {
    return followManager.isFollowedBy(ID(Key.getPubKey()), profileId);
  }

  isFollowedBy(authorId: UID, byId = ID(Key.getPubKey())): boolean {
    return followManager.network?.get(authorId)?.followedBy?.has(byId) || false;
  }

  isFollowed(profileId: UID): boolean {
    return !!followManager.network?.get(profileId)?.followedBy?.size;
  }

  isFollowing(authorId: UID, byId = ID(Key.getPubKey())): boolean {
    return followManager.network?.get(byId)?.follows?.has(authorId) || false;
  }

  isAllowed(authorId: UID): boolean {
    if (!this.filterEnabled) return true; // No filter, so all authors are allowed
    if (graphNetwork.isTrusted(authorId)) return true; // Author is trusted, so it is allowed
    if (this.isFollowing(authorId)) return true; // Author is followed, so it is allowed
    return false;
  }

  handle(event: Event) {
    let authorId = ID(event.pubkey);
    let myId = ID(Key.getPubKey());

    // Ignore events from profiles that are blocked
    if (blockManager.isBlocked(authorId)) return;

    let item = this.getFollowNetwork(authorId);
    if (event.created_at <= (item.timestamp || 0)) {
      // Ignore old events
      // Replaypool promised to not send old events, but they do.
      // This is a check and should never happen and code is to be removed
      //console.error('Handling following event that is older than a previous one!!!!', event);
      return;
    }

    item.degree = this.getDegree(authorId, myId);

    let metadata = this.addEvent(event, item);

    // This is async
    if (item.degree < this.filterDegree) {
      // Only save events from profiles that are followed or trusted
      this.#eventEffects(item, metadata);
      this.save(event);
    }

    this.onEvent.dispatch(authorId, item);
  }

  #getPetNames(metadata: any | undefined) {
    let pTags = metadata?.pTags;
    let names =
      pTags
        ?.filter((tag) => tag.petName)
        .map((tag) => {
          return { id: tag.id, name: tag.petName };
        }) || [];
    return names;
  }

  addEvent(event: Event, item: AuthorFollowNetwork): any | undefined {
    let metadata = this.parseEvent(event);
    if (metadata.pTags.length === 0) return undefined;

    let pKeys = metadata.pTags.map((tag) => tag.id);
    let pKeySet = new Set<UID>(pKeys);

    let authorId = metadata.authorId;

    let follows = item.follows;

    let deltaAdd = pKeys.filter((id) => !follows.has(id));
    let deltaDelete = [...follows].filter((id) => !pKeySet.has(id));

    let childDegree = item.degree < this.filterDegree ? item.degree + 1 : DegreeInfinit;

    for (const id of deltaAdd) {
      let item = this.getFollowNetwork(id, childDegree);
      this.addFollower(item, authorId);
      //if (this.#possibleSubscription(item)) this.subsQueue.add(item.id);
    }

    for (const id of deltaDelete) {
      let item = this.getFollowNetwork(id);
      this.removeFollower(item, authorId);
      //if (this.#possibleUnsubscription(item)) this.unsubQueue.add(item.id);
    }

    item.relays = this.#getUrlsFromFollowEvent(event);

    this.#addRelays(authorId, item.relays);

    item.timestamp = event.created_at;

    return metadata;
  }

  #getUrlsFromFollowEvent(event: Event): Map<string, PublicRelaySettings> {
    const urls = new Map<string, PublicRelaySettings>();
    if (!event.content) return urls;

    try {
      const content = JSON.parse(event.content);
      for (const url in content) {
        const parsed = Url.sanitize(url);
        if (!parsed) continue;

        urls.set(parsed, content[url]);
      }
    } catch (e) {
      if (e instanceof SyntaxError) {
        // console.error('Contact event content is not valid JSON:', e.message);
        // Handle the error, e.g., by returning null or undefined
        // or by throwing a custom error
      }
    }
    return urls;
  }

  #addRelays(authorId: UID, relays: Map<string, PublicRelaySettings>) {
    for (const [url, settings] of relays) {
      serverManager.addRelay(authorId, url, settings);
    }
  }

  // #addRelay(url: string, authorId: UID) {
  //   let relay = this.relayAuthors.get(url);
  //   if(!relay) {
  //     relay = new Set<UID>();
  //     this.relayAuthors.set(url, relay);
  //   }
  //   relay.add(authorId);
  // }

  parseEvent(event: Event) {
    let { p } = EventParser.parseTagsArrays(event);

    let metadata = {
      id: ID(event.id),
      authorId: ID(event.pubkey),
      pTags: p.map(PTagContact.parse).filter((tag) => tag.valid), // Parse p tags and filter out invalid tags
    };
    return metadata;
  }

  getFollowNetwork(authorId: UID, degree = DegreeInfinit): AuthorFollowNetwork {
    let item = this.network.get(authorId);
    if (!item) {
      item = new AuthorFollowNetwork();
      item.id = authorId;
      item.degree = degree;
      this.network.set(authorId, item);
    }
    return item;
  }

  #eventEffects(item: AuthorFollowNetwork, metadata: any | undefined) {
    let myId = ID(Key.getPubKey());

    if (myId === item.id) {
      let urls = metadata.pTags
        .filter((tag) => tag.valid && tag.relayUrl)
        .map((tag) => tag.relayUrl);

      this.updateFollowSuggestionsSetting();
    }

    // Set pet names
    profileManager.setPetNames(item.id, this.#getPetNames(metadata)); // Update pet names from the p tags
  }

  follow(profiles: Array<UID>, byId = ID(Key.getPubKey())) {
    for (const profileId of profiles) {
      let item = this.getFollowNetwork(profileId);
      this.addFollower(item, byId);
    }

    this.onEvent.dispatch(byId, this.getFollowNetwork(byId));
  }

  unfollow(profiles: Array<UID> | Set<UID>, byId = ID(Key.getPubKey())) {
    for (const profileId of profiles) {
      let item = this.getFollowNetwork(profileId);
      this.removeFollower(item, byId);
    }
  }

  publish() {
    let event = this.createEvent();

    this.save(event);

    serverManager.publish(event);
  }

  addFollower(target: AuthorFollowNetwork, followerId: UID): void {
    target.followedBy.add(followerId);

    let source = this.getFollowNetwork(followerId);
    source.follows.add(target.id);
  }

  removeFollower(target: AuthorFollowNetwork, followerId: UID): void {
    let followedBy = target.followedBy;
    followedBy.delete(followerId);

    let source = this.getFollowNetwork(followerId);
    source.follows.delete(target.id);
  }

  save(event: Event) {
    this.#table.save(event.id, event);
  }

  // The load system supports multiple degrees of following
  // startId is the profile from which in focus of loading
  async load(myId: UID = ID(Key.getPubKey())) {
    this.loadLegacy();

    // Need to load my own event first, so we can set the follow list
    let myEvent = await storage.follows.get(STR(myId) as string); // Load of my own follow event
    if (myEvent) this.#loadEvent(myId, myEvent); // Load my own follow event

    let list = await storage.follows.toArray(); // Very fast load of all follow events

    let deltaDelete: Array<string> = [];

    let myPubkey = STR(myId);
    for (const event of list) {
      if (event.pubkey === myPubkey) continue; // Skip my own event, since we already loaded it
      let loaded = this.#loadEvent(myId, event);

      if (!loaded) deltaDelete.push(event.pubkey);
    }

    // Delete events that are not trusted or followed
    if (deltaDelete.length > 0) await storage.follows.bulkDelete(deltaDelete);
  }

  #loadEvent(myId: UID, event: Event): boolean {
    let authorId = ID(event.pubkey);
    let item = this.network.get(authorId); // Get the item if it exists
    if (item && item.timestamp >= event.created_at) return true; // Ignore already loaded events

    let degree = this.getDegree(authorId, myId);
    if (degree >= this.filterDegree) return false; // Ignore events from profiles that are not trusted or followed

    if (!item) item = this.getFollowNetwork(authorId, degree); // Create a new item if it does not exist

    this.addEvent(event, item);

    return true;
  }

  getDegree(authorId: UID, myId: UID): number {
    if (authorId == myId) return 0;
    if (this.isFollowing(authorId, myId)) return 1;
    if (graphNetwork.isTrusted(authorId)) return 1;
    return DegreeInfinit;
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

  createEvent(): Event {
    let myId = ID(Key.getPubKey());
    let item = this.getFollowNetwork(myId);

    // Add pet names to p tags
    let pTags = [...item.follows].map((id) => ['p', STR(id), '']);

    const relaysObj: any = {};


    let myRelays = serverManager.ensureAuthorRelays(myId);

    for (const [url, settings] of myRelays) {
      relaysObj[url] = { read: settings.read, write: settings.write };
    }
    const content = JSON.stringify(relaysObj);

    const event = {
      kind: ContactsKind,
      content,
      created_at: getNostrTime(),
      tags: [...pTags],
    } as Event;

    serverManager.sign(event);

    return event;
  }

  // dispatchAll() {
  //   for (const id of this.onEvent.keys()) {
  //     this.onEvent.dispatch(id, this.isFollowed(id));
  //   }
  // }

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

    let item = this.getFollowNetwork(ID(Key.getPubKey()));
    if (item.follows.size < 10) return; // Keep showing the suggestions

    localState.get('showFollowSuggestions').put(false);
  }

  subscribeFollowsMap() {
    let authors = followManager.getFollows(ID(Key.getPubKey()));

    this.metrics.SubscribedToRelays += authors.size;

    profileManager.mapProfiles(authors);
  }

  async subscribeFollowsOnce(since?: number, until?: number) {
    let authors = followManager.getFollows(ID(Key.getPubKey()));
    this.metrics.SubscribedToRelays += authors.size;
    await this.subscribeOnce(authors, since, until);
  }

  async subscribeOnce(authors: Array<UID> | Set<UID>, since = EPOCH, until = getNostrTime()) {
    await relaySubscription.onceAuthors(authors, since, until);
  }

  relayContactsRequests = new Set<UID>();

  onceContacts(id: UID): void {
    if (this.relayContactsRequests.has(id)) return; // Already requested
    this.relayContactsRequests.add(id);

    let opt = {
      filter: { kinds: [ContactsKind], authors: [STR(id) as string] } as Filter,
      onClose: () => this.relayContactsRequests.delete(id),
    } as FeedOption;

    relaySubscription.getEvent(opt);
  }

  relayFollowedByRequests = new Set<UID>();

  mapFollowedBy(id: UID, onEvent?: OnEvent): number {
    if (this.relayFollowedByRequests.has(id)) return -1; // Already requested
    this.relayFollowedByRequests.add(id);

    let opt = {
      filter: { kinds: [ContactsKind], '#p': [STR(id) as string] } as Filter,
      onClose: () => this.relayFollowedByRequests.delete(id),
      onEvent,
    } as FeedOption;

    return relaySubscription.map(opt);
  }

  getFollows(id: UID = ID(Key.getPubKey())): Set<UID> {
    let item = this.getFollowNetwork(id);

    return item.follows;
  }

  getFollowedBy(id: UID = ID(Key.getPubKey())): Set<UID> {
    return this.getFollowNetwork(id).followedBy;
  }

  async tableCount() {
    return await storage.follows.count();
  }

  getMetrics(): any {
    this.tableCount().then((count) => {
      this.metrics.TableCount = count;
    });

    this.metrics.Authors = this.network.size;
    this.metrics.UICallbacks = this.onEvent.sizeAll();

    return this.metrics;
  }
}

const followManager = new FollowManager();
export default followManager;
