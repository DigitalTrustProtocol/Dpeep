import { Event } from 'nostr-tools';
import { ID, UID } from '@/utils/UniqueIds';

// export const asDisplayEvent = (event: Event): NoteEvent => ({
//   nId: ID(event.id),
//   authorId: ID(event.pubkey),

//   replies: [],
//   reactions: [],
//   zaps: [],
//   wot: undefined,
//   ...event,
// });

// export type AugEvent = Event & {
//   nId: UID;
//   authorId: UID;
// };

// export type Note = AugEvent & {
//   repostOf: UID | undefined;
//   replyTo: UID | undefined;
// };

// export type Repost = Note & {
//   repostOf: UID;
// };

// export type DisplayEvent = Event & {
//   nId: UID;
//   authorId: UID;
//   zaps: Event[];
//   replies: DisplayEvent[];
//   reactions: Event[];
//   wot?: any;
//   matchesFilter?: boolean;
// };

export type EventContainer = {
  id: UID; // the id of the event in number format
  kind: number; // the kind of the event
  event?: Event; // the event itself
  relayId?: number; // the relay that sent this event
  authorId?: UID; // the author of the event
}

// DisplayEvent is an note event

export type NoteContainer = EventContainer & {
  subtype?: number;
}

export type ReplyContainer = NoteContainer & {
  rootId?: UID;
  repliedTo?: UID;
  involved?: Set<UID>;
  thread?: boolean; // whether this event is the root of a thread
}

export type RepostContainer = NoteContainer & {
  repostOf?: UID;
}


export type ReactionContainer = EventContainer & {
  subjectEventId: UID;
  subjectAuthorId?: UID;
  value: number;
}


export type ZapContainer = EventContainer & {
  targetId?: UID;
  zapperId?: UID;
}
