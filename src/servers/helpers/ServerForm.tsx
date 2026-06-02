import {
  Checkbox,
  Details,
  Label,
  LabelledInput,
  LabelledRevealablePasswordInput,
  SimpleCard,
  useToggle,
} from '@shlinkio/shlink-frontend-kit';
import type { FC, PropsWithChildren, ReactNode } from 'react';
import { useState } from 'react';
import { useT } from '../../i18n';
import { usePreventDefault } from '../../utils/utils';
import type { ServerData } from '../data';

type ServerFormProps = PropsWithChildren<{
  onSubmit: (server: ServerData) => void;
  initialValues?: ServerData;
  title?: ReactNode;
}>;

export const ServerForm: FC<ServerFormProps> = ({ onSubmit, initialValues, children, title }) => {
  const t = useT();
  const [name, setName] = useState(initialValues?.name ?? '');
  const [url, setUrl] = useState(initialValues?.url ?? '');
  const [apiKey, setApiKey] = useState(initialValues?.apiKey ?? '');
  const { flag: forwardCredentials, toggle: toggleForwardCredentials } = useToggle(
    initialValues?.forwardCredentials ?? false,
  );
  const handleSubmit = usePreventDefault(() => onSubmit({ name, url, apiKey, forwardCredentials }));

  return (
    <form name="serverForm" onSubmit={handleSubmit}>
      <SimpleCard className="mb-4" bodyClassName="flex flex-col gap-y-3" title={title}>
        <LabelledInput label={t('servers.form.name')} value={name} onChange={(e) => setName(e.target.value)} required />
        <LabelledInput label={t('servers.form.url')} type="url" value={url} onChange={(e) => setUrl(e.target.value)} required />
        <LabelledRevealablePasswordInput
          label={t('servers.form.apiKey')}
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          required
        />
        <Details summary={t('servers.form.advanced')}>
          <div className="flex flex-col gap-0.5">
            <Label className="flex items-center gap-x-1.5 cursor-pointer">
              <Checkbox onChange={toggleForwardCredentials} checked={forwardCredentials} />
              {t('servers.form.forwardCredentials')}
            </Label>
            <small className="pl-5.5 text-gray-600 dark:text-gray-400 mt-0.5">
              {t('servers.form.forwardCredentials.help')}
            </small>
            <small className="pl-5.5 text-gray-600 dark:text-gray-400">
              {t('servers.form.forwardCredentials.warning')}
            </small>
          </div>
        </Details>
      </SimpleCard>

      <div className="flex items-center justify-end gap-x-2">{children}</div>
    </form>
  );
};
