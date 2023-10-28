import { memo } from 'preact/compat';
import { GlobeAltIcon } from '@heroicons/react/24/outline';
import { GlobeAltIcon as GlobeAltIconFull } from '@heroicons/react/24/solid';
import { useState } from 'preact/hooks';


const Globe = ({ onClick, size = 14, title, className }) => {

    const [active, setActive] = useState(false);

    const [activeClass] = useState(active ? 'text-iris-brown' : 'hover:text-iris-brown text-neutral-500');
    const [classNameState] = useState(`btn-ghost btn-sm hover:bg-transparent ${activeClass} ${className || ''}`);

    const onClickHandler = (e) => {
        e.preventDefault();
        e.stopPropagation();

        setActive(!active);
        onClick(!active);
    };
    

    return (
        <button title={title} onClick={onClickHandler} className={classNameState}  >
            {active &&
                <GlobeAltIconFull width={size} height={size}  />
            }
            {!active && 
                <GlobeAltIcon width={size} height={size} />
            }
        </button>
    );
}

export default memo(Globe);

