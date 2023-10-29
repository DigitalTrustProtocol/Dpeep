import { memo } from 'preact/compat';
import { useState, useRef, useEffect } from 'preact/hooks';
import { useInView } from 'react-intersection-observer';

export type OnInView = (id: number, inView: boolean, height: number | null) => void;


type InViewComponentProps = {
    id: number;
    onInView?: (id: number, inView: boolean, height: number | null) => void;
    children: any;
    };

const InViewComponent = ({ children, id, onInView }: InViewComponentProps) => {
  const [ref, inView, entry] = useInView({
    threshold: 0,
    initialInView: true,
    trackVisibility: false,
    
  });
  const [height, setHeight] = useState<number | null>(null);
  const divRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // When the component is in view, capture its height
    if (inView && divRef.current && (height || 0) < divRef.current.offsetHeight) {
        //const divHeight = entry?.boundingClientRect.height || 0;
        //setHeight(divHeight);
        setHeight(divRef.current.offsetHeight);

    }
    onInView?.(id, inView, height);

  }, [inView]);

  useEffect(() => {
    if(entry?.boundingClientRect.height || 0 > (height || 0)) {
        //console.log("InViewComponent:entry:height:Set", entry?.boundingClientRect.height || 0, " - old height:", height);
        setHeight(entry?.boundingClientRect.height || 0);
    }
        
  }, [entry]);

  return (
    <div ref={(el) => { ref(el); divRef.current = el; }} style={{ minHeight: inView ? height || 'auto' : (height || 100) + 'px' }}>
        {inView && children}
    </div>
  );
};

export default memo(InViewComponent);