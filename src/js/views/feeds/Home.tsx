import { useMemo } from 'react';

import {Filter} from 'nostr-tools';
import CreateNoteForm from '@/components/create/CreateNoteForm';
import FeedComponent from '@/components/feed/Feed';
import Show from '@/components/helpers/Show';
import OnboardingNotification from '@/components/onboarding/OnboardingNotification';
import { getEventReplyingTo, isRepost } from '@/nostr/utils';
import { translate as t } from '@/translations/Translation.mjs';
import { RouteProps } from '@/views/types.ts';
import View from '@/views/View.tsx';
import { useFollows } from '@/dwotr/hooks/useFollows';
import { FeedOptions } from '@/dwotr/network/WOTPubSub';

const Home: React.FC<RouteProps> = () => {
  const followedUsers = useFollows();

  const options = useMemo(
    () => [
      {
        id: 'home',
        name: t('posts'),
        filter: { kinds: [1, 6], authors: followedUsers, limit: 10 } as Filter,
        filterFn: (event) => !getEventReplyingTo(event) || isRepost(event),
        mergeReposts: true,
        eventProps: { showRepliedMsg: true },
        source: 'memory' // based on that all followed users are loaded in memory
      } as FeedOptions,
      {
        id: 'home-replies',
        name: t('posts_and_replies'),
        filter: { kinds: [1, 6], authors: followedUsers, limit: 5 },
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
          <FeedComponent key={`feed-${followedUsers.length}`} filterOptions={options} />
        </Show>
      </div>
    </View>
  );
};

export default Home;
