//import React from 'react';
import { useLayoutEffect, useEffect, useRef } from 'preact/hooks';

import useHistoryState from '@/state/useHistoryState.ts';

import useFeed from '@/dwotr/hooks/useFeed';
import { FeedOption } from '@/dwotr/network/WOTPubSub';

import { useVirtualizer } from '@tanstack/react-virtual';
import Show from '@/components/helpers/Show';
import EventComponent from '../events/EventComponent';
import eventManager from '@/dwotr/EventManager';
import { ID } from '@/utils/UniqueIds';

export type FeedProps = {
  filterOptions: FeedOption[];
  showDisplayAs?: boolean;
  emptyMessage?: string;
  fetchEvents?: any;
};

const FeedTanStack = ({ filterOptions }: FeedProps) => {
  const parentRef = useRef<HTMLDivElement | null>(null);
  const parentOffsetRef = useRef(0);

  const [filterOptionIndex, _] = useHistoryState(0, 'filterOptionIndex');
  const filterOption = filterOptions[filterOptionIndex];

  const { events, hasMore, hasRefresh, loadMore, refresh } = useFeed(filterOption);

  const containers = events.map((event) => eventManager.containers.get(ID(event.id))) || [];

  useLayoutEffect(() => {
    parentOffsetRef.current = parentRef.current?.offsetTop ?? 0;
  }, []);

  const virtualizer = useVirtualizer({
    count: hasMore ? containers.length + 1 : containers.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 430,
    scrollMargin: parentOffsetRef.current,
    overscan: 5,
  });

  useEffect(() => {
    const [lastItem] = [...virtualizer.getVirtualItems()].reverse();

    if (!lastItem) {
      return;
    }

    if (lastItem.index >= containers.length - 1 && hasMore) {
      console.log('FeedTanStack:loadMore')
    }
  }, [hasMore, loadMore, containers.length, virtualizer.getVirtualItems()]);

  //height: `${virtualizer.getTotalSize()}px`,
  let items = virtualizer.getVirtualItems();

  return (
    <div>
      <Show when={!containers.length}>
        <p>Loading...</p>
      </Show>
      <div ref={parentRef} className="List">
        <div
          style={{
            height: virtualizer.getTotalSize(),
            width: '100%',
            position: 'relative',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              transform: `translateY(${
                items[0] ? items[0].start - virtualizer.options.scrollMargin : 0
              }px)`,
            }}
          >
            {items.map((virtualRow) => {
              const isLoaderRow = virtualRow.index > containers.length - 1;
              const container = containers[virtualRow.index];

              return (
                <div
                  key={virtualRow.key}
                  data-index={virtualRow.index}
                  ref={virtualizer.measureElement}
                >
                  <Show when={!isLoaderRow}>
                    <>
                      <EventComponent key={`${container?.id!}TanStack`} id={container?.id} />
                      <hr className="opacity-10 mb-2 mt-2" />
                    </>
                  </Show>
                  <Show when={isLoaderRow}>
                    <Show when={hasMore}>
                      <div className="justify-center items-center flex w-full mt-4 mb-4">
                        <div className="loading">🔄</div>
                      </div>
                    </Show>
                    <Show when={!hasMore}>'Nothing more to load'</Show>
                  </Show>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
export default FeedTanStack;

// {virtualizer.getVirtualItems().map((virtualRow) => {
//   const isLoaderRow = virtualRow.index > allRows.length - 1;
//   const item = allRows[virtualRow.index];

//   return (
//     <div
//       key={virtualRow.index}
//       style={{
//         position: 'absolute',
//         top: 0,
//         left: 0,
//         width: '100%',
//         height: `${virtualRow.size}px`,
//         transform: `translateY(${virtualRow.start}px)`,
//       }}
//     >
//       <Show when={!isLoaderRow}>
//         <>
//           <EventComponent key={`${item?.id!}TanStack`} container={item} />
//           <hr className="opacity-10 mb-2 mt-2" />
//         </>
//       </Show>
//       <Show when={isLoaderRow}>
//         <Show when={hasMore}>
//           <div className="justify-center items-center flex w-full mt-4 mb-4">
//             <div className="loading">🔄</div>
//           </div>
//         </Show>
//         <Show when={!hasMore}>'Nothing more to load'</Show>
//       </Show>
//     </div>
//   );
// })}
