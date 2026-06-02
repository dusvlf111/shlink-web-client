import { Button, useParsedQuery } from '@shlinkio/shlink-frontend-kit';
import type { FC } from 'react';
import { NoMenuLayout } from '../common/NoMenuLayout';
import { useT } from '../i18n';
import { useGoBack } from '../utils/helpers/hooks';
import type { ServerData } from './data';
import { isServerWithId } from './data';
import { ServerForm } from './helpers/ServerForm';
import { withSelectedServer } from './helpers/withSelectedServer';
import { useSelectedServer } from './reducers/selectedServer';
import { useServers } from './reducers/servers';
import {
  isPocketBaseLoggedIn,
  updateServerConfig,
} from './services/serverConfigsService';

export const EditServer: FC = withSelectedServer(() => {
  const t = useT();
  const { editServer } = useServers();
  const { selectServer, selectedServer } = useSelectedServer();
  const goBack = useGoBack();
  const { reconnect } = useParsedQuery<{ reconnect?: 'true' }>();

  if (!isServerWithId(selectedServer)) {
    return null;
  }

  const handleSubmit = (serverData: ServerData) => {
    editServer(selectedServer.id, serverData);
    // PocketBase is the source of truth for server configs, so persist the
    // edit there too. Best-effort: a failure still keeps the local edit.
    if (isPocketBaseLoggedIn()) {
      void updateServerConfig(selectedServer.id, serverData).catch(() => {});
    }
    if (reconnect === 'true') {
      selectServer(selectedServer.id);
    }
    goBack();
  };

  return (
    <NoMenuLayout>
      <ServerForm
        title={t('servers.edit.title', { name: selectedServer.name })}
        initialValues={selectedServer}
        onSubmit={handleSubmit}
      >
        <Button variant="secondary" onClick={goBack}>
          {t('servers.edit.cancel')}
        </Button>
        <Button type="submit">{t('servers.edit.save')}</Button>
      </ServerForm>
    </NoMenuLayout>
  );
});
