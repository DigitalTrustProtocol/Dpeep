import Header from "@/components/header/Header";
import ErrorBoundary from "@/components/helpers/ErrorBoundary";
import Show from "@/components/helpers/Show";
import Search from "@/views/Search";

const View = ({ children, hideHeader = false, hideSideBar = false }) => {

  return (
    <div className="flex flex-row h-full w-full">
      <div className={`flex flex-col w-full h-full ${hideSideBar ? '' : 'lg:w-2/3'}`}>
        <Show when={!hideHeader}>
          <Header />
        </Show>
        <div className="h-full">
          <ErrorBoundary>{children}</ErrorBoundary>
        </div>
      </div>
      <Show when={!hideSideBar}>
        <div className="flex-col hidden lg:flex lg:w-1/3">
          <Search key="search" focus={false} />
        </div>
      </Show>
    </div>
  );
};

export default View;
