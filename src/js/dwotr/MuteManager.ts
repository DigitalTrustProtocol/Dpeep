import { ID, STR, UID } from '@/utils/UniqueIds';
import { Event } from 'nostr-tools';
import { EventParser } from './Utils/EventParser';
import graphNetwork from './GraphNetwork';
import { Vertice } from './model/Graph';
import IndexedDB from '@/nostr/IndexedDB';
import Key from '@/nostr/Key';
import wotPubSub, { MuteKind } from './network/WOTPubSub';
import { getNostrTime } from './Utils';

class ProfileMeta {
  timestamp: number = 0;
  added: boolean = false;
  profileIds: Set<number> = new Set<number>();
  eventIds: Set<number> = new Set<number>();

  privateProfileIds?: Set<number> = new Set<number>();
  privateEventIds?: Set<number> = new Set<number>();
}

// Mutes that are aggregated from multiple profiles
class MuteManager {
  // Don't store the mutes from each batch, just the id of the batch
  // The mutes are already stored in the profiles
  profiles = new Map<UID, ProfileMeta>(); // Mutes that are aggregated from multiple profiles

  aggregatedProfileIDs = new Set<number>(); // Mutes that are aggregated from multiple profiles
  aggregatedEventIDs = new Set<number>(); // Mutes that are aggregated from multiple profiles

  // Is the public key muted?
  isMuted(id: number): boolean {
    return this.isProfileMuted(id) || this.isEventMuted(id);
  }

  isProfileMuted(id: number): boolean {
    return this.aggregatedProfileIDs.has(id);
  }

  isEventMuted(id: number): boolean {
    return this.aggregatedEventIDs.has(id);
  }

  // Mute the public key (hex string) using the logged in user as the muter
  async onNoteMute(eventKey: string, isMuted: boolean = true, isPrivate: boolean = false) {
    let id = ID(eventKey);
    if (this.isEventMuted(id)) return;
    let meta = this.getProfile(ID(Key.getPubKey()));
    meta.added = true;
    meta.timestamp = getNostrTime();

    if (isMuted) {
      this.aggregatedEventIDs.add(id);
      if (isPrivate) meta.privateEventIds?.add(id);
      else meta.eventIds.add(id);
    } else {
      this.aggregatedEventIDs.delete(id);
      meta.eventIds.delete(id);
      meta.privateEventIds?.delete(id);
    }

    let event = await muteManager.createEvent(meta);
    this.saveEvent(event);
    wotPubSub.publish(event);
  }

  async onProfileMute(key: string, isMuted: boolean = true, isPrivate: boolean = false) {
    let id = ID(key);
    if (this.isProfileMuted(id)) return;

    let meta = this.getProfile(ID(Key.getPubKey()));

    meta.added = true;
    meta.timestamp = getNostrTime();

    if (isMuted) {
      this.aggregatedProfileIDs.add(id);
      if (isPrivate) meta.privateProfileIds?.add(id);
      else meta.profileIds.add(id);
    } else {
      this.aggregatedProfileIDs.delete(id);
      meta.profileIds.delete(id);
      meta.privateProfileIds?.delete(id);
    }

    let event = await muteManager.createEvent(meta);
    this.saveEvent(event);
    wotPubSub.publish(event);
  }

  getProfile(id: UID): ProfileMeta {
    let meta = this.profiles.get(id);
    if (!meta) {
      meta = new ProfileMeta();
      this.profiles.set(id, meta);
    }
    return meta;
  }

  addProfile(
    profileId: UID,
    profileKeys: string[] | Set<string> | undefined,
    eventKeys: string[] | Set<string> | undefined,
    timestamp: number,
  ): void {
    // Load the mutes from the profiles
    let meta = this.getProfile(profileId);

    meta.added = true;
    meta.timestamp = timestamp;
    meta.profileIds = new Set<number>([...(profileKeys || [])].map(ID));
    meta.eventIds = new Set<number>([...(eventKeys || [])].map(ID));
  }

  addAggregatedFrom(profileId: UID) {
    // Add the mutes from the profile
    let meta = this.profiles.get(profileId);
    if (!meta) return;

    for (const p of meta.profileIds || []) {
      this.aggregatedProfileIDs.add(p);
    }
    for (const e of meta.eventIds || []) {
      this.aggregatedEventIDs.add(e);
    }

    meta.added = true;
  }

  removeAggregatedFrom(profileId: UID): boolean {
    // remove the mutes from the profile
    let meta = this.profiles.get(profileId);
    if (!meta || !meta.added) return false;

    for (const p of meta.profileIds || []) {
      this.aggregatedProfileIDs.delete(p);
    }
    for (const e of meta.eventIds || []) {
      this.aggregatedEventIDs.delete(e);
    }

    meta.added = false;

    return true;
  }

  // Process the aggregated mutes based on the vertices changed.
  // The add or remove mutes based on Profile.mutes
  // This is a state change function, it will change the state of the mutes from the perspective of the user.
  updateBy(vertices: Array<Vertice>) {
    if (!vertices || vertices.length == 0) return;

    for (const v of vertices) {
      if (v.entityType != 1) continue; // Only process profiles

      if (v.oldScore) {
        if (v.oldScore.trusted() && !v.score.trusted()) this.removeAggregatedFrom(v.id); // If old true and new false then remove
        if (!v.oldScore.trusted() && v.score.trusted()) this.addAggregatedFrom(v.id); // If old false and new true then add

        // Exsample of outcome all resulting in no change:
        // if (v.oldScore.trusted() && v.score.trusted()) continue;// If old true and new true then no change
        // if (!v.oldScore.trusted() && !v.score.trusted()) continue;// If old false and new false then no change
      } else {
        if (v.score.trusted()) this.addAggregatedFrom(v.id); // If old undefined and new true then add

        // Exsample of outcome all resulting in no change:
        //if (!v.score.trusted()) continue;// If old undefined and new false then no change
      }
    }
  }

  async loadFromIndexedDB() {
    await IndexedDB.db.events
      .where('kind')
      .equals(MuteKind)
      .each((event) => {
        this.handle(event);
      });
  }

  handle(event: Event) {
    let profileId = ID(event.pubkey);
    let meta = this.getProfile(profileId);
    if (meta?.timestamp && meta.timestamp > event.created_at) return; // Event is older than the current data, ignore it

    muteManager.removeAggregatedFrom(profileId); // then remove the old mutes from the aggregate mutes

    if (graphNetwork.isTrusted(profileId)) {
      let { p, e } = EventParser.parseTags(event); // Parse the tags from the event and get the mutes in p and e, ignore other tags
      muteManager.addProfile(profileId, p, e, event.created_at);
      muteManager.addAggregatedFrom(profileId);
    }
  }

  saveEvent(event: Event | Partial<Event>) {
    IndexedDB.saveEvent(event as Event & { id: string });
  }

  async createEvent(meta: ProfileMeta): Promise<Partial<Event>> {
    let pTags = Array.from(meta.profileIds).map((id) => ['p', STR(id)]);
    let eTags = Array.from(meta.eventIds).map((id) => ['e', STR(id)]);

    let content = '';

    if (meta.privateProfileIds || meta.privateEventIds) {
      let privatePTags = meta.privateProfileIds
        ? Array.from(meta.privateProfileIds).map((id) => ['p', STR(id)])
        : [];
      let privateETags = meta.privateEventIds
        ? Array.from(meta.privateEventIds).map((id) => ['e', STR(id)])
        : [];
      content = JSON.stringify({ p: privatePTags, e: privateETags });
      content = await Key.encrypt(content);
    }

    const event = {
      kind: MuteKind, // trust event kind id
      content: content, // The reason for the trust
      created_at: getNostrTime(), // Optional, but recommended
      tags: [...pTags, ...eTags],
    };
    return event;
  }
}

const muteManager = new MuteManager();
export default muteManager;
