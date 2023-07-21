import { useEffect, useState } from 'preact/hooks';
import Header from '../components/Header';
import Name from '../components/Name';
import ScrollView from '../components/ScrollView';
import Key from '../nostr/Key';
import graphNetwork from './GraphNetwork';
import { Edge, EntityType, Vertice } from './Graph';
import Identicon from '../components/Identicon';
import ProfileTrustLinks from './ProfileTrustLinks';

type TrustListViewProps = {
  id?: string;
  path?: string;
  trust1?: number;
  dir?: string;
  entitytype?: EntityType;
  title?: string;
  url?: string;
};

const Score = (props: TrustListViewProps) => {
  const [hexKey] = useState(Key.toNostrHexAddress(props.id || Key.getPubKey()));
  const [npub] = useState(Key.toNostrBech32Address(hexKey as string, 'npub'));
  const [trustedBy, setTrustedBy] = useState<Array<{ v: Vertice; edge: Edge }>>([]);

  useEffect(() => {
    graphNetwork.whenReady(() => {

      let vId = graphNetwork.g.getVerticeId(hexKey as string);
      if (!vId) return;
      let list = {} as Array<{ v: Vertice; edge: Edge }>;
      
      if(props.dir == "in") {
        list = graphNetwork.g.trustedBy(vId, props.trust1);
      } else {
        list = graphNetwork.g.outTrustById(vId, props.entitytype, props.trust1);
      }
      setTrustedBy(list);
    });
  }, [props.id]);

  const renderEntityKey = (container: any) => {
    const v = container.v;
    const edge = container.edge;
    const itemKey = v.key;
    const degree = v.degree;
    const itemNpub = Key.toNostrBech32Address(itemKey as string, 'npub') as string;
    return (
      <div key={itemKey} className="flex w-full py-2">
        <a href={`/${itemNpub}`} className="flex flex-1 gap-2">
          <Identicon str={itemNpub} width={49} />
          <div>
            <Name pub={itemNpub} />
            <br />
            {/* <span className="text-sm">{edge.val? "Trusted" : "Distrusted" }</span> */}
            {/* <span className="text-sm">Degree {degree}</span> */}
          </div>

        </a>          
        <div className="flex flex-1 gap-2">
            <ProfileTrustLinks id={itemKey} ></ProfileTrustLinks>
        </div>
      </div>
    );
  };

  // const renderSeperator = (title: string) => {
  //   return (
  //     <>
  //       <hr className="-mx-2 opacity-10 my-2" />
  //       <div className="flex items-center justify-between">
  //         <div className="flex items-center">
  //           <div className="h-12">{title}</div>
  //         </div>
  //       </div>
  //     </>
  //   );
  // };

  const renderVertices = () => {
    return <>{trustedBy.map((container: any) => renderEntityKey(container))}</>;
  };

  return (
    <>
      <Header />

      <div className="flex justify-between mb-4">
        <span className="text-2xl font-bold">
          <a className="link" href={`/${npub}`}>
            <Name pub={npub as string} />
          </a>
          <span style={{ flex: 1 }} className="ml-1">
            {props.title}
          </span>
        </span>
      </div>
      {/* <div className="flex justify-between mb-4">
        Trust 0/3/3 - Distrust 0/1/34 = Result 0/2/-31
        </div> */}
      <div className="flex flex-col w-full gap-4">
        <ScrollView>{renderVertices()}</ScrollView>
      </div>
    </>
  );
};

export default Score;

