import { useState } from 'preact/hooks';

import FollowSuggestions from '@/components/onboarding/FollowSuggestions';
import GetIrisAddress from '@/components/onboarding/GetIrisAddress';
import NoFollowers from '@/components/onboarding/NoFollowers';
import useLocalState from '@/state/useLocalState.ts';

function OnboardingNotification() {
  const [noFollowers, setNoFollowers] = useLocalState('noFollowers');
  const [showFollowSuggestions, setShowFollowSuggestions] = useLocalState('showFollowSuggestions');
  const [showNoIrisToAddress, setShowNoIrisToAddress] = useLocalState('showNoIrisToAddress');
  const [existingIrisToAddress] = useLocalState('existingIrisToAddress');
  const [showQrModal, setShowQrModal] = useState(false);

  let content;
  if (showFollowSuggestions) {
    content = <FollowSuggestions setShowFollowSuggestions={setShowFollowSuggestions} />;
  } else if (showNoIrisToAddress) {
    content = (
      <GetIrisAddress
        existingIrisToAddress={existingIrisToAddress}
        setShowNoIrisToAddress={setShowNoIrisToAddress}
      />
    );
  } else if (noFollowers) {
    content = (
      <NoFollowers
        setNoFollowers={setNoFollowers}
        setShowQrModal={setShowQrModal}
        showQrModal={showQrModal}
      />
    );
  }

  if (content) {
    return (
      <div class="msg">
        <div class="msg-content">{content}</div>
      </div>
    );
  }
  return null;
}

export default OnboardingNotification;
