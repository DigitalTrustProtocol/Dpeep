import { useEventContainer } from '@/dwotr/hooks/useEventContainer';
import { useKey } from '@/dwotr/hooks/useKey';
import InlineComponent from './InlineComponent';

type InLineQuoteProps = {
  id?: string;
};

export const InLineQuote = ({ id }: InLineQuoteProps) => {
  const { uid } = useKey(id);

  const { container } = useEventContainer(uid);

  return (
    <div className="border rounded-xl border-neutral-700 mt-4 mb-4 pt-2">
      <InlineComponent container={container} />
    </div>
  );
};
