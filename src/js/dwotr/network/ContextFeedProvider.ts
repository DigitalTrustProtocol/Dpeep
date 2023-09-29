import { RelayEventCursor } from "./RelayEventCursor";
import { FeedOptions } from "./WOTPubSub";
import { ContextLoader } from "./ContextLoader";



// Purpose: Deliver a stream of events from the network or context
// 

export class ContextFeedProvider {







    subscribeOptions: FeedOptions;

    cursor: RelayEventCursor;
    contextLoader: ContextLoader; 

    constructor(subscribeOptions: FeedOptions) {
        this.subscribeOptions = subscribeOptions;
        this.cursor = new RelayEventCursor(subscribeOptions);
        this.contextLoader = new ContextLoader();
    }





    async load(n: number) {
        console.time('FeedLoader:load');
        let count = 0;
        for(let i = 0; i < 5; i++) {
            count += await this.cursor.load(n);
            if(count >= n) break;
        }
        console.timeEnd('FeedLoader:load');
        
        let events = this.cursor.take(n);
        console.log('FeedLoader:load.events', events.length);
        if(!events) return [];

        console.time('FeedLoader:context');
        let result = await this.contextLoader.loadDependencies(events);
        console.timeEnd('FeedLoader:context');
        return result;
    }




}

