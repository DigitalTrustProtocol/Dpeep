import { useEffect } from "preact/hooks";
import graphNetwork from "../GraphNetwork";
import Key from "../../nostr/Key";
import PubSub from "@/nostr/PubSub";
import profileManager from "../ProfileManager";
//import PubSub from "@/nostr/PubSub";


export default function DWoTRSetup() {

    useEffect(() => {
        let author = Key.getPubKey();
        if(author) {
            graphNetwork.init(author);
        }

        setInterval(() => {
            console.log("PubSub / Profile subscriptions: ", PubSub.subscriptions.size, profileManager.subscriptions.unsubscribe.size);

        }, 3000);

        return () => {
            // Gets called on page change
            //graphNetwork.unsubscribeAll();
          }
    }, [])

    return null;
}