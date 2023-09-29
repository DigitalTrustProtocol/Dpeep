import { Event } from 'nostr-tools';
import { ICursor } from './ICursor';
import { ID, UID } from '@/utils/UniqueIds';
import { getNostrTime } from '../Utils';
import { ContextLoader } from './ContextLoader';


export class FeedProvider {

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

    constructor(_cursor: ICursor, size = 10) {
        this.cursor = _cursor;
        // this.peekCursor = _cursor.clone();
        // this.peekCursor.until = undefined; // Ensure is that the new events are loaded
        // this.peekCursor.since = _cursor.until!;
        this.pageSize = size;
    }

    hasMore(): boolean {
        return this.viewEnd < this.buffer.length;
    }

    isLoading(): boolean {
        return this.loading;
    }

    hasNew(): boolean {
        //return this.peekBuffer.length > 0;
        return false;
    }

    async peekNew(): Promise<number> {
        // if(this.peekCursor.done) return this.peekBuffer.length;

        // if(this.peekCursor.since < this.cursor.until!) return this.peekBuffer.length;

        // let count = await this.peekCursor.load() as number;
        // if(count == 0) return this.peekBuffer.length;

        // let newEvents = this.peekCursor.take(count);
        // newEvents = newEvents.filter(e => !this.seen.has(ID(e.id)));
        // if(newEvents.length == 0) return this.peekBuffer.length;

        // this.#sort(newEvents);
        // this.peekBuffer.push(...newEvents);

        // return this.peekBuffer.length;
        return 0;
    }

    async load() {
        this.viewStart = 0;
        this.viewEnd = this.pageSize;

        // if(this.peekBuffer.length  >  0 ) {
        //     if(this.peekCursor.since > this.cursor.until!) {
        //         // More events can be loaded between the peekCursor and the feedCursor
        //         this.buffer = this.peekBuffer;
        //         this.peekBuffer = [];
        //         this.cursor = this.peekCursor; // The feedCursor is now the peekCursor
        //         this.cursor.until = this.buffer[0]?.created_at ?? getNostrTime();

        //         this.peekCursor = this.peekCursor.clone();
        //         this.peekCursor.until = undefined;
        //         this.peekCursor.since = this.cursor.until + 1;
        //     } else {
        //         // All events has been loaded between the peekCursor and the feedCursor
        //         this.buffer = [...this.peekBuffer, ...this.buffer];
        //         this.peekBuffer = [];
        //         this.peekCursor = this.peekCursor.clone();
        //         this.peekCursor.since = this.buffer[0]?.created_at ?? getNostrTime();
        //         this.peekCursor.until = undefined;
        //     }
        // }

        return this.nextPage();
    }

    test = new Map<string, number>();

    async nextPage() : Promise<Array<Event>> {
        if(this.cursor.done) return this.view; // No more events to load

        let neededLength = this.viewEnd + this.pageSize;

        // Only load more if the buffer is running low
        if(neededLength > this.buffer.length) {
            let items = await this.#loadToBuffer();
            console.log('FeedProvider:load', items.length, items)
            await this.contextLoader.loadDependencies(items);
        }

        

        this.viewEnd = (neededLength > this.buffer.length) ? this.buffer.length : neededLength;

        this.view = this.buffer.slice(this.viewStart, this.viewEnd);

        this.test = new Map<string, number>();
        for(const e of this.view) {

            let t = this.test.get(e.id);

            if(t && t > 1) {
                console.log('FeedProvider:load:DUPLICATE2', e.id, e.kind, t);
            } 
            if(t) this.test.set(e.id, t + 1);
            else this.test.set(e.id, 1);
        }
        
        return this.view;
    }


    async #loadToBuffer(): Promise<Array<Event>> {

        // Wait for new events to be loaded
        await this.#loadIncremental(); 
        
        let items = this.cursor.take(10); // Take max 1000 events at a time, should't be more than 50
        if(items.length == 0) return [];


        // Remove duplicates
        for(const e of items) {
            if(this.seen.has(ID(e.id))) continue;
            this.seen.add(ID(e.id));
            this.buffer.push(e);
        }
        // items = items.filter(e => !this.seen.has(ID(e.id)));
        // if(items.length == 0) return [];

        // // Add to seen
        // items.forEach(e => this.seen.add(ID(e.id)));

        // this.#sort(items);

        // this.buffer.push(...items);

        return items;
    }

    async #loadIncremental() {
        this.loading = true;
        for(let i = 0; i < 5; i++) {
            let loaded = await this.cursor.load();
            if(loaded >= this.pageSize) break;
        }
        this.loading = false;
    }

    #sort(items: Array<Event>) {
        items.sort((a, b) => b.created_at - a.created_at);
    }



}
