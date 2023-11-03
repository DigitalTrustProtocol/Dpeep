import { FeedOption } from '../WOTPubSub';
import reactionManager, { Reaction, ReactionMap } from '@/dwotr/ReactionManager';
import { ReactionContainer } from '@/dwotr/model/ContainerTypes';
import { RelayCursor } from './RelayCursor';
import eventManager from '@/dwotr/EventManager';

export class LikesRelayCursor extends RelayCursor<ReactionContainer> {

  pointer: IterableIterator<Reaction> | undefined;
  reactions: ReactionMap = undefined;

  constructor(opts: FeedOption) {
    super(opts);
    this.reactions = reactionManager.authors.get(this.options.user!);
    this.pointer = this.reactions?.values() ?? [].values();
  }

  async next(): Promise<ReactionContainer | undefined> {

    if(this.done) return;

    // If we have buffered events, return the first one
    while (!this.done) {
      let { done, value } = this.pointer!.next();
      if (done) break;

      let container = eventManager.containers.get(value.subjectEventId) as ReactionContainer;
      if (container) return container;
    }

    return await super.next();
  }

  reset(): void {
    super.reset();
    this.pointer = this.reactions?.values() ?? [].values();
  }
}
