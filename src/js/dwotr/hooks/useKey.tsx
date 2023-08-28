import Key from "@/nostr/Key";
import { BECH32, ID, STR } from "@/utils/UniqueIds";
import { useEffect, useState } from "preact/hooks"

function createKeyData(str: string | undefined, defaultToMe: boolean = true, prefix: string = 'npub') {
  if(!str && !defaultToMe) {
    return {
      key: str,
      uid: 0,
      bech32Key: '',
      hexKey: '',
      isMe: false,
      myPubKey: ''
    }
  }

  const myPubKey = Key.getPubKey();
  const uid = ID(str || myPubKey);
  const hexKey = STR(uid);
  const bech32Key = BECH32(uid, prefix);
  return {
    key: str,
    uid,
    bech32Key,
    hexKey,
    isMe: hexKey === myPubKey,
    myPubKey
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