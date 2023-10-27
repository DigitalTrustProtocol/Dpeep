import { EmbedData } from '.';
import { UID } from '@/utils/UniqueIds';
import { MetadataKind, ReactionKind, RepostKind, TextKind } from '../WOTPubSub';
import profileManager from '../../ProfileManager';
import eventManager from '../../EventManager';
import {
  EventContainer,
  NoteContainer,
  ReplyContainer,
  RepostContainer,
} from '../../model/ContainerTypes';
import { ExstractEmbeds } from '.';

export class EmbedProcessor extends EmbedData {
  constructor() {
    super();
  }

  process(containers: EventContainer[]) {
    for (const container of containers) {
      if (!container) continue;
      // Load profiles from every event pubKey
      this.#doProfile(container);

      switch (container.kind) {
        case MetadataKind:
          // Nothing to do
          break;

        case TextKind: {
          this.#doText(container); // Handle the event as a note
          break;
        }

        case RepostKind:
          this.#doRepost(container);
          break;
        case ReactionKind:
          //this.#doReactions(container as ReactionEvent);
          break;
      }
    }
  }


  addEvent(id: UID): boolean {
    if (eventManager.seen(id)) return false; // Already seen

    this.events.add(id);
    // this.kinds.add(kind);
    // if (kind == RepostKind) this.kinds.add(TextKind); // Add text kind if repost, as it can be a text kind

    return true;
  }

  #doProfile(container: EventContainer) {
    this.#addProfile(container.authorId!);
  }

  #doText(container: NoteContainer) {
    // Get the container from memory, as it have been loaded already
    if (container?.subtype == 2) {
      this.#doReply(container); // Can be a reply
      return;
    }

    if (container?.subtype == 3) {
      // Check if the event is a repost even that the kind is 1
      this.#doRepost(container); // Can be a repost
      return;
    }

    this.#doNoteEmbeds(container);
  }

  #doNoteEmbeds(container: NoteContainer) {
    let embedEvent = ExstractEmbeds(container?.event!.content || '', container.event!);

    for (let author of embedEvent.authors) {
      if(eventManager.seen(author)) continue; // Already seen
      this.authors.add(author);
    }
    for (let event of embedEvent.events) {
      if(eventManager.seen(event)) continue; // Already seen
      this.events.add(event);
    }
  }

  //   #doReactions(event: ReactionEvent) {
  //     let meta = event.meta;
  //     if (!meta || !meta.subjectEventId) return;

  //     if (!this.addEvent(meta.subjectEventId)) return;

  //     if (!meta.subjectAuthorId) return;
  //     if (!this.#hasProfile(meta.subjectAuthorId)) return;

  //     this.#addProfile(meta.subjectAuthorId);
  //   }

  #doReply(container: ReplyContainer) {
    if (container?.rootId) {
      this.addEvent(container?.rootId!);
    }

    if (container?.repliedTo) {
      this.addEvent(container?.repliedTo!);
    }
  }

  #doRepost(container: RepostContainer) {
    if (container.repostOf) {
      this.addEvent(container.repostOf);
    }
  }

  #hasProfile(author: UID): boolean {
    if (!profileManager.hasProfile(author)) return false;
    let profile = profileManager.getMemoryProfile(author);
    return !profile.isDefault;
  }

  #addProfile(uid: UID) {
    if (this.#hasProfile(uid)) return;

    this.authors.add(uid);
  }


}
