import { translate as t } from '../../../translations/Translation.mjs';

function ToTopButtonFixed({ onClick }) {
  return (
    <div className="fixed bottom-16 md:bottom-8 left-0 justify-center items-center z-10 flex w-full md:w-1/2 pb-safe-area">
      <div
        className="btn btn-sm opacity-90 hover:opacity-100 hover:bg-iris-blue bg-iris-blue text-white"
        onClick={onClick}
      >
        {t('to_top')}
      </div>
    </div>
  );
}

export default ToTopButtonFixed;
