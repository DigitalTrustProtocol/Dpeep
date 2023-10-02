import { min } from "lodash";
import { EPOCH } from "./Utils/Nostr";
import Relays from "@/nostr/Relays";

export class RelayMetadata {


    lastSync: number = 0;
}


// Handles the relays in the context of Dpeep
class RelayManager {


    relays: Map<string, RelayMetadata> = new Map();

    constructor() {

    }

    // Get all relays data
    async load() {

    }

    getActiveRelays() : Array<RelayMetadata> {
        return Relays.enabledRelays().map((url) => this.#getRelayData(url));
    }

    getLastSync(relayData: RelayMetadata[]) : number  {
        return min(relayData.map((r) => r.lastSync)) || EPOCH;
    }

    #getRelayData(relay: string) : RelayMetadata {
        let relayData = this.relays.get(relay);
        if(!relayData) {
            relayData = new RelayMetadata();
            this.relays.set(relay, relayData);
        }
        return relayData;
    }
    




}

const relayManager = new RelayManager();
export default relayManager;