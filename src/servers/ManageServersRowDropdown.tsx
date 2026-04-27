import { faCircle as toggleOnIcon } from '@fortawesome/free-regular-svg-icons';
import {
  faBan as toggleOffIcon,
  faEdit as editIcon,
  faMinusCircle as deleteIcon,
  faPlug as connectIcon,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { RowDropdown, useToggle } from '@shlinkio/shlink-frontend-kit';
import type { FC } from 'react';
import { useAuth } from '../auth/AuthContext';
import type { ServerWithId } from './data';
import { DeleteServerModal } from './DeleteServerModal';
import { useServers } from './reducers/servers';

export type ManageServersRowDropdownProps = {
  server: ServerWithId;
};

export const ManageServersRowDropdown: FC<ManageServersRowDropdownProps> = ({ server }) => {
  const { user } = useAuth();
  const canManageServers = user?.role === 'admin';
  const { setAutoConnect } = useServers();
  const { flag: isModalOpen, setToTrue: showModal, setToFalse: hideModal } = useToggle();
  const serverUrl = `/server/${server.id}`;
  const { autoConnect: isAutoConnect } = server;
  const autoConnectIcon = isAutoConnect ? toggleOffIcon : toggleOnIcon;

  return (
    <>
      <RowDropdown menuAlignment="right">
        <RowDropdown.Item to={serverUrl} className="gap-1.5">
          <FontAwesomeIcon icon={connectIcon} /> Connect
        </RowDropdown.Item>
        {canManageServers && (
          <RowDropdown.Item to={`${serverUrl}/edit`} className="gap-1.5">
            <FontAwesomeIcon icon={editIcon} /> Edit server
          </RowDropdown.Item>
        )}
        <RowDropdown.Item onClick={() => setAutoConnect(server, !isAutoConnect)} className="gap-1.5">
          <FontAwesomeIcon icon={autoConnectIcon} /> {isAutoConnect ? 'Do not a' : 'A'}uto-connect
        </RowDropdown.Item>
        {canManageServers && (
          <>
            <RowDropdown.Separator />
            <RowDropdown.Item className="[&]:text-danger gap-1.5" onClick={showModal}>
              <FontAwesomeIcon icon={deleteIcon} /> Remove server
            </RowDropdown.Item>
          </>
        )}
      </RowDropdown>

      <DeleteServerModal server={server} open={isModalOpen} onClose={hideModal} />
    </>
  );
};
