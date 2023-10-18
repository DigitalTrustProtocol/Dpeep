import { BoltIcon } from '@heroicons/react/24/outline';
import { useState } from 'preact/hooks';

import Show from '@/components/helpers/Show';
import { useProfile } from  '@/dwotr/hooks/useProfile';
import useLocalState from '@/state/useLocalState.ts';
import Icons from '@/utils/Icons';

import ZapModal from '../../modal/Zap';
import { useZaps } from '@/dwotr/hooks/useZaps';
import { ID } from '@/utils/UniqueIds';

const Zap = ({ event }) => {
  const [state, setState] = useState({ showZapModal: false });

  const { formattedZapAmount, zappedByMe } = useZaps(event.id, false);

  const [defaultZapAmount] = useLocalState('defaultZapAmount', 0);
  const [longPress, setLongPress] = useState(false); // state to determine if it's a long press
  const { profile } = useProfile(ID(event.pubkey));
  const lightning = profile?.lud16 || profile?.lud06;

  let pressTimer: any = null;

  const handleButtonClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!state.showZapModal) {
      setState((prevState) => ({ ...prevState, showZapModal: true }));
    }
  };

  const onMouseDown = (e) => {
    pressTimer = setTimeout(() => {
      setLongPress(true);
      handleButtonClick(e); // Open the modal after 500ms of mouseDown
    }, 500);
  };

  const onMouseUp = (e) => {
    e.preventDefault();
    e.stopPropagation();
    clearTimeout(pressTimer);
    if (!longPress) {
      handleButtonClick(e); // Open the modal on short press
    }
    setLongPress(false); // Reset the longPress state after handling
  };

  return lightning ? (
    <>
      <a
        onMouseDown={onMouseDown}
        onMouseUp={onMouseUp}
        className={`btn-ghost btn-sm hover:bg-transparent btn content-center rounded-none
          ${zappedByMe ? 'text-iris-orange' : 'text-neutral-500 hover:text-iris-orange'}`}
      >
        <Show when={defaultZapAmount}>{Icons.quickZap}</Show>
        <Show when={!defaultZapAmount}>
          <BoltIcon width={18} />
        </Show>
        {/* {formattedZapAmount} */}
      </a>
      {state.showZapModal && (
        <ZapModal
          quickZap={!!defaultZapAmount && !longPress}
          show={true}
          lnurl={lightning}
          note={event.id}
          recipient={event.pubkey}
          onClose={() => setState((prevState) => ({ ...prevState, showZapModal: false }))}
        />
      )}
    </>
  ) : null;
};

export default Zap;
