import { FeedOption } from '../provider';
import reactionManager, { Reaction, ReactionMap } from '@/dwotr/ReactionManager';
import { ReactionContainer } from '@/dwotr/model/ContainerTypes';
import { BaseCursor } from './BaseCursor';
import eventManager from '@/dwotr/EventManager';

export class LikesCursor extends BaseCursor<ReactionContainer> {
  pointer: IterableIterator<Reaction> | undefined;
  reactions: ReactionMap;

  constructor(opts: FeedOption) {
    super(opts);
    this.reactions = reactionManager.authors.get(this.options.user!);
    this.pointer = this.reactions?.values() ?? [].values();
  }

  async next(): Promise<ReactionContainer | undefined> {
    if (this.done) return;

    while (!this.done) {
      let { done, value } = this.pointer!.next();

      if (done) {
        this.done = true;
        return;
      }

      let container = eventManager.containers.get(value.subjectEventId) as ReactionContainer;
      if (container) return container;
    }

    return;
  }

  reset(): void {
    super.reset();
    this.pointer = this.reactions?.values() ?? [].values();
  }
}
