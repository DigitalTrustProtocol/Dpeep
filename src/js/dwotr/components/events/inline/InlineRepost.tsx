import { memo } from 'preact/compat';
import { useEffect, useState } from 'react';
import { ArrowPathIcon } from '@heroicons/react/24/outline';
import { Link } from 'preact-router';

import { translate as t } from '../../../../translations/Translation.mjs';

import repostManager from '@/dwotr/RepostManager';
import { RepostContainer } from '@/dwotr/model/ContainerTypes';

import eventManager from '@/dwotr/EventManager';
import { BECH32 } from '@/utils/UniqueIds';
import Name from '../Name';
import InlineComponent from './InlineComponent';

type InlineRepostProps = {
  container?: RepostContainer;
};

const InlineRepost = ({ container }: InlineRepostProps) => {
  const { repostOf, repostCount } = useRepost(container!);

  if (!repostOf) return null;

  return (
    <>
      <RepostName authorId={container?.authorId!} repostCount={repostCount} />
      <InlineComponent container={repostOf} />
    </>
  );
};

export default InlineRepost;

type RepostNameProps = {
  authorId: number;
  repostCount: number;
};

export const RepostName = ({ authorId, repostCount }: RepostNameProps) => (
  <div className="flex gap-1 items-center text-sm text-neutral-500 px-2 pt-2">
    <div className="flex flex-row">
      <i className="min-w-[40px] mr-4 mb-2 flex justify-end">
        <ArrowPathIcon width={18} />
      </i>
      <div className="flex-grow">
        <Link href={`/${BECH32(authorId)}`}>
          <Name id={authorId} hideBadge={true} />
        </Link>
        <span>
          {repostCount > 1 && ` and ${repostCount - 1} others`} {t('reposted')}
        </span>
      </div>
    </div>
  </div>
);

export const useRepost = (container: RepostContainer) => {
  const [repostCount, setRepostCount] = useState<number>(0);
  const [repostOf, setRepostOf] = useState<RepostContainer | undefined>(undefined);

  useEffect(() => {
    if (!container) return;
    if (!container?.repostOf) return;

    const repostOfContainer = eventManager.containers.get(container.repostOf) as RepostContainer;
    if (!repostOfContainer) return;
    setRepostOf(repostOfContainer);

    setRepostCount(repostManager.reposts.get(container.repostOf!)?.size || 0);
  }, [container]);

  return { repostOf, repostCount };
};
