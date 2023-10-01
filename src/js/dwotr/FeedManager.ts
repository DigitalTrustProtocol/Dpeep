import { FeedProvider } from "./network/FeedProvider";
import { FeedOptions } from "./network/WOTPubSub";
import { EventCursor } from "./network/CursorRelay";
import { RelayEventProvider } from "./network/RelayEventProvider";


class FeedManager {

    // A collection of feeds, each feed is a collection of events
    // Used to store previous loaded events, so that they can quickly be retrieved
    //lists: Map<string, Events> = new Map();
    providers: Map<string, FeedProvider> = new Map();

    getProvider(opt: FeedOptions): FeedProvider {
         if(!opt.id || opt.id == 'default') return this.createProvider(opt); // No feedId, return fresh provider, and the it will not be stored
        let provider = this.providers.get(opt.id!);
        if(!provider) {
            provider = this.createProvider(opt);
            this.providers.set(opt.id!, provider);
        }
        return provider;
    }

    createProvider(opt: FeedOptions): FeedProvider {
        return new FeedProvider(new EventCursor(opt, 100), new RelayEventProvider(opt));
    }


    // getList(feedId: string | undefined): Events {
    //     if(!feedId || feedId == 'default') return []; // No feedId, return empty list, and the list will not be stored

    //     let feed = this.lists.get(feedId!);
    //     if(!feed) {
    //         feed = [];
    //         this.lists.set(feedId!, feed);
    //     }
    //     return feed;
    // }

    // getContext(feedId: string | undefined): FeedContext {
    //     let list = this.getList(feedId) 
    //     return {
    //         list,
    //         until: this.#getUntil(list),
    //         since: this.#getSince(list),
    //     }
    // }



}

const feedManager = new FeedManager();
export default feedManager;