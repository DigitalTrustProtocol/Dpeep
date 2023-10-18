import { useEffect, useState } from 'react';

import { CheckCorrect, FlagMarkSolid } from './Icons';
import graphNetwork from '../GraphNetwork';
import { EntityType } from '../model/Graph';
import TrustScore from '../model/TrustScore';
import useVerticeMonitor from '../hooks/useVerticeMonitor';
import { ID } from '@/utils/UniqueIds';

const TrustReactionButtons = (props) => {
  const [score, setScore] = useState({
    trusted: false,
    distrusted: false,
  });

  const event = props.event;

  const wot = useVerticeMonitor(
    ID(event.id),
    ['badMessage', 'neutralMessage', 'goodMessage'],
    '',
  ) as any;


  useEffect(() => {
    const v = wot?.vertice;
    const s = v?.score as TrustScore;

    let trusted = s?.isDirectTrusted();
    let distrusted = s?.isDirectDistrusted();

    setScore({
      trusted,
      distrusted,
    });
  }, [wot]); // Everytime the wot changes, its a new object

  const trustBtnClicked = (e) => {
    e.preventDefault();
    e.stopPropagation();

    let val = !score.trusted ? 1 : 0;
    graphNetwork.publishTrust(event.id, val, EntityType.Item);
  }

  const distrustBtnClicked = (e) => {
    e.preventDefault();
    e.stopPropagation();

    let val = !score.distrusted ? -1 : 0;
    graphNetwork.publishTrust(event.id, val, EntityType.Item);
  }

  return (
    <>
      <a
        className={`btn-ghost btn-sm justify-center hover:bg-transparent btn content-center rounded-none ${
          score.trusted ? 'trusted' : 'hover:trusted text-neutral-500'
        }`}
        onClick={(e) => trustBtnClicked(e)}
        title={score.trusted ? 'Trusted' : 'Trust'}
      >
        {score.trusted ? (
          <CheckCorrect size={18} fill="green" stroke="currentColor" />
        ) : (
          <CheckCorrect size={18} fill="none" stroke="currentColor" />
        )}
        {(!props.standalone && wot?.vertice?.score?.renderTrustCount()) || ''}
      </a>
      <a
        className={`btn-ghost btn-sm justify-center hover:bg-transparent btn content-center rounded-none ${
          score.distrusted ? 'distrusted' : 'hover:distrusted text-neutral-500'
        }`}
        onClick={(e) => distrustBtnClicked(e)}
        title={score.distrusted ? 'Distrusted' : 'Distrust'}
      >
        {score.distrusted ? (
          <FlagMarkSolid size={18} fill="red" stroke="currentColor" />
        ) : (
          <FlagMarkSolid size={18} fill="none" stroke="currentColor" />
        )}
        {(!props.standalone && wot?.vertice?.score?.renderDistrustCount()) || ''}
      </a>
    </>
  );
};

export default TrustReactionButtons;
