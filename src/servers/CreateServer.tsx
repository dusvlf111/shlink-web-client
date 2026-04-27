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
import { ensureUniqueIds } from './helpers';
import { DuplicatedServersModal } from './helpers/DuplicatedServersModal';
import { ImportServersBtn } from './helpers/ImportServersBtn';
import { ServerForm } from './helpers/ServerForm';
import { withoutSelectedServer } from './helpers/withoutSelectedServer';
import { useServers } from './reducers/servers';
import { createServerConfig, isPocketBaseLoggedIn } from './services/serverConfigsService';

const SHOW_IMPORT_MSG_TIME = 4000;

export type CreateServerProps = {
  useTimeoutToggle: TimeoutToggle;
};

const ImportResult = ({ variant, successText, errorText }: Pick<ResultProps, 'variant'> & {
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

const CreateServerBase: FC<CreateServerProps> = withoutSelectedServer(({ useTimeoutToggle }) => {
  const t = useT();
  const { servers, createServers } = useServers();
  const navigate = useNavigate();
  const goBack = useGoBack();
  const hasServers = !!Object.keys(servers).length;
  const [serversImported, setServersImported] = useTimeoutToggle({ delay: SHOW_IMPORT_MSG_TIME });
  const [errorImporting, setErrorImporting] = useTimeoutToggle({ delay: SHOW_IMPORT_MSG_TIME });
  const { flag: isConfirmModalOpen, toggle: toggleConfirmModal } = useToggle();
  const [serverData, setServerData] = useState<ServerData>();
  const saveNewServer = useCallback(async (newServerData: ServerData) => {
    let saved;
    if (isPocketBaseLoggedIn()) {
      try {
        saved = await createServerConfig(newServerData);
      } catch {
        // Fall through to the local-only path so the user is never stuck if
        // PocketBase is unreachable or the request is rejected.
      }
    }

    if (!saved) {
      const [withId] = ensureUniqueIds(servers, [newServerData]);
      saved = withId;
    }

    createServers([saved]);
    navigate(`/server/${saved.id}`);
  }, [createServers, navigate, servers]);
  const onSubmit = useCallback((newServerData: ServerData) => {
    setServerData(newServerData);

    const serverExists = Object.values(servers).some(
      ({ url, apiKey }) => newServerData.url === url && newServerData.apiKey === apiKey,
    );

    if (serverExists) {
      toggleConfirmModal();
    } else {
      void saveNewServer(newServerData);
    }
  }, [saveNewServer, servers, toggleConfirmModal]);

  const importSuccessText = t('servers.manage.import.success');
  const importErrorText = t('servers.manage.import.error');

  return (
    <NoMenuLayout>
      <ServerForm title={t('servers.create.title')} onSubmit={onSubmit}>
        {!hasServers && (
          <ImportServersBtn tooltipPlacement="top" onImport={setServersImported} onError={setErrorImporting} />
        )}
        {hasServers && <Button variant="secondary" onClick={goBack}>{t('servers.create.cancel')}</Button>}
        <Button type="submit">{t('servers.create.submit')}</Button>
      </ServerForm>

      {serversImported && <ImportResult variant="success" successText={importSuccessText} errorText={importErrorText} />}
      {errorImporting && <ImportResult variant="error" successText={importSuccessText} errorText={importErrorText} />}

      <DuplicatedServersModal
        open={isConfirmModalOpen}
        duplicatedServers={serverData ? [serverData] : []}
        onClose={goBack}
        onConfirm={() => serverData && void saveNewServer(serverData)}
      />
    </NoMenuLayout>
  );
});

export const CreateServer = withDependencies(CreateServerBase, ['useTimeoutToggle']);
