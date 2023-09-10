import { ID, STR, UID } from '@/utils/UniqueIds';
import { Event } from 'nostr-tools';
import { EventParser } from './Utils/EventParser';
import graphNetwork from './GraphNetwork';
import { Vertice } from './model/Graph';
import IndexedDB from '@/nostr/IndexedDB';
import Key from '@/nostr/Key';
import wotPubSub, { BlockKind } from './network/WOTPubSub';
import { getNostrTime } from './Utils';

class ProfileMeta {
  timestamp: number = 0;
  added: boolean = false;
  profileIds: Set<number> = new Set<number>();

  privateProfileIds?: Set<number>;
}

// Blocks that are aggregated from multiple profiles
class BlockManager {
  // Don't store the Blocks from each batch, just the id of the batch
  // The Blocks are already stored in the profiles
  profiles = new Map<UID, ProfileMeta>(); // Blocks that are aggregated from multiple profiles

  aggregatedProfileIDs = new Set<number>(); // Blocks that are aggregated from multiple profiles

  isBlocked(id: number): boolean {
    return this.aggregatedProfileIDs.has(id);
  }

  // Block the public key using the logged in user as the Blocker
  async onProfileBlock(id: UID, isBlocked: boolean = true, isPrivate: boolean = false) {
    let myId = ID(Key.getPubKey());

    if (id == myId) return; // Can't Block yourself
    if (this.isBlocked(id)) return;

    let meta = this.getProfile(myId);

    if (isBlocked) {

      this.aggregatedProfileIDs.add(id);
      if (isPrivate) meta.privateProfileIds?.add(id);
      else meta.profileIds.add(id);

    } else {
      this.aggregatedProfileIDs.delete(id);
      meta.privateProfileIds?.delete(id);
      meta.profileIds.delete(id);
    }

    meta.added = true;
    meta.timestamp = getNostrTime();
    if (!isPrivate) {
      meta.privateProfileIds?.add(id);
    } else {
      meta.profileIds.add(id);
    }

    let event = await blockManager.createEvent(meta);
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
    publicKeys: string[] | Set<string> | undefined,
    privateKey: string[] | Set<string> | undefined,
    timestamp: number,
  ): void {
    // Load the Blocks from the profiles
    let meta = this.getProfile(profileId);

    meta.added = true;
    meta.timestamp = timestamp;
    meta.profileIds = new Set<number>([...(publicKeys || [])].map(ID));
    meta.privateProfileIds = new Set<number>([...(privateKey || [])].map(ID));
  }

  addAggregatedFrom(profileId: UID) {
    // Add the Blocks from the profile
    let meta = this.profiles.get(profileId);
    if (!meta) return;

    for (const p of meta.profileIds || []) {
      this.aggregatedProfileIDs.add(p);
    }

    for (const p of meta.privateProfileIds || []) {
      this.aggregatedProfileIDs.add(p);
    }

    meta.added = true;
  }

  removeAggregatedFrom(profileId: UID): boolean {
    // remove the Blocks from the profile
    let meta = this.profiles.get(profileId);
    if (!meta || !meta.added) return false;

    for (const p of meta.profileIds || []) {
      this.aggregatedProfileIDs.delete(p);
    }
    meta.added = false;

    return true;
  }

  // Process the aggregated Blocks based on the vertices changed.
  // The add or remove Blocks based on Profile.Blocks
  // This is a state change function, it will change the state of the Blocks from the perspective of the user.
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
      .equals(BlockKind)
      .each((event) => {
        this.handle(event);
      });
  }

  async handle(event: Event) {
    let profileId = ID(event.pubkey);
    let meta = this.getProfile(profileId);
    if (meta?.timestamp && meta.timestamp > event.created_at) return; // Event is older than the current data, ignore it

    blockManager.removeAggregatedFrom(profileId); // then remove the old Blocks from the aggregate Blocks

    if (graphNetwork.isTrusted(profileId)) {
      let { p } = EventParser.parseTags(event); // Parse the tags from the event and get the Blocks in p and e, ignore other tags
      let { content, success } = await EventParser.descrypt(event.content || '');
      let privateP = [];
      if (success) {
        privateP = JSON.parse(content) || [];
      }
      blockManager.addProfile(profileId, p, privateP, event.created_at);
      blockManager.addAggregatedFrom(profileId);
    }
  }

  saveEvent(event: Event | Partial<Event>) {
    IndexedDB.saveEvent(event as Event & { id: string });
  }

  async createEvent(meta: ProfileMeta): Promise<Partial<Event>> {
    let pTags = Array.from(meta.profileIds).map((id) => ['p', STR(id)]);

    let content = '';

    if (meta.privateProfileIds && meta.privateProfileIds.size > 0) {
      let privateP = Array.from(meta.privateProfileIds || []).map(STR);
      content = (await Key.encrypt(JSON.stringify(privateP))) || '';
    }

    const event = {
      kind: BlockKind,
      content: content, // Encrypted list of blocked profiles
      created_at: getNostrTime(),
      tags: [
        ...pTags, // Public list of blocked profiles
      ],
    };
    return event;
  }
}

const blockManager = new BlockManager();
export default blockManager;
