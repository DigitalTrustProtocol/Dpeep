import { Event, getEventHash, getSignature } from 'nostr-tools';
import PubSub, { Unsubscribe } from '../../nostr/PubSub';
import Relays from '../../nostr/Relays';
import { EntityType } from '../model/Graph';
import Key from '../../nostr/Key';
import getRelayPool from '@/nostr/relayPool';
import eventManager from '../EventManager';
import { UID } from '@/utils/UniqueIds';
import { Trust } from '../components/Icons';

export type OnEvent = (event: Event, afterEose: boolean, url: string | undefined) => void;

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

export const FlowKinds = [TextKind, RepostKind, ReactionKind, ReportKind, ZapKind, Trust1Kind,  EventDeletionKind];
export const StaticKinds = [MetadataKind, ContactsKind, ZapRequestKind, RelayListKind]
  

class WOTPubSub {
  flowSince = (Date.now() / 1000) - (60 * 60 * 24 * 14); // 2 weeks ago, TODO: make this configurable

  unsubs = new Map<string, Set<string>>();

  subscribedAuthors = new Map<UID, Set<NostrKind>>();

  updateRelays(urls: Array<string> | undefined) {
    if (!urls) return;
  }



  // Subscribe to all events multiple of the same kind, for example all notes, likes, comments, zaps, etc
  // this class will handle all unsubscribes for this method call.
  subscribeFlow(
    authors: string[] | undefined,
    kinds = FlowKinds, // Default to all flow kinds
  ) {
    if (!authors) return;
    this.subscribeTrust(authors, this.flowSince, (event, afterEose, url) => {
      // TODO: handle unsubscribe
    }, kinds);
  }

  unsubscribeFlow(authors: string[] | undefined, kinds = FlowKinds) {
    if (!authors) return;
  }

  subscribeTrust(
    authors: string[] | undefined,
    since: number | undefined,
    cb: OnEvent,
    kinds = [Trust1Kind, MuteKind, BlockKind],
  ): Unsubscribe {
    let relays = Relays.enabledRelays();

    let filter = {
      kinds,
      authors,
      since,
    };

    const unsub = getRelayPool().subscribe(
      [filter],
      relays,
      (event: Event, afterEose: boolean, url: string | undefined) => {
        setTimeout(() => {
          cb(event, afterEose, url);
        }, 0);
      },
      0,
      undefined,
      {
        // Options
        // enabled relays
        defaultRelays: Relays.enabledRelays(),
      },
    );

    return unsub;
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
}

const wotPubSub = new WOTPubSub();

export default wotPubSub;
