import { Event } from 'nostr-tools';
import { FeedOption } from './provider';
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

    preLoad(): Event[];
    load(): Promise<number>;
    take(n: number): Event[];
    count(): number;
    newCount(): number;
    peek(): Event | undefined;
    pop(): Event | undefined;

    subscribe(): void;
    unsubscribe(): void;
    reset(): void;
   
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

    feedOptions: FeedOption;

    map(feedOptions: FeedOption): void;
    take(n: number): Event[];
    count(): number;
    peek(): Event | undefined;
    pop(): Event | undefined;
    off(): void;
}