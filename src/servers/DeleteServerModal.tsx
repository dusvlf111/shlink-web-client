import type { ExitAction } from '@shlinkio/shlink-frontend-kit';
import { CardModal } from '@shlinkio/shlink-frontend-kit';
import type { FC } from 'react';
import { useCallback } from 'react';
import { useT } from '../i18n';
import type { ServerWithId } from './data';
import { useServers } from './reducers/servers';

export type DeleteServerModalProps = {
  server: ServerWithId;
  onClose: (confirmed: boolean) => void;
  open: boolean;
};

export const DeleteServerModal: FC<DeleteServerModalProps> = ({ server, onClose, open }) => {
  const t = useT();
  const { deleteServer } = useServers();
  const onClosed = useCallback((exitAction: ExitAction) => {
    if (exitAction === 'confirm') {
      deleteServer(server);
    }
  }, [deleteServer, server]);

  return (
    <CardModal
      open={open}
      title={t('servers.delete.title')}
      variant="danger"
      onClose={() => onClose(false)}
      onConfirm={() => onClose(true)}
      onClosed={onClosed}
      confirmText={t('servers.delete.confirm')}
    >
      <div className="flex flex-col gap-y-4">
        <p>{t('servers.delete.question', { name: server?.name ?? '' })}</p>
        <p><i>{t('servers.delete.note')}</i></p>
      </div>
    </CardModal>
  );
};
