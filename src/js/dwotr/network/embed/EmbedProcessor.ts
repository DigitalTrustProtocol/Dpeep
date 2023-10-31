import { EmbedData } from '.';
import { ID, STR, UID } from '@/utils/UniqueIds';
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

  #doProfile(container: EventContainer) {
    if (this.#hasProfile(container.authorId!)) return;

    this.setAuthor(EmbedData.create(undefined, STR(container.authorId), container.relay));
  }

  #doText(container: NoteContainer) {

    // A note can be a note, reply, and a inline repost at the same time
    // Therefore check for all three types
    this.#doNoteEmbeds(container);
    this.#doReply(container); 
    this.#doRepost(container); 
  }

  #doNoteEmbeds(container: NoteContainer) {
    let embedEvent = ExstractEmbeds(container?.event!.content || '', container.event!);

    for (let item of embedEvent.authors.values()) {
      if(!item.author) continue;
      if(eventManager.seen(ID(item.author))) continue; // Already seen
      this.setAuthor(item);
    }
    for (let item of embedEvent.events.values()) {
      if(!item?.id) continue;
      if(eventManager.seen(ID(item.id))) continue; // Already seen
      this.setEvent(item);
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
      this.setEvent(EmbedData.create(STR(container.rootId), undefined, container.relay));
    }

    if (container?.repliedTo) {
      this.setEvent(EmbedData.create(STR(container.repliedTo), undefined, container.relay));
    }
  }

  #doRepost(container: RepostContainer) {
    if (container.repostOf) {
      this.setEvent(EmbedData.create(STR(container.repostOf), undefined, container.relay));
    }
  }

  #hasProfile(author: UID): boolean {
    if (!profileManager.hasProfile(author)) return false;
    let profile = profileManager.getMemoryProfile(author);
    return !profile.isDefault;
  }



}
