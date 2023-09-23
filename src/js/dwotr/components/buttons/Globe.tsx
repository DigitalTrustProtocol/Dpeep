import Show from '@/components/helpers/Show';
import { GlobeAltIcon } from '@heroicons/react/24/outline';
import { GlobeAltIcon as GlobeAltIconFull } from '@heroicons/react/24/solid';
import { useState } from 'preact/hooks';


const Globe = ({ onClick, ...props }) => {

    const [active, setActive] = useState(false);

    const size = props.size || 14;
    const alt = props.alt || 'Load all global events from relay servers';

    const onClickHandler = (e) => {
        e.preventDefault();
        e.stopPropagation();

        setActive(!active);
        onClick(!active);
    };
    
    const activeClass = active ? 'text-iris-brown' : 'hover:text-iris-brown text-neutral-500';

    return (
        <button  onClick={onClickHandler} title={alt} className={`btn-ghost btn-sm justify-center hover:bg-transparent btn content-center gap-2 rounded-none ${activeClass}`} >
            <Show when={active}>
                <GlobeAltIconFull width={size} height={size}  />
            </Show>
            <Show when={!active}>
                <GlobeAltIcon width={size} height={size} />
            </Show>
        </button>
    );
}

export default Globe;

