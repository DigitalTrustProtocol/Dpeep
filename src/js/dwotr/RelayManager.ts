import { min } from "lodash";
import { EPOCH } from "./Utils/Nostr";
import Relays from "@/nostr/Relays";
import { UID } from "@/utils/UniqueIds";

export class RelayMetadata {


    lastSync: number = 0;
}


// Handles the relays in the context of Dpeep
class RelayManager {

    logging = false;

    urlCount = 0;
    urlId: Map<string, number> = new Map();
    urlLookup: Map<number, string> = new Map();
    sourceRelays: Map<UID, Set<number>> = new Map(); // Event Id, Relay Ids. Possible source relays for the event id, used to specify the relay to use when querying for the event

    relays: Map<string, RelayMetadata> = new Map();




    activeRelays: Array<string> = [];

    constructor() {

    }

    
    addRelayUrl(url: string) : number {
        if(this.urlId.has(url)) 
            return this.urlId.get(url) || 0;

        const id = ++this.urlCount;
        this.urlLookup.set(id, url);
        this.urlId.set(url, id);
        return id;
    }

    getRelayUrl(id: number) : string {
        return this.urlLookup.get(id) || '';
    }

    getRelayId(url: string) : number {
        return this.urlId.get(url) || 0;
    }

    addSourceRelay(eventId: UID, relayId: number) {
        if(!this.sourceRelays.has(eventId))
            this.sourceRelays.set(eventId, new Set());
        this.sourceRelays.get(eventId)?.add(relayId);
    }





    enabledRelays() : Array<string> {
        if(this.activeRelays.length === 0) {
            this.activeRelays = Relays.enabledRelays();
            for(const url of this.activeRelays) {
                if(!this.relays.has(url))
                    this.relays.set(url, new RelayMetadata());
            }
        }

        return this.activeRelays;
    }

    removeActiveRelay(relay: string) {
        if(this.logging)
            console.log('RelayManager:removeActiveRelay:', relay);
        this.activeRelays = this.activeRelays.filter((r) => r !== relay);
    }

    getLastSync(relayData: RelayMetadata[]) : number  {
        return min(relayData.map((r) => r.lastSync)) || EPOCH;
    }


    async load() : Promise<void> {
        return Promise.resolve();
    }

    // #getRelayData(relay: string) : RelayMetadata {
    //     let relayData = this.relays.get(relay);
    //     if(!relayData) {
    //         relayData = new RelayMetadata();
    //         this.relays.set(relay, relayData);
    //     }
    //     return relayData;
    // }
    




}

const relayManager = new RelayManager();
export default relayManager;