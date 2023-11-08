import { EventContainer } from "@/dwotr/model/ContainerTypes";
import { UID } from "@/utils/UniqueIds";
import {Filter, Event} from "nostr-tools";
import { EntityType } from '../model/Graph';
import { getNostrTime } from '../Utils';

export type ProviderStatus = 'idle' | 'loading' | 'waiting' | 'error';

export interface Cursor<T> {
  isDone(): boolean;
  hasNew(): boolean;
  next(): Promise<T | undefined>;
  reset(): void;
  mount(): void;
  unmount(): void;
  preLoad(): T[];
}

export interface DataProviderEvents<T> {
  //onNewData?: (data: T[]) => void;
  onDataLoaded?: (data: T[]) => void;
  onDataResolved?: (data: T[]) => void;
  onStatusChanged?: (status: ProviderStatus) => void;
  onError?: (error: any) => void;
}


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
export const highlightKind: number = 9802; // Text
export const RelayListKind: number = 10002; // RelayList
export const ClientAuthKind: number = 22242; // ClientAuth
export const HttpAuthKind: number = 27235; // HttpAuth
export const ProfileBadgeKind: number = 30008; // ProfileBadge
export const BadgeDefinitionKind: number = 30009; // BadgeDefinition
export const ArticleKind: number = 30023; // Article
export const FileMetadataKind: number = 1063; // FileMetadata

export const StreamKinds = [
  TextKind,
  RepostKind,
  ReactionKind,
  ReportKind,
  ZapKind,
  EventDeletionKind,
];
export const ReplaceableKinds = [MetadataKind, ContactsKind, ZapRequestKind, RelayListKind, Trust1Kind];

export const DisplayKinds = [TextKind,RepostKind];

export type OnEvent = (event: Event, afterEose: boolean, url: string | undefined) => void;

export type OnEventCallback = (event: Event, afterEose: boolean, url: string | undefined) => void;
export type EventCallback = (event: Event) => void;
export type Unsubscribe = () => void;
export type OnEose = (allEosed: boolean, relayUrl: string, minCreatedAt: number) => void;
export type OnClose = (subId: number) => void;
export type OnDone = (subId: number) => void;

export type FeedOption = {
  id?: string;
  name?: string;
  user?: UID;
  eventId?: UID;
  size?: number;
  filter: Filter;
  relays?: string[];
  includeReposts?: boolean;
  includeReplies?: boolean;
  showReplies?: number;
  eoseSubTimeout?: number;
  filterFn?: (event: Event) => boolean;
  postFilter?: (container: EventContainer) => boolean;
  onEvent?: OnEvent;
  onEose?: OnEose;
  onClose?: OnClose;
  onDone?: OnDone;
  maxDelayms?: number;
  eventProps?: any;
  mergeReposts?: boolean;
  source?: 'network' | 'memory' | undefined;
  cursor?: any;
};

export interface EntityItem {
  pubkey: string;
  entityType: EntityType;
}
