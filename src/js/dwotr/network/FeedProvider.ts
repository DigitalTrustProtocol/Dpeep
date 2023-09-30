import { Event } from 'nostr-tools';
import { ICursor } from './ICursor';
import { ID, UID } from '@/utils/UniqueIds';
import { ContextLoader } from './ContextLoader';
import relaySubscription from './RelaySubscription';
import { FeedOptions } from './WOTPubSub';
import { getNostrTime } from '../Utils';

export class FeedProvider {
  logging = true;

  pageSize = 10;

  viewStart: number = 0;
  viewEnd: number = this.pageSize;
  view: Array<Event> = [];

  peekBuffer: Array<Event> = [];
  buffer: Array<Event> = [];
  seen: Set<UID> = new Set<UID>();

  //peekCursor: ICursor;
  cursor: ICursor;

  more: boolean = false;
  loading: boolean = false;

  contextLoader = new ContextLoader();

  subNew: number = -1;
  peekUntil: number = 0;

  constructor(_cursor: ICursor, size = 10) {
    this.cursor = _cursor;
    // this.peekCursor = _cursor.clone();
    // this.peekCursor.until = undefined; // Ensure is that the new events are loaded
    // this.peekCursor.since = _cursor.until!;

    this.pageSize = size;
  }

  hasMore(): boolean {
    return !this.cursor.done;
  }

  isLoading(): boolean {
    return this.loading;
  }

  hasNew(): boolean {
    return this.peekBuffer.length > 0;
  }

  async load() {
    this.subNew = -1;
    this.viewStart = 0;
    this.viewEnd = 0;

    if (this.logging) console.log('FeedProvider:load:START');

    this.mapNew();

    return this.nextPage();
  }

  mapNew() {
    if(this.subNew != -1) return; // Already subscribed

    let feedOptions = this.cursor.feedOptions;
    let since = this.cursor.until || getNostrTime(); // Ensure is that only the new events are loaded

    if(this.logging) console.log('FeedProvider:mapNew', ' - since:', since);

    let options = {
      filter: { ...feedOptions.filter, since },
      onEvent: (event: Event, afterEose: boolean, relayUrl: string) => {
        // The event has been added to eventHandler memory, but not yet to the buffer
        if(this.logging) console.log('FeedProvider:mapNew:onEvent', event.id, event.kind, afterEose, relayUrl);

        if (feedOptions.filterFn?.(event) === false) return; // Filter out events that don't match the filterFn, undefined means match

        this.contextLoader.loadDependencies([event]).then(() => {
            if(this.logging) console.log('FeedProvider:mapNew:onEvent:peekBuffer', event.id, event.kind, afterEose, relayUrl);    
            this.peekBuffer.push(event);
        });

        feedOptions.onEvent?.(event, afterEose, relayUrl);
      },
      maxDelayms: 0,
      onClose: (subId: number) => {
        feedOptions.onClose?.(subId);
      },
    } as FeedOptions;

    this.subNew = relaySubscription.Map(options);
  }

  offNew(): void {
    relaySubscription.off(this.subNew);
  }

  mergeNew(): Array<Event> {
    let events = this.peekBuffer;
    this.peekBuffer = [];

    this.#sort(events);

    this.buffer = [...events, ...this.buffer];

    this.viewStart = 0;
    this.viewEnd = this.pageSize;

    let view = this.buffer.slice(this.viewStart, this.viewEnd);

    return view;
  }

  test = new Map<string, number>();

  // Gets called by the UI once when it needs more events, therefore be sure to return new events
  // If no new events are returned, the UI will stop calling this method
  // If no new events are available, return the current view
  async nextPage(): Promise<Array<Event>> {
    if (this.logging)
      console.log(
        'FeedProvider:nextPage',
        ' - Done:',
        this.cursor.done,
        ' - hasMore:',
        this.hasMore(),
        ' - PageSize:',
        this.pageSize,
        ' - View Start:',
        this.viewStart,
        ' - View End:',
        this.viewEnd,
        ' - Buffer:',
        this.buffer.length,
        ...this.#timeLogger(),
      );

    if (this.cursor.done) return this.view; // No more events to load

    let neededLength = this.viewEnd + this.pageSize;

    // Only load more if the buffer is running low
    let deltaItems = await this.#loadToBuffer();

    await this.contextLoader.loadDependencies(deltaItems);

    this.viewEnd = neededLength > this.buffer.length ? this.buffer.length : neededLength;

    this.view = this.buffer.slice(this.viewStart, this.viewEnd);

    this.test = new Map<string, number>();
    for (const e of this.view) {
      let t = this.test.get(e.id);

      if (t && t > 1) {
        console.error('FeedProvider:load:DUPLICATED FOUND:', e.id, e.kind, t);
      }
      if (t) this.test.set(e.id, t + 1);
      else this.test.set(e.id, 1);
    }

    if (this.logging)
      console.log(
        'FeedProvider:load:END',
        ' - View:',
        this.view.length,
        ' - Buffer:',
        this.buffer.length,
        ' - View Start:',
        this.viewStart,
        ' - View End:',
        this.viewEnd,
      );

    return this.view;
  }

  async #loadToBuffer(): Promise<Array<Event>> {
    // Wait for new events to be loaded
    //await this.#loadIncremental();

    if (this.logging)
      console.log(
        'FeedProvider:#loadToBuffer:after',
        ' - Cursor buffer:',
        this.cursor.count(),
        ...this.#timeLogger(),
      );

    this.loading = true;
    let remaning = this.pageSize;
    let filteredItems: Array<Event> = [];

    let requestCount = 0; // Safety net

    while (remaning > 0) {
      if (this.pageSize * 2 > this.cursor.count() && !this.cursor.done && requestCount < 10) {
        requestCount++; // Safety net
        await this.cursor.load();
      }

      let event = this.cursor.pop();
      if (event) {
        if (this.seen.has(ID(event.id))) continue;
        this.seen.add(ID(event.id));
        filteredItems.push(event);
        remaning--;
      }

      if (this.cursor.done && this.cursor.count() == 0) break;
    }
    this.loading = false;

    if (this.logging)
      console.log('FeedProvider:#loadToBuffer', ' - Items added:', filteredItems.length);

    //this.#sort(filteredItems);
    this.buffer.push(...filteredItems);

    return filteredItems;
  }

  #sort(items: Array<Event>) {
    items.sort((a, b) => b.created_at - a.created_at);
  }

  #timeLogger() {
    let items: String[] = [];
    let since = new Date(this.cursor.since * 1000);
    let until = new Date(this.cursor.until! * 1000);

    items.push(' - Since:');
    items.push(since.toLocaleString());

    items.push(' - Until:');
    items.push(until.toLocaleString());

    let span = (this.cursor.until! - this.cursor.since) * 1000;
    let spanMin = Math.floor(span / 1000 / 60);
    items.push(' - Span:');
    items.push(spanMin + ' minutes');

    let delta = this.cursor.delta * 1000;
    let deltaMin = Math.floor(delta / 1000 / 60);
    items.push(' - Delta:');
    items.push(deltaMin + ' minutes');

    return items;
  }
}
