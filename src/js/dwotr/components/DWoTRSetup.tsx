// import { useEffect } from "preact/hooks";
// import graphNetwork from "../GraphNetwork";
// import Key from "../../nostr/Key";
// //import PubSub from "@/nostr/PubSub";
// //import profileManager from "../ProfileManager";
// //import diagnostics from "../Utils/Diagnostics";
// //import eventManager from "../EventManager";
// //import PubSub from "@/nostr/PubSub";


// export default function DWoTRSetup() {

//     useEffect(() => {
//         let author = Key.getPubKey();
//         if(author) {
//             graphNetwork.init(author);
//         }

//         setInterval(() => {
            
//             // console.log("PubSub subscriptions:", PubSub.subscriptions.size);
//             // console.log("PubSub unsubscribe:", profileManager.subscriptions.unsubscribe.size);
//             // console.log("PubSub subscribed Authors / check sum:", PubSub.subscribedAuthors.size, eventManager.subscribedAuthors.size);
//             //console.log("-------------------------------------- DIAGNOSTICS --------------------------------------");
//             //diagnostics.printAll();

//         }, 3000);

//         return () => {
//             // Gets called on page change
//             //graphNetwork.unsubscribeAll();
//           }
//     }, [])

//     return null;
// }