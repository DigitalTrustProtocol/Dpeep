import { ID, UID } from '@/utils/UniqueIds';
import { Event, validateEvent, verifySignature } from 'nostr-tools';
import { EdgeRecord, EntityType } from './model/Graph';
import graphNetwork from './GraphNetwork';
import {
  BlockKind,
  ContactsKind,
  EntityItem,
  EventDeletionKind,
  MetadataKind,
  MuteKind,
  ReactionKind,
  RepostKind,
  TextKind,
  Trust1Kind,
  ZapKind,
} from './network/WOTPubSub';
import muteManager from './MuteManager';
import { EventParser } from './Utils/EventParser';
import { getNostrTime } from './Utils';
import blockManager from './BlockManager';
import followManager from './FollowManager';
import profileManager from './ProfileManager';
import reactionManager from './ReactionManager';
import noteManager from './NoteManager';
import { throttle } from 'lodash';
import zapManager from './ZapManager';
import EventDeletionManager from './EventDeletionManager';
import replyManager from './ReplyManager';
import repostManager from './RepostManager';
import { isRepost } from '@/nostr/utils';
class EventManager {
  seenRelayEvents: Set<UID> = new Set();

  requestedEvents: Set<UID> = new Set();

  eventIndex: Map<UID, Event> = new Map();




  metrics = {
    TotalMemory: 0,
    Loaded: 0,
    HandleEvents: 0,
  };

  constructor() {}


  loadRequestedEvents = throttle(async () => {
    if (this.requestedEvents.size == 0) return;

  });


  requestEvents(eventId: UID | UID[]) {
    let ids = Array.isArray(eventId) ? eventId : [eventId];

    for (let id of ids) {
      if (this.requestedEvents.has(id)) return;

      this.requestedEvents.add(id);
    }
  }


  createTrustEvent(
    entityPubkey: string,
    val: number,
    content: string = '',
    context: string = 'nostr',
    entityType: EntityType = 1,
    timestamp?: number,
  ) {
    // pubkey should be in hex format

    // d = target[hex-address|'multi']|v|context
    const d = `${entityPubkey}|${val.toString()}|${context}`; // Specify target. [target | context]

    const subjectTag = entityType == EntityType.Key ? 'p' : 'e';

    const event = {
      kind: Trust1Kind, // trust event kind id
      content: content || '', // The reason for the trust
      created_at: timestamp || getNostrTime(), // Optional, but recommended
      tags: [
        [subjectTag, entityPubkey], // Subject
        ['d', d], // NIP-33 Parameterized Replaceable Events
        ['c', context], // context = nostr
        ['v', val.toString()], // 1, 0, -1
        //['t', entityType.toString()], // replaced by p and e tags
      ],
    };
    return event;
  }

  createTrustEventFromEdge(edge: EdgeRecord) {
    // pubkey should be in hex format
    let event = eventManager.createTrustEvent(
      edge.to,
      edge.type,
      edge.note,
      edge.context,
      edge.entityType,
    );
    return event;
  }

  createMultiEvent(
    entities: EntityItem[],
    groupKey: string,
    val: number,
    content: string = '',
    context: string = 'nostr',
    timestamp?: number,
  ) {
    // d = groupkey|v|context
    // groupkey is the usually the pubkey of the subject of the trust, but can be any string
    const d = `${groupKey}|${val.toString()}|${context}`; // Specify target. [target | value of the trust | context]

    const peTags = entities.map((e) => [e.entityType == EntityType.Key ? 'p' : 'e', e.pubkey]);

    const event = {
      kind: Trust1Kind, // trust event kind id
      content: content || '', // The reason for the trust
      created_at: timestamp || getNostrTime(), // Optional, but recommended
      tags: [
        ...peTags,
        ['d', d], // NIP-33 Parameterized Replaceable Events
        ['c', context], // context = nostr
        ['v', val.toString()], // 1, 0, -1
      ],
    };
    return event;
  }

  parseTrustEvent(event: Event) {
    let note: string;
    let pubKey = event.pubkey;
    let timestamp = event.created_at;

    let { p, e, d, v, c: context } = EventParser.parseTags(event);
    note = event.content;

    let val = parseInt(v || '0');
    if (isNaN(val) || val < -1 || val > 1) val = 0; // Invalid value, the default to 0
    context = context || 'nostr';

    return { p, e, context, d, v, val, note, pubKey, timestamp };
  }

  seen(eventId: UID) {
    return this.seenRelayEvents.has(eventId);
  }

  addSeen(eventId: UID) {
    this.seenRelayEvents.add(eventId);
  }

  verify(event: Event) {
    return verifySignature(event);
  }


  doRelayEvent(event: Event): boolean {
    if (!event?.id) return false;
    let eventId = ID(event.id); // add Event ID to UniqueIds


    if (this.seenRelayEvents.has(eventId)) {
      return false; // already seen this event, skip it
    } 

    // Relay-pool do not validate events, so we need to do it here.
    // Validate an event takes about 14ms, so this is a big performance boost avoid validating events that we have already seen
    if(!validateEvent(event) || !verifySignature(event)) return false;

    this.seenRelayEvents.add(eventId);
    return true;
  }

  async eventCallback(event: Event) {
    if(!event) return false;
    eventManager.addSeen(ID(event.id));

    // Check if the event has been ordered deleted
    if(EventDeletionManager.deleted.has(ID(event.id))) return false;

    eventManager.metrics.HandleEvents++;

    switch (event.kind) {
      case MetadataKind:
        profileManager.handle(event);
        break;

      case TextKind:

        if(replyManager.isReplyEvent(event)) {
          replyManager.handle(event);
          break;
        } 

        if(isRepost(event)) { // Check if the event is a repost even that the kind is 1
          repostManager.handle(event);
          break;
        }

        noteManager.handle(event); // Handle the event as a note
        break;
        
      case RepostKind:
        repostManager.handle(event);
        break;

      case ContactsKind: 
        followManager.handle(event);
        break;

      case EventDeletionKind:
        EventDeletionManager.handle(event);
        break;

      case ReactionKind:
        reactionManager.handle(event);
        break;

      case Trust1Kind:
        await eventManager.trustEvent(event);
        break;
      case MuteKind:
        await muteManager.handle(event);
        break;
      case BlockKind:
        await blockManager.handle(event);
        break;

      case ZapKind:
        zapManager.handle(event);
        break;
      default:
        //Events.handle(event, false, true); 
        break;

    }

    return true;
  }


  async trustEvent(event: Event) {

    let { p: pTags, e: eTags, val, pubKey, note, context, timestamp } = this.parseTrustEvent(event);

    // Add the trust to the local graph, and update the score
    // The doing the addEdge() method it will check for the created_at timestamp of the event,
    // and only process the event if it is newer than the current data

    for (const p of pTags) {
      graphNetwork.setTrustAndProcess(
        p,
        pubKey,
        EntityType.Key,
        val,
        note,
        context,
        timestamp,
      );
    }

    for (const e of eTags) {
      graphNetwork.setTrustAndProcess(
        e,
        pubKey,
        EntityType.Item,
        val,
        note,
        context,
        timestamp,
      );
    }
  }

  getMetrics() {
    return this.metrics;
  }
}

const eventManager = new EventManager();

export default eventManager;
