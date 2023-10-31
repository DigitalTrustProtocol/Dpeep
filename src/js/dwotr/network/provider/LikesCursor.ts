import { FeedOption } from '../WOTPubSub';
import reactionManager from '@/dwotr/ReactionManager';
import eventManager from '@/dwotr/EventManager';
import { ReactionContainer } from '@/dwotr/model/ContainerTypes';
import { RelayCursor } from './RelayCursor';

export class LikesCursor extends RelayCursor<ReactionContainer> {

  constructor(opts: FeedOption) {
    super(opts);
  }

  preLoad() : ReactionContainer[]  {
    // Load from memory
    let reactions = reactionManager.authors.get(this.options.user!);

    let containers: ReactionContainer[] = [];
    for(let reaction of reactions?.values() ?? []) {
      let container = eventManager.getContainer(reaction.subjectEventId) as ReactionContainer;
      if(!container) continue;

      containers.push(container);
    }
    return containers;
  }
}
