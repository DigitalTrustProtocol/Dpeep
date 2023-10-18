import { useState } from 'react';

import Show from '../helpers/Show';
import Modal from '../modal/Modal';
import ProxyImg from '../ProxyImg.tsx';

import Embed from './index';

const Image: Embed = {
  regex: /(https?:\/\/\S+?\.(?:png|jpg|jpeg|gif|svg|webp)(?:\?\S*?)?)/gi,
  settingsKey: 'enableImages',
  component: ({ match, index }) => {
    const [showModal, setShowModal] = useState(false);
    const [hasError, setHasError] = useState(false);
    const onClick = (e) => {
      e.stopPropagation();
      setShowModal(true);
    };

    if (hasError) {
      return <div className="my-2 text-sm">{match}</div>;
    }

    return (
      <div
        key={match + index}
        className="flex justify-center items-center md:justify-start my-2"
      >
        <ProxyImg
          onError={() => setHasError(true)}
          onClick={onClick}
          className="my-2 rounded-xl md:max-h-96 max-w-full cursor-pointer border border-neutral-500"
          src={match}
        />
        <Show when={showModal}>
          <Modal centerVertically={true} onClose={() => setShowModal(false)}>
            <ProxyImg className="rounded max-h-[90vh] max-w-[90vw]" src={match} />
          </Modal>
        </Show>
      </div>
    );
  },
};

export default Image;
