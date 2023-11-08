import graphNetwork from '../../GraphNetwork';
import { EntityType, Vertice } from '../../model/Graph';
import { FeedOption } from '../provider';
import { NotesCursor } from './NotesCursor';

class TrustNetworkCursor extends NotesCursor {
  constructor(opt: FeedOption) {
    super(opt);
    this.kinds.add(1);
    this.init();
  }

  init() {
    // Find all trusted keys (authors)
    const filter = (v: Vertice) => {
      if (v.entityType != EntityType.Key) return false;
      if (!v.score.trusted()) return false;
      return true;
    };

    for (const v of graphNetwork.g.filterVertices(filter) || []) {
      this.authors.add(v.id);
    }
  }

}

export default TrustNetworkCursor;
