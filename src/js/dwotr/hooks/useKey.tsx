import Key from "@/nostr/Key";
import Helpers from "@/utils/Helpers";
import { BECH32, ID, STR } from "@/utils/UniqueIds";
import { bech32 } from "bech32";
import { useEffect, useState } from "preact/hooks"


// function decode(str: string | undefined): { prefix: string, hex: string} {
//     if (!str) {
//       console.error('useKey: no input');
//       return { prefix:'', hex:'' };
//     }
//     if (str.length == 64) {
//       return { prefix:'npub', hex:str };
//     }
//     try {
//       const { prefix, words } = bech32.decode(str);
//       const data = new Uint8Array(bech32.fromWords(words));
//       const addr = Helpers.arrayToHex(data);
//       return { prefix, hex:addr };
//     } catch (e) {
//       // not a bech32 address
//     }
//     return { prefix:'', hex:'' };
//   },

function createKeyData(str: string | undefined, defaultToMe: boolean = true, prefix: string = 'npub') {
  if(!str && !defaultToMe) {
    return {
      key: str,
      uid: 0,
      bech32Key: '',
      hexKey: '',
      isMe: false,
      myPubKey: '',
      myId: 0,
    }
  }

  //const { prefix, hex } = decode(str);
  const myPubKey = Key.getPubKey();
  const myId = ID(myPubKey);
  const uid = ID(str || myPubKey);
  const hexKey = STR(uid);
  const bech32Key = BECH32(uid, prefix);
  return {
    key: str,
    uid,
    bech32Key,
    hexKey,
    isMe: myId === uid,
    myPubKey,
    myId,
  };
}

export function useKey(str: string | undefined, defaultToMe: boolean = true, prefix: string = 'npub') {
  const [keyData, setKeyData] = useState(createKeyData(str, defaultToMe, prefix));

  useEffect(() => {
    if(!str || str === keyData.key) return;

    const data = createKeyData(str, defaultToMe, prefix);
    setKeyData(data);
  }, [str, prefix]);

  return keyData;
}