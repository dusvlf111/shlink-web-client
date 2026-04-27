import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router';
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
import { setUpStore } from './store';
import './tailwind.css';

const store = setUpStore();

createRoot(document.getElementById('root')!).render(
  <ContainerProvider value={container}>
    <Provider store={store}>
      <I18nProvider>
        <BrowserRouter basename={pack.homepage}>
          <AuthProvider>
            <AuthGuard>
              <ErrorHandler>
                <ScrollToTop>
                  <App />
                </ScrollToTop>
              </ErrorHandler>
            </AuthGuard>
          </AuthProvider>
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
