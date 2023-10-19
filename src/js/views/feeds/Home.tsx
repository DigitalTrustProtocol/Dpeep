import { useMemo } from 'react';

import {Filter} from 'nostr-tools';
import CreateNoteForm from '@/components/create/CreateNoteForm';

import Feed from '@/dwotr/components/feed/Feed';
//import Feed from '@/dwotr/components/feed/Feed';

import Show from '@/components/helpers/Show';
import OnboardingNotification from '@/components/onboarding/OnboardingNotification';
import { getEventReplyingTo, isRepost } from '@/nostr/utils';
import { translate as t } from '@/translations/Translation.mjs';
import { RouteProps } from '@/views/types.ts';
import View from '@/views/View.tsx';
import { useFollows } from '@/dwotr/hooks/useFollows';
import { FeedOptions } from '@/dwotr/network/WOTPubSub';
import FeedTanStack from '@/dwotr/components/feed/FeedTanStack';
import FeedVirtual from '@/dwotr/components/feed/FeedVirtual';
import FeedInView from '@/dwotr/components/feed/FeedInView';

const Home: React.FC<RouteProps> = () => {
  const followedUsers = useFollows();

  const options = useMemo(
    () => [
      {
        id: 'home',
        name: t('posts'),
        filter: { kinds: [1, 6], authors: followedUsers, limit: 10 } as Filter,
        includeReplies: false,
        includeReposts: false,
        filterFn: (event) => !getEventReplyingTo(event) || isRepost(event),
        mergeReposts: true,
        eventProps: { showRepliedMsg: true },
        source: 'memory' // based on that all followed users are loaded in memory
      } as FeedOptions,
      {
        id: 'home-replies',
        name: t('posts_and_replies'),
        filter: { kinds: [1, 6], authors: followedUsers, limit: 5 },
        includeReplies: false,
        includeReposts: false,
        mergeReposts: true,
        eventProps: { showRepliedMsg: true, fullWidth: false },
        source: 'memory'
      } as FeedOptions,
    ],
    [followedUsers],
  );

  return (
    <View>
      <div className="flex flex-col w-full">
        <OnboardingNotification />
        <div className="hidden md:block px-4">
          <CreateNoteForm autofocus={false} placeholder={t('whats_on_your_mind')} />
        </div>
        <Show when={followedUsers.length}>
          {/* <Feed key={`feed-${followedUsers.length}`} filterOptions={options} /> */}
          {/* <FeedVirtual key={`hoomfeed`} filterOptions={options} /> */}
          {/* <FeedTanStack key={`tanStackfeed`} filterOptions={options} /> */}
          <FeedInView key={`feedInView`} filterOptions={options} />

        </Show>
      </div>
    </View>
  );
};

export default Home;
