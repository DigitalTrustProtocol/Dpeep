import EventDB from '@/nostr/EventDB';
import Events from '@/nostr/Events';
import { ID, UniqueIds } from '@/utils/UniqueIds';
import { Event } from 'nostr-tools';
import profileManager from './ProfileManager';
import { EdgeRecord, EntityType, Vertice } from './model/Graph';
import graphNetwork from './GraphNetwork';
import { EntityItem, MuteKind, Trust1Kind } from './network/WOTPubSub';
import muteManager from './MuteManager';
class EventManager {

  subscribedAuthors = new Set<string>();


  constructor() {}

  // Mute the public key (hex string) using the logged in user as the muter
  onMute(pubkey: string) {}

  // Is the public key muted?
  isMuted(id: number): boolean {
    return muteManager.mutes.has(id);
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
      created_at: timestamp || this.getTimestamp(), // Optional, but recommended
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
      created_at: timestamp || this.getTimestamp(), // Optional, but recommended
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
    let authorPubkey = event.pubkey;
    let timestamp = event.created_at;

    let { pTags, eTags, d, v, c: context } = this.parseTags(event);
    note = event.content;

    let val = parseInt(v || '0');
    if (isNaN(val) || val < -1 || val > 1) val = 0; // Invalid value, the default to 0
    context = context || 'nostr';

    return { pTags, eTags, context, d, v, val, note, authorPubkey, timestamp };
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

  parseTags(event: Event) {
    let pTags: Set<string> = new Set();
    let eTags: Set<string> = new Set();
    let c: string | undefined;
    let d: string | undefined;
    let v: string | undefined;

    if (event.tags) {
      for (const tag of event.tags) {
        switch (tag[0]) {
          case 'p': // Subject is a pubkey (Key) Optional, Multiple
            pTags.add(tag[1]);
            break;
          case 'e': // Subject is an entity (Entity) Optional, Multiple
            eTags.add(tag[1]);
            break;
          case 'c': // Context
            c = tag[1];
            break;
          case 'd': // The unique identifier of the claim, d = target[hex-address|v|context
            d = tag[1];
            break;
          case 'v': // The value of the claim
            v = tag[1];
            break;
        }
      }
    }
    return { pTags, eTags, c, d, v };
  }

  async eventCallback(event: Event, afterEose: boolean, url: string | undefined) {
    if (!event?.id || UniqueIds.has(event.id)) return false; // Already processed this event
    ID(event.id); // add Event ID to UniqueIds

    switch (event.kind) {
      case Trust1Kind:
        await eventManager.trustEvent(event);
        break;
      case MuteKind:
        eventManager.muteEvent(event);
        break;
    }
  }

  async trustEvent(event: Event) {
    let { pTags, eTags, val, authorPubkey, note, context, timestamp } = this.parseTrustEvent(event);

    // Add the trust to the local graph, and update the score
    // The doing the addEdge() method it will check for the created_at timestamp of the event,
    // and only process the event if it is newer than the current data

    for (const p of pTags) {
      await graphNetwork.setTrustAndProcess(
        p,
        authorPubkey,
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
        authorPubkey,
        EntityType.Item,
        val,
        note,
        context,
        timestamp,
      );
    }
  }

  muteEvent(event: Event) {
    // Replace the current mutes with the new mutes on profile
    let pubId = ID(event.pubkey); // The pubkey ID of the muter
    let profile = profileManager.getMemoryProfile(pubId);
    if (!profile) return undefined; // No profile found, (should't happen)

    if (profile?.lastMuteEvent && profile?.lastMuteEvent > event.created_at) return; // Event is older than the current data, ignore it
    profile.lastMuteEvent = event.created_at; // Update the lastMuteEvent timestamp

    muteManager.remove(profile.mutes); // Remove the old mutes from the aggregate mutes

    let { pTags } = eventManager.parseTags(event);
    profile.mutes = [...pTags];

    let vertice = graphNetwork.g.vertices[profile.id] as Vertice | undefined;
    if (vertice) {
      if (vertice.score.trusted()) {
        // Add the mutes to the aggregated mutes
        muteManager.add(profile.mutes);
      } else {
        //profile.mutes = undefined; // No trust score, so no mutes
      }
    }

    // Update the profile in IndexedDB
    profileManager.saveProfile(profile);
    return profile;
  }

  getTimestamp(date: number = Date.now()): number {
    return Math.floor(date / 1000);
  }
}

const eventManager = new EventManager();

export default eventManager;
