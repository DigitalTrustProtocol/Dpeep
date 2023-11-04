import { Event } from 'nostr-tools';
import { ID, UID } from '@/utils/UniqueIds';

export enum NoteSubtype {
  Note = 1,
  Reply = 2,
  Repost = 3,
  Highlight = 4,
  longForm = 5,
}


export type EventContainer = {
  id: UID; // the id of the event in number format
  kind: number; // the kind of the event
  event?: Event; // the event itself
  relay?: string; // the relay that sent this event
  authorId?: UID; // the author of the event
}

// DisplayEvent is an note event

export type NoteContainer = EventContainer & {
  subtype?: number;
}

export type ResolvedContainer = EventContainer & {
  resolved?: boolean;
}


export type ReplyContainer = NoteContainer & {
  rootId?: UID;
  rootRelay?: string;
  repliedTo?: UID;
  repliedToRelay?: string;
  involved?: Set<UID>;
  thread?: boolean; // whether this event is the root of a thread
}

export type RepostContainer = NoteContainer & {
  repostOf?: UID;
  repostRelay?: string;
}

export type ReactionContainer = EventContainer & {
  subjectEventId: UID;
  subjectAuthorId?: UID;
  value: number;
}

export type HighlightContainer = NoteContainer & {
  title?: string;
  alt?: string;
  context?: string;
  a?: string;
  soureUrl?: string;
  relays?: string[];
}

// NIP-23
// Should be a subtype of NoteContainer
// Have a dedicated page for viewing long form content
// Replaceable event 
export type LongFormContainer = NoteContainer & { 
  title?: string;
  summary?: string;
  image?: string;
  published_at?: number;
}

// {
//   "kind": 30023,
//   "created_at": 1675642635,
//   "content": "Lorem [ipsum][nostr:nevent1qqst8cujky046negxgwwm5ynqwn53t8aqjr6afd8g59nfqwxpdhylpcpzamhxue69uhhyetvv9ujuetcv9khqmr99e3k7mg8arnc9] dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.\n\nRead more at nostr:naddr1qqzkjurnw4ksz9thwden5te0wfjkccte9ehx7um5wghx7un8qgs2d90kkcq3nk2jry62dyf50k0h36rhpdtd594my40w9pkal876jxgrqsqqqa28pccpzu.",
//   "tags": [
//     ["d", "lorem-ipsum"],
//     ["title", "Lorem Ipsum"],
//     ["published_at", "1296962229"],
//     ["t", "placeholder"],
//     ["e", "b3e392b11f5d4f28321cedd09303a748acfd0487aea5a7450b3481c60b6e4f87", "wss://relay.example.com"],
//     ["a", "30023:a695f6b60119d9521934a691347d9f78e8770b56da16bb255ee286ddf9fda919:ipsum", "wss://relay.nostr.org"]
//   ],
//   "pubkey": "...",
//   "id": "..."
// }


export type ZapContainer = EventContainer & {
  targetId?: UID;
  zapperId?: UID;
}
