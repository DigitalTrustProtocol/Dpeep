import { translate as t } from '../../translations/Translation.mjs';

function NewEventsButton({ onClick }) {
  return (
    <div className="justify-center items-center z-10 flex w-full m-4">
      <div
        className="btn btn-sm opacity-90 hover:opacity-100 hover:bg-iris-blue bg-iris-blue text-white"
        onClick={onClick}
      >
        {t('show_n_new_messages').replace('{n} ', '')}
      </div>
    </div>
  );
}

export default NewEventsButton;
