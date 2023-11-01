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
import Key from '@/nostr/Key';
import { Url } from '../Url';

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

      // In general include the tags of every event
      this.#doTags(container); 
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

  #doTags(container: NoteContainer) {
    let event = container.event!;

    let defaultRelay = container.relay;

    for (let tag of event.tags) {
      if(tag[0] == 'p') {
        let author = Key.sanitize(tag[1]);
        if(!Key.validate(author)) continue; // Invalid key
        if(this.#hasProfile(ID(author))) continue; // Already seen
        let relay = Url.isValid(tag[2]) ? tag[2] : defaultRelay;
        this.setAuthor(EmbedData.create(undefined, author, relay));
      }

      if(tag[0] == 'e') {
        let id = Key.sanitize(tag[1]);
        if(!Key.validate(id)) continue; // Invalid key
        if(eventManager.seen(ID(id))) continue; // Already seen
        let relay = Url.isValid(tag[2]) ? tag[2] : defaultRelay;
        this.setEvent(EmbedData.create(id, undefined, relay));
      }
    }
  }

  #doNoteEmbeds(container: NoteContainer) {
    let embedEvent = ExstractEmbeds(container?.event!.content || '', container.event!);
    let defaultRelay = container.relay;

    for (let item of embedEvent.authors.values()) {
      if(!item.author) continue;
      if(this.#hasProfile(ID(item.author))) continue; // Already seen
      this.setAuthor(item, defaultRelay);
    }
    for (let item of embedEvent.events.values()) {
      if(!item?.id) continue;
      if(eventManager.seen(ID(item.id))) continue; // Already seen
      this.setEvent(item, defaultRelay);
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
