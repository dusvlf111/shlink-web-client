import type { ResultProps, TimeoutToggle } from '@shlinkio/shlink-frontend-kit';
import { Button, Result, useToggle } from '@shlinkio/shlink-frontend-kit';
import type { FC } from 'react';
import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router';
import { NoMenuLayout } from '../common/NoMenuLayout';
import { withDependencies } from '../container/context';
import { useT } from '../i18n';
import { useGoBack } from '../utils/helpers/hooks';
import type { ServerData } from './data';
import { DuplicatedServersModal } from './helpers/DuplicatedServersModal';
import { ImportServersBtn } from './helpers/ImportServersBtn';
import { ServerForm } from './helpers/ServerForm';
import { withoutSelectedServer } from './helpers/withoutSelectedServer';
import { useServers } from './reducers/servers';
import {
  createServerConfig,
  isPocketBaseLoggedIn,
} from './services/serverConfigsService';

const SHOW_IMPORT_MSG_TIME = 4000;

export type CreateServerProps = {
  useTimeoutToggle: TimeoutToggle;
};

const ImportResult = ({
  variant,
  successText,
  errorText,
}: Pick<ResultProps, 'variant'> & {
  successText: string;
  errorText: string;
}) => (
  <div className="mt-4">
    <Result variant={variant}>
      {variant === 'success' && successText}
      {variant === 'error' && errorText}
    </Result>
  </div>
);

const CreateServerBase: FC<CreateServerProps> = withoutSelectedServer(
  ({ useTimeoutToggle }) => {
    const t = useT();
    const { servers, createServers } = useServers();
    const navigate = useNavigate();
    const goBack = useGoBack();
    const hasServers = !!Object.keys(servers).length;
    const [serversImported, setServersImported] = useTimeoutToggle({
      delay: SHOW_IMPORT_MSG_TIME,
    });
    const [errorImporting, setErrorImporting] = useTimeoutToggle({
      delay: SHOW_IMPORT_MSG_TIME,
    });
    const { flag: isConfirmModalOpen, toggle: toggleConfirmModal } =
      useToggle();
    const [serverData, setServerData] = useState<ServerData>();
    const [saveError, setSaveError] = useState<string>();
    const saveNewServer = useCallback(
      async (newServerData: ServerData) => {
        // PocketBase is the single source of truth for the servers list.
        // Creating a server locally would produce an id that does not exist in
        // PocketBase, so it would silently disappear on the next
        // `replaceServers()` sync and leave the user on an unreachable
        // `/server/<id>` route. We therefore only persist through PocketBase and
        // surface a clear error on failure / when there is no session.
        if (!isPocketBaseLoggedIn()) {
          setSaveError(t('servers.create.error.notLoggedIn'));
          return;
        }

        try {
          const saved = await createServerConfig(newServerData);
          setSaveError(undefined);
          createServers([saved]);
          navigate(`/server/${saved.id}`);
        } catch {
          setSaveError(t('servers.create.error.saveFailed'));
        }
      },
      [createServers, navigate, t],
    );
    const onSubmit = useCallback(
      (newServerData: ServerData) => {
        setServerData(newServerData);

        const serverExists = Object.values(servers).some(
          ({ url, apiKey }) =>
            newServerData.url === url && newServerData.apiKey === apiKey,
        );

        if (serverExists) {
          toggleConfirmModal();
        } else {
          void saveNewServer(newServerData);
        }
      },
      [saveNewServer, servers, toggleConfirmModal],
    );

    const importSuccessText = t('servers.manage.import.success');
    const importErrorText = t('servers.manage.import.error');

    return (
      <NoMenuLayout>
        <ServerForm title={t('servers.create.title')} onSubmit={onSubmit}>
          {!hasServers && (
            <ImportServersBtn
              tooltipPlacement="top"
              onImport={setServersImported}
              onError={setErrorImporting}
            />
          )}
          {hasServers && (
            <Button variant="secondary" onClick={goBack}>
              {t('servers.create.cancel')}
            </Button>
          )}
          <Button type="submit">{t('servers.create.submit')}</Button>
        </ServerForm>

        {serversImported && (
          <ImportResult
            variant="success"
            successText={importSuccessText}
            errorText={importErrorText}
          />
        )}
        {errorImporting && (
          <ImportResult
            variant="error"
            successText={importSuccessText}
            errorText={importErrorText}
          />
        )}

        {saveError && (
          <div className="mt-4">
            <Result variant="error">{saveError}</Result>
          </div>
        )}

        <DuplicatedServersModal
          open={isConfirmModalOpen}
          duplicatedServers={serverData ? [serverData] : []}
          onClose={goBack}
          onConfirm={() => serverData && void saveNewServer(serverData)}
        />
      </NoMenuLayout>
    );
  },
);

export const CreateServer = withDependencies(CreateServerBase, [
  'useTimeoutToggle',
]);
