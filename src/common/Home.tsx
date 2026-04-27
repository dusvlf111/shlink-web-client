import { faExternalLinkAlt, faPlus } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Button, Card } from '@shlinkio/shlink-frontend-kit';
import { clsx } from 'clsx';
import type { FC } from 'react';
import { useEffect } from 'react';
import { ExternalLink } from 'react-external-link';
import { useNavigate } from 'react-router';
import { useAuth } from '../auth/AuthContext';
import { useT } from '../i18n';
import { withoutSelectedServer } from '../servers/helpers/withoutSelectedServer';
import { useServers } from '../servers/reducers/servers';
import { ServersListGroup } from '../servers/ServersListGroup';
import { ShlinkLogo } from './img/ShlinkLogo';

export const Home: FC = withoutSelectedServer(() => {
  const navigate = useNavigate();
  const t = useT();
  const { user } = useAuth();
  const canManageServers = user?.role === 'admin';
  const { servers } = useServers();
  const serversList = Object.values(servers);
  const hasServers = serversList.length > 0;

  useEffect(() => {
    // Try to redirect to the first server marked as auto-connect
    const autoConnectServer = serversList.find(({ autoConnect }) => autoConnect);
    if (autoConnectServer) {
      navigate(`/server/${autoConnectServer.id}`);
    }
  }, [serversList, navigate]);

  return (
    <div className="px-3 w-full">
      <Card className="mx-auto max-w-[720px] overflow-hidden">
        <div className="flex flex-col md:flex-row">
          <div className="p-6 hidden md:flex items-center w-[40%]">
            <div className="w-full">
              <ShlinkLogo />
            </div>
          </div>

          <div className="md:border-l border-lm-border dark:border-dm-border flex-grow">
            <h1
              className={clsx(
                'p-4 text-center border-lm-border dark:border-dm-border',
                { 'border-b': !hasServers },
              )}
            >
              {t('home.title')}
            </h1>
            {hasServers ? (
              <>
                <ServersListGroup servers={serversList} />
                <p className="px-4 py-2 text-center text-xs text-gray-400 dark:text-gray-500">
                  {t('home.editHint')}
                </p>
              </>
            ) : (
              <div className="p-6 text-center flex flex-col gap-12 text-xl">
                <p>{t('home.empty.title')}</p>
                <p>{canManageServers ? t('home.subtitle') : t('home.empty.contactAdmin')}</p>
                {canManageServers && (
                  <p>
                    <Button to="/server/create" size="lg" inline>
                      <FontAwesomeIcon icon={faPlus} widthAuto /> {t('home.empty.action')}
                    </Button>
                  </p>
                )}
                <p>
                  <ExternalLink href="https://shlink.io/documentation">
                    <small>
                      <span className="mr-2">{t('home.learnMore')}</span>
                      <FontAwesomeIcon icon={faExternalLinkAlt} />
                    </small>
                  </ExternalLink>
                </p>
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
});
