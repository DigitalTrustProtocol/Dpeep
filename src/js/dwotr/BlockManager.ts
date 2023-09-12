import { ID, STR, UID } from '@/utils/UniqueIds';
import { Event } from 'nostr-tools';
import { EventParser } from './Utils/EventParser';
import graphNetwork from './GraphNetwork';
import { Vertice } from './model/Graph';
import IndexedDB from '@/nostr/IndexedDB';
import Key from '@/nostr/Key';
import wotPubSub, { BlockKind } from './network/WOTPubSub';
import { getNostrTime } from './Utils';
import Subscriptions from './model/Subscriptions';

class BlockVertice extends Vertice {
  blocks?: Set<UID>;
  blockedBy?: { [key: UID]: Vertice };
  blockTime?: number;
}

// Blocks that are aggregated from multiple profiles
class BlockManager {
  subscriptions = new Subscriptions(); // Callbacks to call when the mutes change

  isBlocked(id: number): boolean {
    let targetV = graphNetwork.g.vertices[id] as BlockVertice;
    if (!targetV) return false;
    return this.isVerticeBlocked(targetV);
  }

  isVerticeBlocked(targetV: BlockVertice): boolean {
    for (const key in targetV.blockedBy) {
      let sourceV = targetV.blockedBy[key] as BlockVertice;

      // If the source is trusted then the target is blocked
      if (sourceV.score.trusted()) return true;
    }
    return false;
  }

  getBlocks(id: number): Set<UID> {
    let targetV = graphNetwork.g.vertices[id] as BlockVertice;
    return targetV?.blocks || new Set<UID>();
  }

  // Block the public key using the logged in user as the Blocker
  async onProfileBlock(id: UID, isBlocked: boolean = true) {
    let myId = ID(Key.getPubKey());

    if (id == myId) return; // Can't Block yourself

    let sourceV = graphNetwork.g.addVertice(myId) as BlockVertice;

    let sourceBlocks = sourceV.blocks || (sourceV.blocks = new Set<UID>());

    let targetV = graphNetwork.g.addVertice(id) as BlockVertice;

    if (isBlocked) {
      if (sourceBlocks.has(id)) return; // Already blocked
      sourceBlocks.add(id);
      let targetBlockedBy = targetV.blockedBy || (targetV.blockedBy = {});
      targetBlockedBy[myId] = sourceV;
    } else {
      if (!sourceBlocks.has(id)) return; // Already not blocked
      sourceBlocks.delete(id);
      if (targetV.blockedBy) delete targetV.blockedBy[myId];
    }

    this.subscriptions.dispatch(id, isBlocked); // Notify subscribers, UI Components

    let event = await blockManager.createEvent(sourceV);
    this.save(event);
    wotPubSub.publish(event);
  }

  addBlocks(profileV: BlockVertice, blockIDs: Set<UID>): void {
    let oldblocks = profileV.blocks || (profileV.blocks = new Set<UID>());

    let deltaAdd = [...blockIDs].filter((x) => !oldblocks.has(x));
    let deltaDelete = [...oldblocks].filter((x) => !blockIDs.has(x));

    // Add the new Blocks
    for (const id of deltaAdd) {
      let targetV = graphNetwork.g.addVertice(id) as BlockVertice;
      let targetBlockedBy = targetV.blockedBy || (targetV.blockedBy = {});
      targetBlockedBy[profileV.id] = profileV;
    }

    // Remove the old Blocks
    for (const id of deltaDelete) {
      let targetV = graphNetwork.g.addVertice(id) as BlockVertice;
      if (targetV.blockedBy) delete targetV.blockedBy[profileV.id];
    }

    // Set the new Blocks to the profile vertice
    profileV.blocks = blockIDs;
  }

  dispatchAll() {
    for (const id of this.subscriptions.keys()) {
      this.subscriptions.dispatch(id, this.isBlocked(id));
    }
  }


  async handle(event: Event) {
    let profileId = ID(event.pubkey);

    let sourceV = graphNetwork.g.addVertice(profileId) as BlockVertice;

    // Ignore events that are older than the last time we updated the data
    if (sourceV.blockTime && sourceV.blockTime >= event.created_at) return; // Event is older than the current data, ignore it

    // Update the time of the last event
    sourceV.blockTime = event.created_at;

    let { p } = EventParser.parseTagsArrays(event); // Parse the tags from the event and get the Blocks in p and e, ignore other tags

    // Add the Blocks from the private section
    if (event.pubkey === Key.getPubKey()) {
      let { content, success } = await EventParser.descrypt(event.content || '');
      if (success) {
        let privateP = JSON.parse(content) || [];
        p = [...p, ...privateP];
      }
    }

    let blockIDs = new Set<UID>(p.map(ID));

    blockManager.addBlocks(sourceV, blockIDs);

    this.save(event);
  }

  async load() {
    await IndexedDB.db.events
      .where('kind')
      .equals(BlockKind)
      .each((event) => {
        this.handle(event);
      });
  }

  save(event: Event | Partial<Event>) {
    IndexedDB.saveEvent(event as Event & { id: string });
  }

  async createEvent(sourceV: BlockVertice): Promise<Partial<Event>> {
    let pTags = Array.from(sourceV.blocks || []).map((id) => ['p', STR(id)]);

    let content = '';

    // if (block.privateProfileIds && block.privateProfileIds.size > 0) {
    //   let privateP = Array.from(block.privateProfileIds || []).map(STR);
    //   content = (await Key.encrypt(JSON.stringify(privateP))) || '';
    // }

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
