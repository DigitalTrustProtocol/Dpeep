import { translate as t } from '../../../translations/Translation.mjs';

function ToTopButton({ onClick }) {
  return (
      <div
        className="btn btn-sm opacity-90 hover:opacity-100 hover:bg-iris-blue bg-iris-blue text-white"
        onClick={onClick}
      >
        {t('to_top')}
      </div>
  );
}

export default ToTopButton;
