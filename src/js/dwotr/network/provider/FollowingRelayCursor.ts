import { Event } from 'nostr-tools';
import eventManager from '@/dwotr/EventManager';
import { FeedOption } from '.';
import { RelayCursor } from './RelayCursor';
import { NoteContainer, ResolvedContainer } from '@/dwotr/model/ContainerTypes';
import { noteKinds } from '@/dwotr/Utils/Nostr';
import embedLoader from '../embed/EmbedLoader';
import noteManager from '@/dwotr/NoteManager';
import followManager from '@/dwotr/FollowManager';
import { STR } from '@/utils/UniqueIds';


class FollowingRelayCursor extends RelayCursor<NoteContainer> {
  newItems: NoteContainer[] = [];
  resolving = false;
  resolveTimer: any = undefined;

  authors = new Set<string>();
  kinds = new Set<number>();

  constructor(opts: FeedOption) {
    super(opts);
    noteKinds.forEach((kind) => this.kinds.add(kind));

    let authors = [...followManager.getFollows(this.options.user)].map((id) => STR(id) as string) || [];
    opts.filter = {
      ...opts.filter,
      kinds: Array.from(this.kinds),
      authors,
    };
  }

  eventHandler(event: Event) {
    let container = eventManager.getContainerByEvent(event) as NoteContainer;

    if (container.event!.created_at < this.until) return; // E.g.: since <= note.created_at <= until

    if (!this.include(container, Number.MAX_SAFE_INTEGER)) return; // Skip events that don't match the filterFn, undefined means match

    this.newItems.push(container);
  }

  #resolve = () => {
    if (this.resolving) return;
    this.resolving = true;

    let resolveList = (this.newItems as ResolvedContainer[]).filter((item) => !item.resolved).slice(0, 100); // Resolve the first 100 items
    let events = resolveList.map((item) => item.event!);

    embedLoader.resolve(events).finally(() => {
    
      resolveList.forEach((item) => item.resolved = true);

      this.newDataCount += resolveList.length;
      this.resolving = false;
    });
  }

  hasNew(): boolean {
    return !!this.newDataCount;
  }


  mount() {
    // Listen to new events
    noteManager.onEvent.addGenericListener(this.eventHandler.bind(this));
    // Resolve new events every second
    this.resolveTimer = setInterval(this.#resolve, 1000);
  }

  unmount() {
    noteManager.onEvent.removeGenericListener(this.eventHandler.bind(this));
    clearInterval(this.resolveTimer);
  }


  include(container: NoteContainer, until = this.until): boolean {
    if (!container) return false;
    let note = container.event!;

    if (note.created_at > until) return false; // E.g.: since <= note.created_at <= until
    if (note.created_at < this.since) return false; // E.g.: since <= note.created_at <= until
    if (!this.authors.has(container?.event?.pubkey!)) return false; // If user is not following the author, skip
    if (!this.kinds.has(note.kind)) return false; // Only show reposts and notes
    if (!this.options?.includeReplies && container.subtype == 2) return false; // Skip replies
    if (!this.options?.includeReposts && container.subtype == 3) return false; // Skip reposts

    if (this.options.postFilter && !this.options.postFilter(container)) return false; // Skip events that don't match the filterFn, undefined means match

    return true;
  }

}

export default FollowingRelayCursor;
