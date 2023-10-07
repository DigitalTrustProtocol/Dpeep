import { useEffect, useState } from 'preact/hooks';
import { useIsMounted } from '@/dwotr/hooks/useIsMounted';
import { throttle } from 'lodash';
import { ID } from '@/utils/UniqueIds';

import { formatAmount } from '@/utils/Lightning';
import zapManager from '@/dwotr/ZapManager';
import relaySubscription from '@/dwotr/network/RelaySubscription';


export const useZaps = (messageId: string, loadGlobal: boolean) => {
    const [zapAmountByUser, setZapAmountByUser] = useState(new Map<string, number>());
    const [formattedZapAmount, setFormattedZapAmount] = useState('');
    const [zappedByMe, setZappedByMe] = useState(false);
  
    const isMounted = useIsMounted();
  
    useEffect(() => {
      let id = ID(messageId);
  
      let onEvent = throttle(() => {
        // At this point the event should have already been added to the note's zap data, so we can just get the zaps from there.
        // Therefore theres no need to process the event here.
        if (!isMounted()) return;
  
        const zap = zapManager.zaps.get(id);
        if (!zap) return; // No zaps for this event, should only happen if the event is invalid and has been discarded.
        
        setZappedByMe(zap.zappedByMe);
        setZapAmountByUser(zap.amountPerUser);
        setFormattedZapAmount(zap.amount > 0 ? formatAmount(zap.amount) : '');
      }, 1000, { leading: true, trailing: false });
  
      onEvent(); // Set initial zaps
      zapManager.onEvent.addListener(id, onEvent);
  
      if (!loadGlobal) return; // Do not subscribe on relay server as only WoT zaps are showen on the event.
      // Subscribe
      let unsubMapId = zapManager.mapZapsBy(ID(messageId), onEvent);
  
      // Return cleanup function
      return () => {
        relaySubscription.off(unsubMapId);
        zapManager.onEvent.removeListener(id, onEvent);
      };
    }, [messageId, loadGlobal]);
  
    return { zapAmountByUser, formattedZapAmount, zappedByMe };
  };
  