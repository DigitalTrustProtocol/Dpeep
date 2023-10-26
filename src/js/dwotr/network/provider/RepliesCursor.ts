import { FeedOption } from '../WOTPubSub';
import { ReplyContainer } from '@/dwotr/model/ContainerTypes';
import { RelayCursor } from './RelayCursor';
import replyManager from '@/dwotr/ReplyManager';

export class RepliesCursor extends RelayCursor<ReplyContainer> {

  constructor(opts: FeedOption) {
    super(opts);
  }

  preLoad(): ReplyContainer[] {
    // Get all known replies first, and put my own replies on top
    return replyManager.getReplies(this.options.eventId!);
  }
}
