import EventDB from '@/nostr/EventDB';
import Events from '@/nostr/Events';
import { ID, UniqueIds } from '@/utils/UniqueIds';
import { Event } from 'nostr-tools';
import { EdgeRecord, EntityType } from './model/Graph';
import graphNetwork from './GraphNetwork';
import { BlockKind, ContactsKind, EntityItem, MuteKind, Trust1Kind } from './network/WOTPubSub';
import muteManager from './MuteManager';
import { EventParser } from './Utils/EventParser';
import { getNostrTime } from './Utils';
import blockManager from './BlockManager';
import followManager from './FollowManager';
class EventManager {

  metrics = {
    TotalMemory: 0,
    Loaded: 0,
    Handle: 0,
  }    

  constructor() {}

  

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

  // TODO: return Unsubscribe
  async getEventById(id: string) {
    const event = EventDB.get(id);
    if (event) return event;

    let res = await fetch(`https://api.iris.to/event/${id}`);

    if (res.status === 200) {
      let data = await res.json();
      // TODO verify sig
      if (data) {
        Events.handle(data, true);
      }
      return data;
    }

    return undefined;
  }

  async eventCallback(event: Event, afterEose: boolean, url: string | undefined) {
    if (!event?.id || UniqueIds.has(event.id)) return false; // Already processed this event
    ID(event.id); // add Event ID to UniqueIds

    eventManager.metrics.Handle++;

    switch (event.kind) {
      // case MetadataKind:
      //   break; 

      // case TextKind: 
      //   break;

      case ContactsKind: // Follow Kind 3
        await followManager.handle(event);
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

      default:
        Events.handle(event, false, true);
        break;
    }
  }

  async trustEvent(event: Event) {
    let {
      p: pTags,
      e: eTags,
      val,
      pubKey,
      note,
      context,
      timestamp,
    } = this.parseTrustEvent(event);

    // Add the trust to the local graph, and update the score
    // The doing the addEdge() method it will check for the created_at timestamp of the event,
    // and only process the event if it is newer than the current data

    for (const p of pTags) {
      await graphNetwork.setTrustAndProcess(
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
      await graphNetwork.setTrustAndProcess(
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
