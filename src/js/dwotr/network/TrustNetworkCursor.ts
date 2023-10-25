import { Event } from 'nostr-tools';
import { FeedOption } from './WOTPubSub';
import { ID, UID } from '@/utils/UniqueIds';
import NotesCursor from './NotesCursor';
import noteManager from '../NoteManager';
import eventManager from '../EventManager';
import { NoteContainer } from '../model/ContainerTypes';
import graphNetwork from '../GraphNetwork';
import { EntityType, Vertice } from '../model/Graph';

class TrustNetworkCursor extends NotesCursor {
  constructor(opt: FeedOption, seen?: Set<UID>) {
    super(opt, seen);
    this.kinds.add(1);
  }

  proLoad() {
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

  eventHandler(event: Event) {
    let container = eventManager.containers.get(ID(event.id)) as NoteContainer;

    if (container.event!.created_at < this.until) return false; // E.g.: since <= note.created_at <= until
    if (!this.accept(container)) return; // Skip events that don't match the filterFn, undefined means match

    this.preBuffer.push(event);
  }

  subscribe() {
    noteManager.onEvent.addGenericListener(this.eventHandler.bind(this));
  }

  unsubscribe() {
    noteManager.onEvent.removeGenericListener(this.eventHandler.bind(this));
  }
}

export default TrustNetworkCursor;
