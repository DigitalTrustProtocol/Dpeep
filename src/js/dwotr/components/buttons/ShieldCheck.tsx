import Show from '@/components/helpers/Show';
import { ShieldCheckIcon } from '@heroicons/react/24/outline';
import { ShieldCheckIcon as ShieldCheckIconFull } from '@heroicons/react/24/solid';


const ShieldCheck = ({ active, onClick, size = 14, ...props }) => {

    const activeClass = active ? 'text-iris-brown' : 'hover:text-iris-brown text-neutral-500';
    const className = `btn-ghost btn-sm hover:bg-transparent ${activeClass} ${props.className || ''}`;

    return (
        <button {...props}  onClick={() => onClick(!active)} className={className}  >
            <Show when={active}>
                <ShieldCheckIcon width={size} height={size}  />
            </Show>
            <Show when={!active}>
                <ShieldCheckIconFull width={size} height={size} />
            </Show>
        </button>
    );
}

export default ShieldCheck;

