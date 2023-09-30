import { Event } from 'nostr-tools';
import { FeedOptions } from './WOTPubSub';

export interface ICursor {
    until?: number;
    delta: number;
    since: number;
    done: boolean;
    feedOptions: FeedOptions;

    load(): Promise<number>;
    take(n: number): Event[];
    count(): number;
    peek(): Event;
    pop(): Event | undefined;
    
  }
  