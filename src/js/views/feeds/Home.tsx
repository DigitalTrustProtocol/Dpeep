import { useMemo } from 'react';


import OnboardingNotification from '@/components/onboarding/OnboardingNotification';
import { translate as t } from '@/translations/Translation.mjs';
//import { RouteProps } from '@/views/types.ts';
import View from '@/views/View.tsx';
import { useFollows } from '@/dwotr/hooks/useFollows';
import { FeedOption as FeedOption } from '@/dwotr/network/provider';
//import FeedTanStack from '@/dwotr/components/feed/FeedTanStack';
import { Feed } from '@/dwotr/components/feed/Feed';
import FollowingCursor from '@/dwotr/network/provider/FollowingCursor';
import TrustNetworkCursor from '@/dwotr/network/provider/TrustNetworkCursor';
import FollowingRelayCursor from '@/dwotr/network/provider/FollowingRelayCursor';
//import FeedInView from '@/dwotr/components/feed/FeedInView';

const Home = () => {
  const followedUsers = useFollows();

  const options = useMemo(
    () => [
      {
        id: 'home',
        name: t('Following'),
        includeReplies: true,
        includeReposts: true,
        mergeReposts: true,
        cursor: FollowingRelayCursor,
      } as FeedOption,
      {
        id: 'wot',
        name: t('trust network'),
        includeReplies: false,
        includeReposts: true,
        mergeReposts: true,
        cursor: TrustNetworkCursor,
      } as FeedOption,
      // {
      //   id: 'global',
      //   name: t('global'),
      //   filter: { kinds: [1], limit: 10 },
      //   includeReplies: false,
      //   includeReposts: false,
      //   mergeReposts: true,
      //   eventProps: { showRepliedMsg: true, fullWidth: false },
      //   source: 'memory',
      //   postFilter: (container: NoteContainer) => container.subtype == 1, // only show posts, not comments and reposts
      // } as FeedOption,
    ],
    [followedUsers],
  );

  return (
    <View>
      <div className="flex flex-col w-full">
        <OnboardingNotification />
        <Feed scope="home" options={options} />
      </div>
    </View>
  );
};

export default Home;

