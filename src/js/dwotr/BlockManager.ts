import { ID, STR, UID } from '@/utils/UniqueIds';
import { Event } from 'nostr-tools';
import { EventParser } from './Utils/EventParser';
import graphNetwork from './GraphNetwork';
import { Vertice } from './model/Graph';
import IndexedDB from '@/nostr/IndexedDB';
import Key from '@/nostr/Key';
import wotPubSub, { BlockKind } from './network/WOTPubSub';
import { getNostrTime } from './Utils';
import EventCallbacks from './model/EventCallbacks';
import { as } from 'vitest/dist/reporters-2ff87305.js';

class BlockVertice extends Vertice {
  blocks?: Set<UID>;
  blockedBy?: { [key: UID]: Vertice };
  blockTime?: number;
}

// Blocks that are aggregated from multiple profiles
class BlockManager {
  callbacks = new EventCallbacks(); // Callbacks to call when the mutes change

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
  async onBlock(myId: UID, targetId: UID, isBlocked: boolean = true) {

    if (targetId == myId) return; // Can't Block yourself

    let myV = graphNetwork.g.addVertice(myId) as BlockVertice;

    let myBlocks = myV.blocks || (myV.blocks = new Set<UID>());

    let targetV = graphNetwork.g.addVertice(targetId) as BlockVertice;

    if (isBlocked) {
      if (myBlocks.has(targetId)) return; // Already blocked
      myBlocks.add(targetId);
      let targetBlockedBy = targetV.blockedBy || (targetV.blockedBy = {});
      targetBlockedBy[myId] = myV;
    } else {
      if (!myBlocks.has(targetId)) return; // Already not blocked
      myBlocks.delete(targetId);
      if (targetV.blockedBy) delete targetV.blockedBy[myId];
    }

    this.callbacks.dispatch(targetId, isBlocked); // Notify subscribers, UI Components

    let event = await blockManager.createEvent(myV);
    this.save(event); // Save the event to the local database
    wotPubSub.publish(event); // Publish the event to the network
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
    for (const id of this.callbacks.keys()) {
      this.callbacks.dispatch(id, this.isBlocked(id));
    }
  }


  async handle(event: Event) {
    let authorId = ID(event.pubkey);

    if (blockManager.isBlocked(authorId)) return;

    let sourceV = graphNetwork.g.addVertice(authorId) as BlockVertice;

    // Ignore events that are older than the last time we updated the data
    if (sourceV.blockTime && sourceV.blockTime >= event.created_at) return; // Event is older than the current data, ignore it

    // Update the time of the last event
    sourceV.blockTime = event.created_at;

    let p = event.tags.filter((tag) => tag[0] === 'p').map((tag) => tag[1]);

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

  async createEvent(sourceV: BlockVertice): Promise<Event> {
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
    } as Event;
    return event;
  }
}

const blockManager = new BlockManager();
export default blockManager;
