import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { BrowserRouter, Route, Routes } from 'react-router';
import pack from '../package.json';
import { App } from './app/App';
import { appUpdateAvailable } from './app/reducers/appUpdates';
import { AuthProvider } from './auth/AuthContext';
import { AuthGuard } from './auth/AuthGuard';
import { ErrorHandler } from './common/ErrorHandler';
import { ScrollToTop } from './common/ScrollToTop';
import { container } from './container';
import { ContainerProvider } from './container/context';
import { I18nProvider } from './i18n';
import { register as registerServiceWorker } from './serviceWorkerRegistration';
import { PublicShareStatsPage } from './share/PublicShareStatsPage';
import { setUpStore } from './store';
import './tailwind.css';

const store = setUpStore();

createRoot(document.getElementById('root')!).render(
  <ContainerProvider value={container}>
    <Provider store={store}>
      <I18nProvider>
        <BrowserRouter basename={pack.homepage}>
          <ErrorHandler>
            <Routes>
              {/* Public share routes bypass the auth guard so external viewers can read snapshots */}
              <Route path="/share/stats/:tokenId" element={<PublicShareStatsPage />} />
              <Route
                path="*"
                element={(
                  <AuthProvider>
                    <AuthGuard>
                      <ScrollToTop>
                        <App />
                      </ScrollToTop>
                    </AuthGuard>
                  </AuthProvider>
                )}
              />
            </Routes>
          </ErrorHandler>
        </BrowserRouter>
      </I18nProvider>
    </Provider>
  </ContainerProvider>,
);

// Learn more about service workers: https://cra.link/PWA
registerServiceWorker({
  onUpdate() {
    store.dispatch(appUpdateAvailable());
  },
});
