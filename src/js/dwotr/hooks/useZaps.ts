import { useEffect, useState } from 'preact/hooks';
import { useIsMounted } from '@/dwotr/hooks/useIsMounted';
import { throttle } from 'lodash';
import { UID } from '@/utils/UniqueIds';

import { formatAmount } from '@/utils/Lightning';
import zapManager from '@/dwotr/ZapManager';
import relaySubscription from '@/dwotr/network/RelaySubscription';


export const useZaps = (eventId: UID, loadGlobal: boolean) => {
    const [zapAmountByUser, setZapAmountByUser] = useState(new Map<string, number>());
    const [formattedZapAmount, setFormattedZapAmount] = useState('');
    const [zappedByMe, setZappedByMe] = useState(false);
  
    const isMounted = useIsMounted();
  
    useEffect(() => {
 
      let onEvent = throttle(() => {
        if (!isMounted()) return; // Component has been unmounted, discard event.

        // At this point the event should have already been added to the note's zap data, so we can just get the zaps from there.
        // Therefore theres no need to process the event here.
  
        const zap = zapManager.zaps.get(eventId);
        if (!zap) return; // No zaps for this event, should only happen if the event is invalid and has been discarded.
        
        setZappedByMe(zap.zappedByMe);
        setZapAmountByUser(zap.amountPerUser);
        setFormattedZapAmount(zap.amount > 0 ? formatAmount(zap.amount) : '');
      }, 1000, { leading: true, trailing: true });
  
      onEvent(); // Set initial zaps
      zapManager.onEvent.addListener(eventId, onEvent);
  
      if (!loadGlobal) return; // Do not subscribe on relay server as only WoT zaps are showen on the event.
      // Subscribe
      let unsubMapId = zapManager.mapZapsBy(eventId, onEvent);
  
      // Return cleanup function
      return () => {
        relaySubscription.off(unsubMapId);
        zapManager.onEvent.removeListener(eventId, onEvent);
      };
    }, [eventId, loadGlobal]);
  
    return { zapAmountByUser, formattedZapAmount, zappedByMe };
  };
  