import { min } from "lodash";
import { EPOCH } from "./Utils/Nostr";
import Relays from "@/nostr/Relays";

export class RelayMetadata {


    lastSync: number = 0;
}


// Handles the relays in the context of Dpeep
class RelayManager {

    logging = false;

    relays: Map<string, RelayMetadata> = new Map();

    activeRelays: Array<string> = [];

    constructor() {

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