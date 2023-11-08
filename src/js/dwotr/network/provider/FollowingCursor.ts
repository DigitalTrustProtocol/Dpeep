import { NotesCursor } from './NotesCursor';
import { FeedOption } from '../provider';
import followManager from '@/dwotr/FollowManager';


class FollowingCursor extends NotesCursor {

  constructor(opt: FeedOption) {
    super(opt);
    this.kinds.add(1);
    this.authors = followManager.getFollows(this.options.user);
  }

}

export default FollowingCursor;
