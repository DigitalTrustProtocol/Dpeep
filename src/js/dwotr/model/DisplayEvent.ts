import { Event } from "nostr-tools";
import { ID, UID } from "@/utils/UniqueIds";

export const asDisplayEvent = (event: Event): DisplayEvent => ({
    nId: ID(event.id),
    authorId : ID(event.pubkey),

    replies: [],
    reactions: [],
    zaps: [],
    wot: undefined,
    ...event,
  })

  export type AugEvent = Event & {
    nId: UID,
    authorId: UID,
}



  export type Note = AugEvent & {
    repostOf: UID | undefined,
    replyTo: UID | undefined,
  }

  export type Repost = Note & {
    repostOf: UID
  }

  export type DisplayEvent = Event & {
    nId: UID,
    authorId: UID,
    zaps: Event[]
    replies: DisplayEvent[]
    reactions: Event[]
    wot?: any;
    matchesFilter?: boolean
  }



