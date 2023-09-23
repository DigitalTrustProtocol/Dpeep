import IrisAccount from './irisaccount/IrisAccount.tsx';
import Account from './Account.js';
import Appearance from './Appearance';
import Backup from './Backup';
import ContentPage from './Content';
import Dev from './Dev';
import Language from './Language';
import Network from './Network.js';
import Payments from './Payments';
import SocialNetwork from './SocialNetwork';
import SettingsDWoTR from '@/dwotr/views/Settings.tsx';
import MetricsView from '@/dwotr/views/Metrics.tsx';

const SettingsContent = (props) => {
  const pages = {
    account: Account,
    network: Network,
    appearance: Appearance,
    language: Language,
    content: ContentPage,
    payments: Payments,
    //backup: Backup, // Disabled for now, as it is not working with the WoT network
    //social_network: SocialNetwork,
    iris_account: IrisAccount,
    dev: Dev,
    dwotr: SettingsDWoTR,
    metrics: MetricsView,
  };

  const SelectedContent = pages[props.id] || pages.account;

  return (
    <div className="prose">
      <SelectedContent />
    </div>
  );
};

export default SettingsContent;
