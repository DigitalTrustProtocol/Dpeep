import { memo } from 'react';
import { useState } from 'preact/hooks';
import { nip19, Event } from 'nostr-tools';
import { Link } from 'preact-router';

import Modal from '../modal/Modal';
import Avatar from '../user/Avatar';
import Name from '../user/Name';
import TrustScore from '../../dwotr/model/TrustScore';
import { RenderScoreDistrustLink, RenderScoreTrustLink } from '@/dwotr/components/RenderGraph';
import Key from '@/nostr/Key';
import { STR, UID } from '@/utils/UniqueIds';
import { formatAmount } from '@/utils/Lightning';

type ReactionData = {
  pubkey: string;
  text?: string;
};

type ReactionsListProps = {
  event: Event;
  wot?: any;
  likes: Set<UID>;
  zapAmountByUser: Map<string, number>;
  formattedZapAmount: string;
  reposts: Set<string>;
};

const Reaction = memo(({ data }: { data: ReactionData }) => {
  const npub = data.pubkey.startsWith('npub') ? data.pubkey : nip19.npubEncode(data.pubkey);
  return (
    <Link href={`/${npub}`} className="flex items-center gap-4">
      <Avatar str={data.pubkey} width={40} />
      <div className="flex flex-col">
        <Name pub={data.pubkey} />
        {data.text && <small className="text-neutral-500">{data.text}</small>}
      </div>
    </Link>
  );
});

const ReactionsList = ({
  event,
  wot,
  likes,
  zapAmountByUser,
  formattedZapAmount,
  reposts,
}: ReactionsListProps) => {
  const [modalReactions, setModalReactions] = useState([] as ReactionData[]);
  const [modalTitle, setModalTitle] = useState('');

  const score = wot?.vertice?.score as TrustScore;
  const hasTrust = score?.hasTrustScore();
  const hasDistrust = score?.hasDistrustScore();

  // Dont show reactions if there are none
  const hasReactions =
    likes.size > 0 || reposts.size > 0 || zapAmountByUser.size > 0 || hasTrust || hasDistrust;
  if (!hasReactions) return null;

  const likesdata = Array.from(likes).map((id) => ({ pubkey: STR(id) })) as ReactionData[];

  return (
    <>
      <hr className="-mx-2 opacity-10 mt-2" />
      {modalReactions.length > 0 && (
        <Modal showContainer={true} onClose={() => setModalReactions([])}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">{modalTitle}</h2>
          </div>
          <div className="flex flex-col gap-4 overflow-y-auto max-h-[50vh]">
            {modalReactions.map((data) => (
              <Reaction key={data.pubkey} data={data} />
            ))}
          </div>
        </Modal>
      )}
      <div className="flex items-center gap-4 py-2">
        {likes.size > 0 && (
          <div className="flex-shrink-0">
            <a
              onClick={() => {
                setModalReactions(likesdata);
                setModalTitle('Liked by');
              }}
              className="cursor-pointer hover:underline"
            >
              {likes.size} <span className="text-neutral-500">Likes</span>
            </a>
          </div>
        )}
        {reposts.size > 0 && (
          <div className="flex-shrink-0">
            <a
              onClick={() => {
                const data = Array.from(reposts).map((pubkey) => ({ pubkey })) as ReactionData[];
                setModalReactions(data);
                setModalTitle('Reposted by');
              }}
              className="cursor-pointer hover:underline"
            >
              {reposts.size} <span className="text-neutral-500">Reposts</span>
            </a>
          </div>
        )}
        {zapAmountByUser?.size > 0 && (
          <div className="flex-shrink-0">
            <a
              onClick={() => {
                const data: ReactionData[] = [];
                const sortedArray = [...zapAmountByUser.entries()].sort((a, b) => b[1] - a[1]);
                for (const [pubkey, amount] of sortedArray) {
                  data.push({ pubkey, text: formatAmount(amount) });
                }
                setModalReactions(data);
                setModalTitle('Zapped by');
              }}
              className="cursor-pointer hover:underline"
            >
              {zapAmountByUser.size} <span className="text-neutral-500">Zaps</span>
              {formattedZapAmount && (
                <small className="text-neutral-500"> ({formattedZapAmount})</small>
              )}
            </a>
          </div>
        )}
        {hasTrust && (
          <div className="flex-shrink-0" title="Degree 0/1/2">
            {RenderScoreTrustLink(
              score,
              Key.toNostrBech32Address(event.id, 'note') as string,
              true,
            )}
          </div>
        )}
        {hasDistrust && (
          <div className="flex-shrink-0" title="Degree 0/1/2">
            {RenderScoreDistrustLink(
              score,
              Key.toNostrBech32Address(event.id, 'note') as string,
              true,
            )}
          </div>
        )}
      </div>
      <hr className="-mx-2 opacity-10 mb-2" />
    </>
  );
};

export default ReactionsList;
