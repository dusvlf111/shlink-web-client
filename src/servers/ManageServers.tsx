import { faFileDownload as exportIcon, faPlus as plusIcon } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import type { TimeoutToggle } from '@shlinkio/shlink-frontend-kit';
import { Button, Result, SearchInput, SimpleCard, Table } from '@shlinkio/shlink-frontend-kit';
import type { FC } from 'react';
import { useMemo, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { NoMenuLayout } from '../common/NoMenuLayout';
import { withDependencies } from '../container/context';
import { useT } from '../i18n';
import { ImportServersBtn } from './helpers/ImportServersBtn';
import { withoutSelectedServer } from './helpers/withoutSelectedServer';
import { ManageServersRow } from './ManageServersRow';
import { useServers } from './reducers/servers';
import type { ServersExporter } from './services/ServersExporter';

export type ManageServersProps = {
  ServersExporter: ServersExporter;
  useTimeoutToggle: TimeoutToggle;
};

const SHOW_IMPORT_MSG_TIME = 4000;

const ManageServersBase: FC<ManageServersProps> = withoutSelectedServer(({
  ServersExporter: serversExporter,
  useTimeoutToggle,
}) => {
  const t = useT();
  const { user } = useAuth();
  const canManageServers = user?.role === 'admin';
  const { servers } = useServers();
  const [searchTerm, setSearchTerm] = useState('');
  const allServers = useMemo(() => Object.values(servers), [servers]);
  const filteredServers = useMemo(
    () => allServers.filter(({ name, url }) => `${name} ${url}`.toLowerCase().match(searchTerm.toLowerCase())),
    [allServers, searchTerm],
  );
  const hasAutoConnect = allServers.some(({ autoConnect }) => !!autoConnect);

  const [errorImporting, setErrorImporting] = useTimeoutToggle({ delay: SHOW_IMPORT_MSG_TIME });

  return (
    <NoMenuLayout className="flex flex-col gap-y-4">
      <SearchInput onChange={setSearchTerm} />

      <div className="flex flex-col md:flex-row gap-2">
        <div className="flex gap-2">
          {canManageServers && (
            <ImportServersBtn className="grow" onError={setErrorImporting}>{t('servers.manage.import')}</ImportServersBtn>
          )}
          {filteredServers.length > 0 && (
            <Button variant="secondary" className="grow" onClick={async () => serversExporter.exportServers()}>
              <FontAwesomeIcon icon={exportIcon} widthAuto /> {t('servers.manage.export')}
            </Button>
          )}
        </div>
        {canManageServers && (
          <Button className="md:ml-auto" to="/server/create">
            <FontAwesomeIcon icon={plusIcon} widthAuto /> {t('servers.manage.add')}
          </Button>
        )}
      </div>

      <SimpleCard className="card">
        <Table header={(
          <Table.Row>
            {hasAutoConnect && (
              <Table.Cell className="w-8.75"><span className="sr-only">{t('servers.manage.col.autoConnect')}</span></Table.Cell>
            )}
            <Table.Cell>{t('servers.manage.col.name')}</Table.Cell>
            <Table.Cell>{t('servers.manage.col.url')}</Table.Cell>
            <Table.Cell><span className="sr-only">{t('servers.manage.col.options')}</span></Table.Cell>
          </Table.Row>
        )}>
          {!filteredServers.length && (
            <Table.Row className="text-center"><Table.Cell colSpan={4}>{t('servers.manage.empty')}</Table.Cell></Table.Row>
          )}
          {filteredServers.map((server) => (
            <ManageServersRow key={server.id} server={server} hasAutoConnect={hasAutoConnect} />
          ))}
        </Table>
      </SimpleCard>

      {errorImporting && (
        <div>
          <Result variant="error">{t('servers.manage.import.error')}</Result>
        </div>
      )}
    </NoMenuLayout>
  );
});

export const ManageServers = withDependencies(ManageServersBase, ['ServersExporter', 'useTimeoutToggle']);
