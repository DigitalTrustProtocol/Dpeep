import { Cursor } from '.';
import { FeedOption } from '../provider';
import { EPOCH } from '@/dwotr/Utils/Nostr';
import { getNostrTime } from '@/dwotr/Utils';

export class BaseCursor<T> implements Cursor<T> {
  newDataCount: number = 0;
  done: boolean = false;
  
  options: FeedOption;
  until: number = Number.MAX_SAFE_INTEGER;
  since: number = EPOCH;

  constructor(opt: FeedOption) {
    this.options = opt;
    this.until = this.options.filter?.until ?? getNostrTime();
    this.since = this.options.filter?.since ?? EPOCH;
  }

  isDone() : boolean {
    return this.done;
  }

  hasNew(): boolean {
    return !!this.newDataCount;
  }

  mount() {
  }

  unmount() {
  }

  preLoad(): T[] {
    return [];
  }

  async next(): Promise<T | undefined> {
    return undefined;
  }

  reset() {
    this.until = getNostrTime();
    this.done = false;
    this.newDataCount = 0;
  }
}
