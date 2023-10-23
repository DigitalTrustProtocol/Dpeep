import { useEffect } from 'react';
import { FeedOption } from "@/dwotr/network/WOTPubSub";

type FeedSelectProps = {
    selectedOption?: FeedOption;
    feedOptions: FeedOption[];
    setOption: (option: FeedOption) => void;
  };
  
export  const FeedSelect = ({ selectedOption, feedOptions, setOption }: FeedSelectProps) => {
  
    useEffect(() => {
      if (!selectedOption) {
        setOption(feedOptions[0]);
      }
    }, [feedOptions]);
  
  
    const OptionLink = ({ option }: { option: FeedOption }) => {
      return (
        <button 
          className={'flex-1 ' + (option.id == selectedOption?.id ? 'graphlink active' : 'graphlink')}
          onClick={(e) => {
            e.preventDefault();
            setOption(option);
          }}
        >
          {option.name}
        </button>
      );
    }
  
    return (
      <div className="flex gap-4 w-full">
        {feedOptions.map((option) => (
          <OptionLink key={option.id} option={option} />
        ))}
      </div>
    );
  };
  
  