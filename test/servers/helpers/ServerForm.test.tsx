import { fireEvent, screen } from '@testing-library/react';
import { ServerForm } from '../../../src/servers/helpers/ServerForm';
import { checkAccessibility } from '../../__helpers__/accessibility';
import { renderWithStore } from '../../__helpers__/setUpTest';

describe('<ServerForm />', () => {
  const onSubmit = vi.fn();
  const setUp = () => renderWithStore(<ServerForm onSubmit={onSubmit}>Something</ServerForm>);

  it('passes a11y checks', () => checkAccessibility(setUp()));

  it('renders inputs', () => {
    setUp();

    expect(screen.getByLabelText(/^이름/)).toBeInTheDocument();
    expect(screen.getByLabelText(/^URL/)).toBeInTheDocument();
    expect(screen.getByLabelText(/^API 키/)).toBeInTheDocument();
    expect(screen.getByText('Something')).toBeInTheDocument();
    expect(screen.getByText('고급 옵션')).toBeInTheDocument();
  });

  it('invokes submit callback when submit event is triggered', async () => {
    setUp();

    expect(onSubmit).not.toHaveBeenCalled();
    fireEvent.submit(screen.getByRole('form'), { preventDefault: vi.fn() });
    expect(onSubmit).toHaveBeenCalled();
  });

  it('shows advanced options', async () => {
    const { user } = setUp();
    const forwardCredentialsLabel = '이 서버로 보내는 모든 요청에 자격 증명을 함께 전달합니다.';

    expect(screen.queryByLabelText(forwardCredentialsLabel)).not.toBeInTheDocument();
    await user.click(screen.getByText('고급 옵션'));
    expect(screen.getByLabelText(forwardCredentialsLabel)).toBeInTheDocument();
  });
});
