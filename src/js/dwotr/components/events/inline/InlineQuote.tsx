import { useKey } from '@/dwotr/hooks/useKey';
import InlineComponent from './InlineComponent';
import eventManager from '@/dwotr/EventManager';

type InLineQuoteProps = {
  id?: string;
};

const InLineQuote = ({ id }: InLineQuoteProps) => {
  const { uid } = useKey(id);


  const container = eventManager.containers.get(uid);
  //const { container, setContainer } = useEventContainer(uid);

  // useEffect(() => {
  //   if(container) return;

  //   relaySubscription.getEventByIds([STR(uid) as string]).then((events) => {
  //     if(events.length > 0) {
  //       let temp = eventManager.containers.get(uid);
  //       if(!temp) return;
  //       setContainer(temp);
  //     }
  //   });

  // }, [container]);


  return (
    <div className="border rounded-xl border-neutral-700 mt-4 mb-4 pt-2">
      <InlineComponent container={container} />
    </div>
  );
};

export default InLineQuote;