import { FeedOption } from "@/dwotr/network/provider";

type FeedSelectProps = {
    selectedOptionId?: string;
    feedOptions: FeedOption[];
    setOptionId: any; //(id: string | string) => void;
    
  };
  
export  const FeedSelect = ({ selectedOptionId, feedOptions, setOptionId }: FeedSelectProps) => {
  
    const OptionLink = ({ option }: { option: FeedOption }) => {
      return (
        <button 
          className={'flex-1 ' + (option.id == selectedOptionId ? 'graphlink active' : 'graphlink')}
          onClick={(e) => {
            e.preventDefault();
            setOptionId(option.id);
          }}
        >
          {option.name}
        </button>
      );
    }
  
    return (
      <div className="flex gap-4 w-full">
        {feedOptions?.map((option) => (
          <OptionLink key={option.id} option={option} />
        ))}
      </div>
    );
  };
  
  