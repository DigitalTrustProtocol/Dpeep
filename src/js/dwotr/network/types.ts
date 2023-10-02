import { Event } from 'nostr-tools';
import { FeedOptions } from './WOTPubSub';

export type Events = Array<Event>;
export type FeedContext = {
    list: Events;
    until: number | undefined;
    since: number | undefined;
}


export interface ICursor {
    until?: number;
    delta: number;
    since: number;
    done: boolean;
    feedOptions: FeedOptions;

    load(): Promise<number>;
    take(n: number): Event[];
    count(): number;
    peek(): Event | undefined;
    pop(): Event | undefined;
   
  }

  
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