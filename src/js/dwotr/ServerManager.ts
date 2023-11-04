import { min } from "lodash";
import { EPOCH } from "./Utils/Nostr";
import Relays from "@/nostr/Relays";
import { BulkStorage } from "./network/BulkStorage";
import storage from "./Storage";
import { UID } from "@/utils/UniqueIds";
import followManager from "./FollowManager";
import recommendRelayManager from "./RecommendRelayManager";


export type PublicRelaySettings = {
    read: boolean;
    write: boolean;
  };
  
export class RelayRecord {
    url: string = '';
    read: boolean = true;
    write: boolean = true;
    auth: boolean = false; // If the relay requires authentication
    enabled: boolean = true; // If the relay is enabled
    eventCount: number = 0; // Number of events received from this relay, higher is better
    referenceCount: number = 0; // Number of references to this relay by users and events, higher is better
    recommendCount: number = 0; // Number of recommendations for this relay, higher is better
    timeoutCount: number = 0; // Number of timeouts from this relay, lower is better
    lastSync: number = 0; // Last time this relay was synced with the client
    lastActive: number = 0;  // Used to determine if a relay is active or not
}


// Handles the relays in the context of Dpeep
// RelayManager name is too close to ReplyManager so it was renamed to ServerManager
class ServerManager {

    logging = false;

    relays: Map<string, RelayRecord> = new Map();

    //userRelays: Map<UID, Set<string>> = new Map(); // Relays used by the user or recommended or within the contact content, used to determine which relays to use when querying for events

    table = new BulkStorage(storage.relays);

    activeRelays: Array<string> = [];


    getRelayRecord(relay: string) : RelayRecord {
        let relayData = this.relays.get(relay);
        if(!relayData) {
            relayData = new RelayRecord();
            this.relays.set(relay, relayData);
        }
        return relayData;
    }


    incrementRefCount(relay: string) {
        let relayData = this.getRelayRecord(relay);
        relayData.referenceCount++;
        this.save(relayData);
    }

    incrementEventCount(relay: string | undefined) {
        if(!relay) return;
        let relayData = this.getRelayRecord(relay);
        relayData.eventCount++;
        this.save(relayData);
    }

    // Get the relays used by the user or recommended or within the contact content, used to determine which relays to use when querying for events
    getReadRelaysBy(authorId: UID) : Array<string> {
        let result = new Set<string>();
        let network = followManager.getFollowNetwork(authorId);
        for(let [relay, value]  of network.relays) {
            if(value.read)
                result.add(relay);
        }
        let recommendRelays = recommendRelayManager.authorRelays.get(authorId);
        if(recommendRelays) {
            for(let relay of recommendRelays) {
                result.add(relay);
            }
        }
        return [...result];
    }

    getBestReadRelays(numberOfRelays: number = 10) : Array<string> {
        let relays = Array.from(this.relays.values()).filter((r) => r.read).sort((a, b) => b.eventCount - a.eventCount);
        return relays.map((r) => r.url).slice(0,numberOfRelays);
    }


    getActiveRelays(extraRelays: string[]) : Array<string> {
        let relays = Array.from(new Set([...extraRelays || [], ...this.enabledRelays()])).filter((r) => r && r.length > 0);
        return relays;
    }




    enabledRelays() : Array<string> {
        if(this.activeRelays.length === 0) {
            this.activeRelays = Relays.enabledRelays();
            for(const url of this.activeRelays) {
                if(!this.relays.has(url))
                    this.relays.set(url, new RelayRecord());
            }
        }

        return this.activeRelays;
    }




    removeActiveRelay(relay: string) {
        if(this.logging)
            console.log('RelayManager:removeActiveRelay:', relay);
        this.activeRelays = this.activeRelays.filter((r) => r !== relay);
    }

    getLastSync(relayData: RelayRecord[]) : number  {
        return min(relayData.map((r) => r.lastSync)) || EPOCH;
    }


    async load() : Promise<void> {
        let records = await this.table.toArray();
        for(let record of records) {
            this.relays.set(record.url, record);
        }
    }

    save(record: RelayRecord) : void
    {
        this.table.save(record.url, record); // Save to the database, async in bulk
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

const serverManager = new ServerManager();
export default serverManager;


// urlCount = 0;
// urlId: Map<string, number> = new Map();
// urlLookup: Map<number, string> = new Map();
// sourceRelays: Map<UID, Set<number>> = new Map(); // Event Id, Relay Ids. Possible source relays for the event id, used to specify the relay to use when querying for the event


    
// addRelayUrl(url: string) : number {
//     if(this.urlId.has(url)) 
//         return this.urlId.get(url) || 0;

//     const id = ++this.urlCount;
//     this.urlLookup.set(id, url);
//     this.urlId.set(url, id);
//     return id;
// }

// getRelayUrl(id: number) : string {
//     return this.urlLookup.get(id) || '';
// }

// getRelayId(url: string) : number {
//     return this.urlId.get(url) || 0;
// }

// addSourceRelay(eventId: UID, relayId: number) {
//     if(!this.sourceRelays.has(eventId))
//         this.sourceRelays.set(eventId, new Set());
//     this.sourceRelays.get(eventId)?.add(relayId);
// }