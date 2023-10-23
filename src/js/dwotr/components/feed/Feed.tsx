import { FeedOption } from '@/dwotr/network/WOTPubSub';
import { useState } from 'preact/hooks';
import { FeedSelect } from './FeedSelect';
import FeedVirtual from './FeedVirtual';

type FeedProps = {
  scope: string;
  options: FeedOption[];
  children?: any;
};

export const Feed = ({ children, options, scope }: FeedProps) => {
  const [selectedOption, setOption] = useState<FeedOption>(options[0]);
  const [localScope, setScope] = useState<string>("local"); 

  return (
    <>
      <FeedVirtual key={scope + localScope + selectedOption?.id} feedOption={selectedOption} setScope={setScope}>
        <>
          {children}
          <FeedSelect
            selectedOption={selectedOption}
            feedOptions={options}
            setOption={setOption}
          />
          <hr className="opacity-10 mt-2" />
        </>
      </FeedVirtual>
    </>
  );
};
