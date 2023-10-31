import { memo } from 'preact/compat';
import { GlobeAltIcon } from '@heroicons/react/24/outline';
import { GlobeAltIcon as GlobeAltIconFull } from '@heroicons/react/24/solid';
import { useState, useMemo } from 'preact/hooks';



const Globe = ({ onClick, size = 14, title, className }) => {
    const [active, setActive] = useState(false);

    const activeClass = useMemo(() => {
        return active ? 'text-iris-brown' : 'hover:text-iris-brown text-neutral-500';
    }, [active]);

    const classNameState = useMemo(() => {
        return `btn-ghost btn-sm hover:bg-transparent ${activeClass} ${className || ''}`;
    }, [activeClass, className]);

    const onClickHandler = (e) => {
        e.preventDefault();
        e.stopPropagation();

        const newActiveState = !active;
        setActive(newActiveState);
        onClick(newActiveState);
    };
    
    return (
        <button title={title} onClick={onClickHandler} className={classNameState}>
            {active
                ? <GlobeAltIconFull width={size} height={size} />
                : <GlobeAltIcon width={size} height={size} />}
        </button>
    );
}

export default memo(Globe);