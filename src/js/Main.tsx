import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet';
import AsyncRoute from 'preact-async-route';
import { Router, RouterOnChangeArgs } from 'preact-router';

import useLocalState from '@/state/useLocalState.ts';

import Footer from './components/Footer';
import Show from './components/helpers/Show';
import Modal from './components/modal/Modal';
import NavigationSidebar from './components/NavigationSidebar.tsx';
import localState from './state/LocalState.ts';
import { translationLoaded } from './translations/Translation.mjs';
import Helpers from './utils/Helpers';
import About from './views/About';
import Global from './views/feeds/Global';
import Home from './views/feeds/Home';
import Notifications from './views/feeds/Notifications';
import SearchFeed from './views/feeds/Search';
import KeyConverter from './views/KeyConverter';
import Login from './views/login/Login.tsx';
import EditProfile from './views/profile/EditProfile.tsx';
import Follows from './views/profile/Follows.tsx';
import Profile from './views/profile/Profile.tsx';
import Search from './views/Search';
import LogoutConfirmation from './views/settings/LogoutConfirmation.tsx';
import Subscribe from './views/Subscribe';

import '@fontsource/lato/400.css';
import '@fontsource/lato/700.css';
import '../css/cropper.min.css';
import './dwotr/views/style.css';

import Demo from './dwotr/views/Demo';
import View32010 from './dwotr/views/View32010.tsx';
import View16463 from './dwotr/views/View16463.tsx';
import InitializeWoT from './dwotr/views/InitializeWoT.tsx';
import MetricsView from './dwotr/views/Metrics.tsx';
import NoteNew from './views/NoteNew.tsx';
import NoteView from './dwotr/views/NoteView.tsx';


const Main = () => {
  const [loggedIn] = useLocalState('loggedIn', false);
  const [unseenMsgsTotal] = useLocalState('unseenMsgsTotal', 0);
  const [activeRoute, setActiveRoute] = useLocalState('activeRoute', '');
  const [translationsLoadedState, setTranslationsLoadedState] = useState(false);
  const [showLoginModal] = useLocalState('showLoginModal', false);

  const [Initialized, setInitialized] = useState(false);

  useEffect(() => {
    translationLoaded.then(() => {
      setTranslationsLoadedState(true);
    });
  }, []);

  const handleRoute = (e: RouterOnChangeArgs) => {
    const currentActiveRoute = e.url;
    setActiveRoute(currentActiveRoute);
    localState.get('activeRoute').put(currentActiveRoute);
  };

  let title = '';
  if (activeRoute && activeRoute.length > 1) {
    title = Helpers.capitalize(activeRoute.replace('/', '').split('?')[0]);
  }
  const titleTemplate = unseenMsgsTotal ? `(${unseenMsgsTotal}) %s | Dpeep` : '%s | Dpeep';
  const defaultTitle = unseenMsgsTotal ? `(${unseenMsgsTotal}) Dpeep` : 'Dpeep';

  if (!translationsLoadedState) {
    return <div />;
  }

  if (!loggedIn && window.location.pathname.length <= 1) {
    return <Login fullScreen={true} />;
  }

  if(loggedIn && !Initialized) {
    return <InitializeWoT setInitialized={setInitialized} />;
  }

  const NoteOrProfile = (params: { id?: string; path: string }) => {
    if (params.id?.startsWith('note')) {
      return <NoteView id={params.id} />;
    }
    return <Profile id={params.id} tab="posts" path={params.path} />;
  };

  return (
    <div className="flex justify-center">
      <section className="flex w-full max-w-screen-xl justify-between relative">
        <Show when={loggedIn}>
          <NavigationSidebar />
        </Show>
        <Helmet titleTemplate={titleTemplate} defaultTitle={defaultTitle}>
          <title>{title}</title>
          <meta name="description" content="Connecting People" />
          <meta property="og:type" content="website" />
          <meta property="og:title" content={title} />
          <meta property="og:description" content="Connecting People" />
          <meta property="og:image" content="https://iris.to/assets/img/irisconnects.png" />
          <meta name="twitter:card" content="summary_large_image" />
          <meta name="twitter:image" content="https://iris.to/assets/img/irisconnects.png" />
        </Helmet>
        <div className="pb-16 md:pb-0 relative flex h-full flex-grow flex-col w-1/2">
          <Router onChange={(e) => handleRoute(e)}>
            <Home path="/" />
            <Search path="/search" focus={true} />
            <KeyConverter path="/key" />
            <Global path="/global" />
            <SearchFeed path="/search/:query" />
            <Login path="/login" fullScreen={true} />
            <Notifications path="/notifications" />
            <AsyncRoute
              path="/chat/:id?"
              getComponent={() => import('./views/chat/Chat').then((module) => module.default)}
            />
            <NoteNew path="/post/new" />
            <NoteView path="/post/:id+" />
            <About path="/about" />
            <AsyncRoute
              path="/settings/:page?"
              getComponent={() =>
                import('./views/settings/Settings').then((module) => module.default)
              }
            />
            <LogoutConfirmation path="/logout" />
            <EditProfile path="/profile/edit" />
            <Subscribe path="/subscribe" />
            <Profile path="/profile/:id" tab="posts" />
            <Profile path="/:id/replies" tab="replies" />
            <Profile path="/:id/likes" tab="likes" />
            <Follows path="/follows/:id" />
            <Follows followers={true} path="/followers/:id" />

            
            <AsyncRoute
              path="/graph/:npub?/:dir?/:trusttype?/:view?/:filter?"
              getComponent={() =>
                import('./dwotr/views/GraphView').then((module) => module.default)
              }
            />

            <View32010 path="/trusts/" />
            <View16463 path="/flags/" />
            <MetricsView path="/metrics/" />
            <Demo path="/demo/:id?" />

            <AsyncRoute
              path="/explorer/:p?"
              getComponent={() =>
                import('./views/explorer/Explorer').then((module) => module.default)
              }
            />
            <NoteOrProfile path="/:id" />
          </Router>
        </div>
        <Footer />
      </section>

      <Show when={showLoginModal}>
        <Modal
          centerVertically={true}
          showContainer={true}
          onClose={() => localState.get('showLoginModal').put(false)}
        >
          <Login />
        </Modal>
      </Show>
    </div>
  );
};

export default Main;
