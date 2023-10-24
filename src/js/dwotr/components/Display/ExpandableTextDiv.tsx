import { memo } from 'preact/compat';
import React, { useState, useRef, useEffect } from 'react';

const ExpandableTextDiv: React.FC = ({ children }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isOverflowing, setIsOverflowing] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (containerRef.current) {
      setIsOverflowing(containerRef.current.scrollHeight > containerRef.current.clientHeight);
    }
  }, [children]);


  
  return (
    <div className="relative">
      <div
        ref={containerRef}
        className={`overflow-hidden transition-all ${isExpanded ? 'max-h-full' : 'max-h-[450px]'}`}
      >
        {children}
      </div>
      {isOverflowing && (
        <div className="mt-2">
          <span className="text-sm link mb-2">... more</span>
          {/* {!isExpanded ? (
            <a
              href="#expand"
              className="text-sm link mb-2"
              onClick={(e) => {
                e.preventDefault();
                setIsExpanded(true);
              }}
            >
              ... More
            </a>
          ) : (
            <a
              href="#hide"
              className="text-sm link mb-2"
              onClick={(e) => {
                e.preventDefault();
                setIsExpanded(false);
              }}
            >
              ... Hide
            </a>
          )} */}
        </div>
      )}
    </div>
  );
};

export default memo(ExpandableTextDiv);
