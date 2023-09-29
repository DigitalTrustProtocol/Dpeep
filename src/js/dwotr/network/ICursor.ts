import { Event } from 'nostr-tools';

export interface ICursor {
    until?: number;
    delta: number;
    since: number;
    done: boolean;

    load(): Promise<number>;
    take(n: number): Event[];
    count(): number;
    peek(): Event;
    pop(): Event;
    
  }
  