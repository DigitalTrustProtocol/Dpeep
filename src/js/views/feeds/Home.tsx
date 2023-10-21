import { useMemo, useState, useEffect } from 'react';

import { Filter } from 'nostr-tools';

import Show from '@/components/helpers/Show';
import OnboardingNotification from '@/components/onboarding/OnboardingNotification';
import { getEventReplyingTo, isRepost } from '@/nostr/utils';
import { translate as t } from '@/translations/Translation.mjs';
//import { RouteProps } from '@/views/types.ts';
import View from '@/views/View.tsx';
import { useFollows } from '@/dwotr/hooks/useFollows';
import { FeedOption as FeedOption } from '@/dwotr/network/WOTPubSub';
//import FeedTanStack from '@/dwotr/components/feed/FeedTanStack';
import FeedVirtual from '@/dwotr/components/feed/FeedVirtual';
//import FeedInView from '@/dwotr/components/feed/FeedInView';

const Home = () => {
  const [selectedOption, setOption] = useState<FeedOption>();
  const followedUsers = useFollows();

  const options = useMemo(
    () => [
      {
        id: 'home',
        name: t('posts'),
        filter: { kinds: [1], authors: followedUsers, limit: 10 } as Filter,
        includeReplies: false,
        includeReposts: false,
        filterFn: (event) => !getEventReplyingTo(event) || isRepost(event),
        mergeReposts: true,
        eventProps: { showRepliedMsg: true },
        source: 'memory', // based on that all followed users are loaded in memory
      } as FeedOption,
      {
        id: 'wot',
        name: t('Web of Trust'),
        filter: { kinds: [1, 6], authors: followedUsers, limit: 5 },
        includeReplies: false,
        includeReposts: false,
        filterFn: (event) => !getEventReplyingTo(event) || isRepost(event),
        mergeReposts: true,
        eventProps: { showRepliedMsg: true, fullWidth: false },
        source: 'memory',
      } as FeedOption,
      {
        id: 'global',
        name: t('global'),
        filter: { kinds: [1, 6], authors: followedUsers, limit: 5 },
        includeReplies: false,
        includeReposts: false,
        mergeReposts: true,
        eventProps: { showRepliedMsg: true, fullWidth: false },
        source: 'memory',
      } as FeedOption,
    ],
    [followedUsers],
  );

  return (
    <View>
      <div className="flex flex-col w-full">
        <OnboardingNotification />
        <FeedSelect selectedOption={selectedOption} feedOptions={options} setOption={setOption} />
        <hr className="opacity-10" />
        {options.map((option) => (
          // Use FeedVirtual with key, to force a re-create of the component when the option changes, otherwise the FeedVirtual will use old data
          option.id == selectedOption?.id && <FeedVirtual key={option.id} feedOption={option}  />
      ))}
      </div>
    </View>
  );
};

export default Home;

type FeedSelectProps = {
  selectedOption?: FeedOption;
  feedOptions: FeedOption[];
  setOption: (option: FeedOption) => void;
};

const FeedSelect = ({ selectedOption, feedOptions, setOption }: FeedSelectProps) => {

  useEffect(() => {
    if (!selectedOption) {
      setOption(feedOptions[0]);
    }
  }, [feedOptions]);


  const OptionLink = ({ option }: { option: FeedOption }) => {
    return (
      <button 
        className={'flex-1 ' + (option.id == selectedOption?.id ? 'graphlink active' : 'graphlink')}
        onClick={(e) => {
          e.preventDefault();
          setOption(option);
        }}
      >
        {option.name}
      </button>
    );
  }

  return (
    <div className="flex gap-4 w-full">
      {feedOptions.map((option) => (
        <OptionLink key={option.id} option={option} />
      ))}
    </div>
  );
};

