import { FeedProvider } from "./network/FeedProvider";
import { FeedOption } from "./network/WOTPubSub";
import { EventRelayCursor } from "./network/EventRelayCursor";
import { RelayEventProvider } from "./network/RelayEventProvider";
import { ICursor } from "./network/types";
import EventMemoryCursor from "./network/EventMemoryCursor";


class FeedManager {

    // A collection of feeds, each feed is a collection of events
    // Used to store previous loaded events, so that they can quickly be retrieved
    //lists: Map<string, Events> = new Map();
    providers: Map<string, FeedProvider> = new Map(); 

    getProvider(opt: FeedOption): FeedProvider {
        if(!opt.id || opt.id == 'default') return this.createProvider(opt); // No feedId, return fresh provider, and the it will not be stored
        let provider = this.providers.get(opt.id!);
        if(!provider) {
            provider = this.createProvider(opt);
            this.providers.set(opt.id!, provider);
        }
        return provider;
        //return this.createProvider(opt); // Always return a fresh provider, as follows may have changed.
    }

    createProvider(opt: FeedOption): FeedProvider {
        return new FeedProvider(opt.id ?? 'default', this.#createCursor(opt), new RelayEventProvider(opt));
    }


    #createCursor(opt: FeedOption): ICursor
    {
        if(opt.cursor) return opt.cursor();

        if(opt.source == 'memory') {
            return new EventMemoryCursor(opt, 100);
        }

        return new EventRelayCursor(opt, 100);
    }
}

const feedManager = new FeedManager();
export default feedManager;