import Show from '@/components/helpers/Show';
import { FlagIcon } from '@heroicons/react/24/outline';
import { FlagIcon as FlagIconFull } from '@heroicons/react/24/solid';



const Flag = ({ active, onClick, size = 14, ...props }) => {

    const activeClass = active ? 'text-iris-red' : 'hover:text-iris-red text-neutral-500';
    const className = `btn-ghost btn-sm hover:bg-transparent ${activeClass} ${props.className || ''}`;

    return (
        <button {...props}  onClick={() => onClick(!active)} className={className}  >
            <Show when={active}>
                <FlagIcon width={size} height={size}  />
            </Show>
            <Show when={!active}>
                <FlagIconFull width={size} height={size} />
            </Show>
        </button>
    );
}

export default Flag;

