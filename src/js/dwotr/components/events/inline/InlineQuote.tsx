import { useKey } from '@/dwotr/hooks/useKey';
import InlineComponent from './InlineComponent';
import eventManager from '@/dwotr/EventManager';

type InLineQuoteProps = {
  id?: string;
};

const InLineQuote = ({ id }: InLineQuoteProps) => {
  const { uid } = useKey(id);

  const container = eventManager.getContainer(uid);

  return (
    <div className="border rounded-xl border-neutral-700 mt-4 mb-4 pt-2">
      <InlineComponent container={container} />
    </div>
  );
};

export default InLineQuote;