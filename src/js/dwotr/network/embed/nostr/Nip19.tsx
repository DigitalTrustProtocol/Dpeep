import { nip19 } from 'nostr-tools';

import Embed, { EmbedData } from '../index';

const nip19Regex = /\bnostr:(n(?:event|profile)1\w+)\b/g;

const NostrNip19: Embed = {
  regex: nip19Regex,
  component: ({ match }) => {
    let r = new EmbedData();
    try {
      match = match.replace('nostr:', '');
      const { type, data } = nip19.decode(match);
      
      if (type === 'nprofile') {
        let { pubkey, relays } = data;
        r.setAuthor({ author: pubkey, relays });
        
      } else if (type === 'nevent') {

        let { id, relays, author } = data;

        r.setEvent({ id, author, relays });
      }
        //r.setEvent(data);

      //if(data.author && data.author.length == 64) // Add author if it's a pubkey
//        r.setAuthor(data);
      //} 
    } catch (e) {
      console.log(e);
    }
    return r;
  },
};

export default NostrNip19;


// {
//   "content": "Puzzles me still. \n\nnostr:nevent1qqs2awy0ms4y7kmfnw7lu6zfwyf632y0cv9g56a7vxxflkf8pvcs7mcpz9mhxue69uhkummnw3ezuamfdejj7q3ql2vyh47mk2p0qlsku7hg0vn29faehy9hy34ygaclpn66ukqp3afqxpqqqqny535ku3k",
//   "created_at": 1698225600,
//   "id": "145658d0141acde2544e54a2d29e4a0cbdb34b156331f26fc4ec29e6ac24a500",
//   "kind": 1,
//   "pubkey": "6e468422dfb74a5738702a8823b9b28168abab8655faacb6853cd0ee15deee93",
//   "sig": "500e44e386f2bdbc3f61acc867cb94ec8bfc0b05d82a3b4965a3ee11098cf92858bb01b4b6bbc48711aaa61df5cbd905941f85513393f57526e0b6e72b5a6eda",
//   "tags": [
//     [
//       "e",
//       "aeb88fdc2a4f5b699bbdfe68497113a8a88fc30a8a6bbe618c9fd9270b310f6f",
//       "",
//       "mention"
//     ],
//     [
//       "p",
//       "fa984bd7dbb282f07e16e7ae87b26a2a7b9b90b7246a44771f0cf5ae58018f52",
//       "",
//       "mention"
//     ]
//   ]
// }

// -> EventID: aeb88fdc2a4f5b699bbdfe68497113a8a88fc30a8a6bbe618c9fd9270b310f6f
// "I’m constantly surprised that, even though most people do read a lot online, very few people seem to have a reading workflow or reading tools."