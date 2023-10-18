import React from 'react';
import { useMemo } from 'preact/hooks';

import View from '../View';
import Feed from '@/dwotr/components/feed/Feed';

type Props = {
  path: string;
  query?: string;
};

const Search: React.FC<Props> = ({ query }) => {
  const filterOptions = useMemo(() => {
    const filter = { kinds: [1], search: query };

    const filterFn = (event) => {
      // some relays don't support filtering by keyword
      return event.content.includes(query);
    };

    return [
      {
        id: 'search',
        name: 'Search',
        filter,
        filterFn,
      },
    ];
  }, [query]);

  return (
    <View>
      <div className="flex flex-row">
        <div className="flex flex-col w-full">
          <Feed key={query} filterOptions={filterOptions} />
        </div>
      </div>
    </View>
  );
};

export default Search;
