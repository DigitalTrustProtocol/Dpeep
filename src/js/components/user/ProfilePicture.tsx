import { useState } from 'preact/hooks';

import Modal from '../modal/Modal';
import ProxyImg from '../ProxyImg.tsx';
import Show from '../helpers/Show.tsx';
import { UserIcon } from '@heroicons/react/24/outline';

type Props = { picture?: string; onError?: () => void };

const ProfilePicture = ({ picture, onError }: Props) => {
  const [showModal, setShowModal] = useState(false);

  const handleClick = () => {
    setShowModal(true);
  };

  const handleClose = () => {
    setShowModal(false);
  };

  return (
    <div className="rounded-full aspect-square border-4 border-black bg-black">
      <Show when={picture}>
        <ProxyImg
          width={128}
          square={true}
          className="rounded-full w-full h-full cursor-pointer object-cover"
          src={picture!}
          onError={onError}
          onClick={handleClick}
        />
      </Show>
      <Show when={!picture}>
        <UserIcon width={128} />
      </Show>

      {showModal && picture && (
        <Modal centerVertically={true} onClose={handleClose}>
          <ProxyImg
            className="max-w-full max-h-[90vh]"
            square={true}
            src={picture}
            onError={onError}
          />
        </Modal>
      )}
    </div>
  );
};

export default ProfilePicture;
