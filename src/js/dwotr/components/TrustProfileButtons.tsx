import { useEffect, useState } from 'react';
import graphNetwork from '../GraphNetwork';
import { CheckCorrect, FlagMarkSolid } from './Icons';
import { EntityType } from '../model/Graph';
import useVerticeMonitor from '../hooks/useVerticeMonitor';
import TrustScore from '../model/TrustScore';
import { ID } from '@/utils/UniqueIds';
import profileManager from '../ProfileManager';
import { Trust1Kind } from '../network/provider';

const TrustProfileButtons = ({str}: any) => {
  const [state, setState] = useState({
    trusted: false,

    distrusted: false,
    renderTrustScore: '',
    renderDistrustScore: '',
    processing: false,
  });

  const wot = useVerticeMonitor(ID(str)) as any;

  useEffect(() => {
    if (!wot) return;

    const score = wot.vertice?.score as TrustScore;
    if (!score) return;

    let trusted = score.isDirectTrusted();
    let distrusted = score.isDirectDistrusted();

    // Get the direct trust, dont search the graph
    setState({
      trusted,
      distrusted,
      renderTrustScore: trusted ? score.renderTrustCount() : '',
      renderDistrustScore: distrusted ? score.renderDistrustCount() : '',
      processing: false,
    });
  }, [wot]);

  function trustBtnClicked(e) {
    e.preventDefault();
    e.stopPropagation();

    setState({
      ...state,
      trusted: !state.trusted,
      distrusted: false,
      processing: true,
    });

    // Once the all trusts 
    // Map subscribe profile

    let val = !state.trusted ? 1 : 0;
    
    if(val == 1) {
      let id = ID(str);
    
      profileManager.once(id, [Trust1Kind]);
      profileManager.mapProfiles([id]);
    }

    graphNetwork.publishTrust(str, val, EntityType.Key);
  }

  function distrustBtnClicked(e) {
    e.preventDefault();
    e.stopPropagation();

    setState({
      ...state,
      trusted: false,
      distrusted: !state.distrusted,
      processing: true,
    });
       
    let val = !state.distrusted ? -1 : 0;
    graphNetwork.publishTrust(str, val, EntityType.Key);
  }

  return (
    <>
      <div className="flex-1 flex gap-4">
        <a
          className={`msg-btn trust-btn ${state.trusted ? 'trusted' : ''} cursor-pointer`}
          onClick={(e) => trustBtnClicked(e)}
          title={state.trusted ? 'Trusted' : 'Trust'}
        >
          {state.trusted ? (
            <CheckCorrect size={24} fill="green" stroke="currentColor" />
          ) : (
            <CheckCorrect size={24} fill="none" stroke="currentColor" />
          )}
        </a>
        {/* <ReactionCount active={state.trusted} onClick={(e) => toggleTrusts(e)}>
            {state.renderTrustScore || ''}
            {state.processing && state.trusted ? <span id="loading"></span> : null}
          </ReactionCount> */}

        <a
          className={`msg-btn trust-btn ${state.distrusted ? 'distrusted' : ''} cursor-pointer`}
          onClick={(e) => distrustBtnClicked(e)}
          title={state.distrusted ? 'Distrusted' : 'Distrust'}
        >
          {state.distrusted ? (
            <FlagMarkSolid size={24} fill="red" stroke="currentColor" />
          ) : (
            <FlagMarkSolid size={24} fill="none" stroke="currentColor" />
          )}
        </a>
      </div>
      {/* <ReactionCount active={state.distrusted} onClick={(e) => toggleDistrusts(e)}>
            {state.renderDistrustScore || ''}
            {state.processing && state.distrusted ? <span id="loading"></span> : null}
          </ReactionCount> */}
    </>
  );
};

export default TrustProfileButtons;
