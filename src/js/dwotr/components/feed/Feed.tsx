import { useState, useEffect } from 'preact/hooks';
import { FeedOption } from '@/dwotr/network/provider';
import { FeedSelect } from './FeedSelect';
import FeedInfinity from './FeedInfinity';
import useHistoryState from '@/state/useHistoryState';

type FeedProps = {
  scope: string;
  options: FeedOption[];
  children?: any;
};

export const Feed = ({ children, options, scope }: FeedProps) => {
  const { selectedOption, selectedOptionId, setSelectedOptionId } = useOptionsState(options, options[0]?.id, scope);
  const [localScope, setScope] = useState<string>('local');

  return (
    <>
      {children}
      <FeedSelect
        selectedOptionId={selectedOptionId}
        feedOptions={options}
        setOptionId={setSelectedOptionId}
      />
      <hr className="opacity-10 mt-2" />
      <FeedInfinity
        key={scope + localScope + selectedOptionId}
        feedOption={selectedOption}
        setScope={setScope}
      />
    </>
  );
};

const useOptionsState = (
  options: FeedOption[],
  initialId: string | undefined,
  key = 'FeedOptionState',
) => {
  const [selectedOptionId, setSelectedOptionId] = useHistoryState(initialId || '', key);
  const [selectedOption, setSelectedOption] = useState<FeedOption | undefined>();

  useEffect(() => {
    let option = options.find((o) => o.id == selectedOptionId);
    setSelectedOption(option);
  }, [selectedOptionId, options]);

  return { selectedOption, selectedOptionId, setSelectedOptionId };
};
