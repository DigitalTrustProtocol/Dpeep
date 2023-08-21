import { useEffect, useState } from 'preact/hooks';
import TrustScore from '../model/TrustScore';
import useVerticeMonitor from '../hooks/useVerticeMonitor';
import { RenderScoreDistrustLink, RenderScoreTrustLink } from './RenderGraph';
import { useKey } from '../hooks/useKey';

const ProfileScoreLinks = ({ str }: any) => {
  const { bech32Key, uid } = useKey(str);
  const [score, setScore] = useState<TrustScore | undefined>(undefined);

  const wot = useVerticeMonitor(uid, undefined, '') as any;

  useEffect(() => {
    setScore(() => wot.vertice?.score as TrustScore);
  }, [wot]);

  return (
    <>
      {RenderScoreTrustLink(score, bech32Key, true)}
      {RenderScoreDistrustLink(score, bech32Key, true)}
    </>
  );
};

export default ProfileScoreLinks;
