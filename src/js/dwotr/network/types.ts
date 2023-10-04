import { Event } from 'nostr-tools';
import { FeedOptions } from './WOTPubSub';
import { UID } from '@/utils/UniqueIds';
import { Reaction } from '../ReactionManager';

export type Events = Array<Event>;
export type FeedContext = {
    list: Events;
    until: number | undefined;
    since: number | undefined;
}


export type ReactionEvent = Event & {
    meta?: Reaction;
}

export interface ICursor {
    until?: number;
    delta: number;
    since: number;
    done: boolean;

    load(): Promise<number>;
    take(n: number): Event[];
    count(): number;
    peek(): Event | undefined;
    pop(): Event | undefined;
   
  }

  // export interface ITCursor<T> extends ICursor {
  //   until?: number;
  //   delta: number;
  //   since: number;
  //   done: boolean;
  //   feedOptions: FeedOptions;

  //   load(): Promise<number>;
  //   take(n: number): T[];
  //   count(): number;
  //   peek(): T | undefined;
  //   pop(): T | undefined;
   
  // }
  
export interface IEventProvider {
    logging: boolean;
    buffer: Array<Event>;
    subId: number;

    feedOptions: FeedOptions;

    map(feedOptions: FeedOptions): void;
    take(n: number): Event[];
    count(): number;
    peek(): Event | undefined;
    pop(): Event | undefined;
    off(): void;
}