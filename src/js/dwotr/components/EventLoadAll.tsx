import { translate as t } from '../../translations/Translation.mjs';


export const EventLoadAll = (props: any) => {

    const allClick = (e: any) => {
        e.preventDefault();
        e.stopPropagation();
        props?.loadAll();
    };

    return (
        <div className="flex-1">
            <a
            className="btn btn-sm btn-neutral"
            onClick={(e) => allClick(e)}
            >
            {t('load_all')}
            </a>
        </div>
    );
}