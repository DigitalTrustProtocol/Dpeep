import Show from '@/components/helpers/Show';
import { ArrowPathIcon, ArrowDownOnSquareIcon } from '@heroicons/react/24/outline';

import { ArrowPathIcon as ArrowPathIconSolid, ArrowDownOnSquareIcon as ArrowDownOnSquareIconSolid } from '@heroicons/react/24/solid';
//import { useState } from 'preact/hooks';

// type ReloadProps = {
//     onClick: (active: boolean) => void;
//     size?: number;
//     className?: string;
// };


const Reload = ({ onClick, size = 14, active = false, ...props }) => {

    const activeClass = active ? 'text-iris-brown' : 'hover:text-iris-brown text-neutral-500';
    const className = `btn-ghost btn-sm hover:bg-transparent ${activeClass} ${props.className || ''}`;

    const onClickHandler = (e) => {
        e.preventDefault();
        e.stopPropagation();

        onClick(!active);
    };
    

    return (
        <button {...props}  onClick={onClickHandler} className={className}  >
            <Show when={active}>
                <ArrowDownOnSquareIconSolid width={size} height={size}  />
            </Show>
            <Show when={!active}>
                <ArrowDownOnSquareIcon width={size} height={size} />
            </Show>
        </button>
    );
}

export default Reload;
