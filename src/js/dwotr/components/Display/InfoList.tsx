import { formatValue } from "./HtmlFormatValue";

type InfoListProps = {
  data?: InfoItem[];
  title?: string;
};

interface InfoItem {
  name: preact.ComponentChild; // Allow any valid React Node for the name
  value: string | number | Date | boolean | null | undefined | object | bigint;
}




const InfoList = ({ data, title }: InfoListProps) => {
  return (<div className="flex flex-col border-2 rounded-lg border-white p-4">
  <div className="px-4 py-2 text-left text-lg font-semibold">{title}</div>
  {data?.map((item) => (
    <div className="flex justify-between p-2">
      <span className="whitespace-nowrap">{item.name}</span>&nbsp;
      <span className="flex-grow text-right">{formatValue(item.value)}</span>
    </div>
  ))}
</div>);
};

export default InfoList;
