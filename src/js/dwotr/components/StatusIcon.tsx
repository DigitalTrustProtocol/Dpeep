import React from 'react';

export type Status = 'waiting' | 'loading' | 'done';

interface StatusIconProps {
  status: Status;
}

const StatusIcon: React.FC<StatusIconProps> = ({ status }) => {
  return (
    <div className={`w-12 h-12 flex items-center justify-center rounded-full`}>
      {status === 'waiting' && <div className="text-2xl">🕒</div>}
      {status === 'loading' && <div className="loading">🔄</div>}
      {status === 'done' && <div className="text-2xl">✅</div>}
    </div>
  );
};

export default StatusIcon;
