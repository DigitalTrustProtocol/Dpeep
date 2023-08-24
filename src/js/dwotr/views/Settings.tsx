import Header from '../../components/header/Header';

import View32010 from './View32010';

type TestDataProps = {
  path?: string;
};

const SettingsDWoTR = (props: TestDataProps) => {
  return (
    <>
      <Header />
      <div className="flex justify-between mb-4">
        <span className="text-2xl font-bold">
          <span style={{ flex: 1 }} className="ml-1">
            Settings
          </span>
        </span>
      </div>
      <hr className="-mx-2 opacity-10 my-2" />
      <View32010 />
      <hr className="-mx-2 opacity-10 my-2" />
    </>
  );
};

export default SettingsDWoTR;
