import { Event, Filter, getEventHash, getSignature } from 'nostr-tools';
import PubSub from '../../nostr/PubSub';
import Relays from '../../nostr/Relays';
import { EntityType } from '../model/Graph';
import Key from '../../nostr/Key';
import getRelayPool from '@/nostr/relayPool';
import eventManager from '../EventManager';
import { STR, UID } from '@/utils/UniqueIds';
import { getNostrTime } from '../Utils';


// Wot Custom
export const Trust1Kind: number = 32010;
export const MuteKind: number = 10000;
export const BlockKind: number = 16462;
export const FlagKind: number = 16463;

// Nostr
export const MetadataKind: number = 0; // Metadata
export const TextKind: number = 1; // Text
export const RecommendRelayKind: number = 2; // RecommendRelay
export const ContactsKind: number = 3; // Contacts
export const EncryptedDirectMessageKind: number = 4; // EncryptedDirectMessage
export const EventDeletionKind: number = 5; // EventDeletion
export const RepostKind: number = 6; // Repost
export const ReactionKind: number = 7; // Like
export const BadgeAwardKind: number = 8; // BadgeAward
export const ChannelCreationKind: number = 40; // ChannelCreation
export const ChannelMetadataKind: number = 41; // ChannelMetadata
export const ChannelMessageKind: number = 42; // ChannelMessage
export const ChannelHideMessageKind: number = 43; // ChannelHideMessage
export const ChannelMuteUserKind: number = 44; // ChannelMuteUser
export const BlankKind: number = 255; // Blank
export const ReportKind: number = 1984; // Report
export const ZapRequestKind: number = 9734; // ZapRequest
export const ZapKind: number = 9735; // Zap
export const RelayListKind: number = 10002; // RelayList
export const ClientAuthKind: number = 22242; // ClientAuth
export const HttpAuthKind: number = 27235; // HttpAuth
export const ProfileBadgeKind: number = 30008; // ProfileBadge
export const BadgeDefinitionKind: number = 30009; // BadgeDefinition
export const ArticleKind: number = 30023; // Article
export const FileMetadataKind: number = 1063; // FileMetadata

export interface EntityItem {
  pubkey: string;
  entityType: EntityType;
}

type NostrKind = number;

// Subscribe to trust events, mutes, blocks, etc

// Subscribe to trusted entities = every kind
// Subscribe to followed entities = every kind

// Temporarily subscribe to
// 3rd Profiles :
// - Followers / following = kind 3
// - Ignore kind: Trust1, mutes, blocks, flags, etc

// Notes:
// - likes, comments, zaps.

export const StreamKinds = [
  TextKind,
  RepostKind,
  ReactionKind,
  ReportKind,
  ZapKind,
  EventDeletionKind,
];
export const ReplaceableKinds = [MetadataKind, ContactsKind, ZapRequestKind, RelayListKind, Trust1Kind];

export type OnEvent = (event: Event, afterEose: boolean, url: string | undefined) => void;

export type OnEventCallback = (event: Event, afterEose: boolean, url: string | undefined) => void;
export type EventCallback = (event: Event) => void;
export type Unsubscribe = () => void;
export type OnEoseCallback = (allEosed: boolean, relayUrl: string, minCreatedAt: number) => void;

export type FeedOptions = {
  id?: string;
  name?: string;
  filter: Filter;
  filterFn?: (event: Event) => boolean;
  onEvent?: OnEvent;
  onEose?: OnEoseCallback;
  onClose?: (subId: number) => void;
  onDone?: (subId: number) => void;
  maxDelayms?: number;
  eventProps?: any;
  mergeReposts?: boolean;
};

class WOTPubSub {
  // The idea is that we are only interested in events that are less than 2 weeks old, per default.
  // Fetching older events can be done by request etc.
  // FlowSince applies primarily to FlowKinds. With StaticKinds we are interested in all events, as they are few.
  flowSince = getNostrTime() - 60 * 60 * 24 * 14; // 2 weeks ago, TODO: make this configurable

  subscriptionId = 0;
  unsubs = new Map<number, any>();

  subscribedAuthors = new Set<UID>();

  metrics = {
    Count: 0,
    SubscribedAuthors: 0,
    Subscriptions: 0,
    Callbacks: 0,
    Profiles: 0,
    NoteEvents: 0,
    ContactEvents: 0,
    ReactionEvents: 0,
    TrustEvents: 0,
  };

  // Gets an event
  getEvent(evnetId: UID, cb?: OnEvent, delay: number = 0) {
    return;
    let callback = (event: Event, afterEose: boolean, url: string | undefined) => {
      unSub?.();
      eventManager.eventCallback(event);
      if (cb) cb(event, afterEose, url);
    };

    let unSub = this.subscribeFilter(
      [{ ids: [STR(evnetId)], kinds: [1, 6], limit: 1 }],
      callback,
      delay,
    );
  }

  getAuthorEvent(authorId: UID, kinds: Array<number> = [0], cb?: OnEvent, delay: number = 0) {
    return;
    let callback = (event: Event, afterEose: boolean, url: string | undefined) => {
      unSub?.();
      eventManager.eventCallback(event);
      if (cb) cb(event, afterEose, url);
    };

    let unSub = this.subscribeFilter(
      [{ authors: [STR(authorId)], kinds, limit: 1 }],
      callback,
      delay,
    );
  }

  updateRelays(urls: Array<string> | undefined) {
    if (!urls) return;
  }

  // Do we need to break up hugh subscriptions into smaller ones? YES
  subscribeAuthors(authorIDs: Set<UID> | Array<UID>) {
    let authors: Array<string> = [];

    for (let id of authorIDs) {
      if (this.subscribedAuthors.has(id)) continue;
      this.subscribedAuthors.add(id);
      authors.push(STR(id));
    }

    if (authors.length === 0) return;

    // Batch authors into 1000 chunks, so subscribe can handle it
    let batchs = this.batchArray(authors, 10);

    for (let batch of batchs) {
      let filters = [
        {
          authors: batch,
          kinds: StreamKinds,
          since: this.flowSince,
        },
        {
          authors: batch,
          kinds: ReplaceableKinds,
          since: 0,
        },
      ] as Array<Filter>;

      // Need to delay the subscribe, otherwise relayPool may merge all the subscriptions into one. (I believe)
      setTimeout(() => {
        let r = this.subscribeFilter(filters, eventManager.eventCallback);
        this.subscriptionId++;
        this.unsubs.set(this.subscriptionId, r);
      }, 0);
    }
  }

  // Do we need to break up hugh subscriptions into smaller ones? YES
  async ReplaceableEventsOnce(
    ids: Array<string>,
    authors: Array<string>,
    kinds: Array<number> = [0],
    cb?: EventCallback,
  ): Promise<boolean> {
    let filters = [
      {
        //ids,
        authors,
        kinds,
      } as Filter,
    ];

    let relays = this.getRelays(filters);

    let promise = new Promise<boolean>((resolve, reject) => {
      
      let tries = 0;
      let authorsRest = new Set<string>(authors);
      let idsRest = new Set<string>(ids);

      const onEvent = (event: Event) => {
        console.log('ReplaceableEventsOnce', idsRest?.size, authorsRest?.size);
        eventManager.eventCallback(event);
        cb?.(event);
        idsRest?.delete(event.id);
        authorsRest?.delete(event.pubkey);
        if (!!idsRest?.size && !!authorsRest?.size) resolve?.(true);
      };

      const onEose = (relayUrl: string) => {
        console.log('ReplaceableEventsOnce.onEose', relayUrl, tries, relays);
        // if (idsRest.size === 0 && authorsRest.size === 0) { // DO we need this?
        //   resolve(true);
        //   return;
        // }

        if (relays.includes(relayUrl)) {
          tries++;
        }

        if (tries === relays.length) {
          resolve(false);
          //reject(new Error(`Failed to fetch events for ${idsRest.size} IDs and ${authorsRest.size} authors`));
        }
      }

      getRelayPool().subscribe(
        filters,
        relays,
        onEvent,
        undefined,
        onEose,
        {
          allowDuplicateEvents: false,
          allowOlderEvents: false,
          logAllEvents: false,
          unsubscribeOnEose: true,
          //dontSendOtherFilters: true,
          //defaultRelays: string[]
        },
      );
    });
    return promise;
  }

  unsubscribeFlow(authorIDs: Set<UID> | Array<UID>) {
    // TODO: unsubscribe authors, currently its unknown how to do this effectly without unsubscribing all authors
    // workaround: unsubscribe all authors and subscribe again with the same authors
    // Or subscribe each author individually and keep track of the subscriptions, but this is not optimal and the number of subscriptions can be huge
  }

  batchArray(arr: Array<any>, batchSize: number = 1000) {
    const batchedArr: Array<any> = [];

    for (let i = 0; i < arr.length; i += batchSize) {
      batchedArr.push(arr.slice(i, i + batchSize));
    }

    return batchedArr;
  }

  subscribeFilter(
    filters: Array<Filter>,
    cb: OnEvent = eventManager.eventCallback,
    delay = 0,
  ): Unsubscribe {
    let relays = this.getRelays(filters);

    const unsub = getRelayPool().subscribe(
      filters,
      relays,
      (event: Event, afterEose: boolean, url: string | undefined) => {
        setTimeout(() => {
          this.metrics.Callbacks++;
          this.metrics.Profiles += event.kind === MetadataKind ? 1 : 0;
          this.metrics.NoteEvents += event.kind === TextKind ? 1 : 0;
          this.metrics.ContactEvents += event.kind === ContactsKind ? 1 : 0;
          this.metrics.ReactionEvents += event.kind === ReactionKind ? 1 : 0;
          this.metrics.TrustEvents += event.kind === Trust1Kind ? 1 : 0;

          cb?.(event, afterEose, url);
        }, 0);
      },
      delay,
      undefined,
      {
        // Options
        // enabled relays
        defaultRelays: Relays.enabledRelays(),
      },
    );

    return unsub;
  }


  // Available functions in RelayPool
  // --------------------------------
  // RelayPool::publish(event: Event, relays: string[])

  // RelayPool::onnotice(cb: (url: string, msg: string) => void)

  // RelayPool::onerror(cb: (url: string, msg: string) => void)

  // RelayPool::setWriteRelaysForPubKey(pubkey: string, writeRelays: string[])

  // RelayPool::subscribeReferencedEvents(
  //     event: Event,
  //     onEvent: OnEvent,
  //     maxDelayms?: number,
  //     onEose?: OnEose,
  //     options: SubscriptionOptions = {}
  //   ): () => void

  // RelayPool::fetchAndCacheMetadata(pubkey: string): Promise<Event>

  // RelayPool::subscribeReferencedEventsAndPrefetchMetadata(
  //     event: Event,
  //     onEvent: OnEvent,
  //     maxDelayms?: number,
  //     onEose?: OnEose,
  //     options: SubscriptionOptions = {}
  //   ): () => void

  // RelayPool::setCachedMetadata(pubkey: string, metadata: Event)

  getRelays(filters: Array<Filter> = []) {
    let relays = Relays.enabledRelays();
    if (filters.length > 0 && filters[0].search) {
      relays = Array.from(Relays.searchRelays.keys());
    }
    return relays;
  }

  publishTrust(
    entityPubkey: string,
    val: number,
    content: string | undefined,
    context: string | undefined,
    entityType: EntityType,
    timestamp?: number,
  ) {
    let event = eventManager.createTrustEvent(
      entityPubkey,
      val,
      content,
      context,
      entityType,
      timestamp,
    ) as Event;

    this.sign(event);

    console.log('Publishing trust event', event);

    PubSub.publish(event);
  }

  sign(event: Partial<Event>) {
    if (!event.sig) {
      if (!event.tags) {
        event.tags = [];
      }
      event.content = event.content || '';
      event.created_at = event.created_at || Math.floor(Date.now() / 1000);
      event.pubkey = Key.getPubKey();
      event.id = getEventHash(event as Event);
      event.sig = getSignature(event as Event, Key.getPrivKey());
    }
    if (!(event.id && event.sig)) {
      console.error('Invalid event', event);
      throw new Error('Invalid event');
    }
  }

  publish(event: Event | Partial<Event>) {
    getRelayPool().publish(event, Array.from(Relays.enabledRelays()));
  }

  getMetrics() {
    this.metrics.Count = Relays.enabledRelays().length;
    this.metrics.SubscribedAuthors = this.subscribedAuthors.size;
    this.metrics.Subscriptions = this.unsubs.size;

    return this.metrics;
  }
}

const wotPubSub = new WOTPubSub();

export default wotPubSub;
