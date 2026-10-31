import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ProfileImageSettings } from '../modules/users/ProfileImageSettings';

describe('ProfileImageSettings', () => {
  it('shows a default avatar when no image is selected', () => {
    render(<ProfileImageSettings image={null} onSave={jest.fn()} onDelete={jest.fn()} />);

    expect(screen.getByLabelText('Default avatar')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /save profile image/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /delete picture/i })).toBeDisabled();
  });

  it('previews an accepted image and reports success after saving', async () => {
    const onSave = jest.fn(() => new Promise<void>((resolve) => setTimeout(resolve, 10)));
    render(<ProfileImageSettings image={null} onSave={onSave} onDelete={jest.fn()} />);
    const imageFile = new File(['image-data'], 'profile.png', { type: 'image/png' });

    fireEvent.change(screen.getByLabelText('Choose profile image'), {
      target: { files: [imageFile] },
    });

    const preview = await screen.findByAltText('Profile picture preview');
    expect(preview).toHaveAttribute('src', expect.stringContaining('data:image/png;base64'));

    fireEvent.click(screen.getByRole('button', { name: /save profile image/i }));

    await waitFor(() => expect(onSave).toHaveBeenCalledWith(preview.getAttribute('src')));
    expect(await screen.findByRole('status')).toHaveTextContent(/saved in this browser/i);
    expect(screen.getAllByText(/not linked to an authenticated account or synced/i).length).toBeGreaterThan(0);
  });

  it('shows a save error and keeps the preview when storage fails', async () => {
    const onSave = jest.fn().mockRejectedValue(new Error('Storage unavailable'));
    render(<ProfileImageSettings image={null} onSave={onSave} onDelete={jest.fn()} />);

    fireEvent.change(screen.getByLabelText('Choose profile image'), {
      target: { files: [new File(['image-data'], 'profile.png', { type: 'image/png' })] },
    });
    await screen.findByAltText('Profile picture preview');

    fireEvent.click(screen.getByRole('button', { name: /save profile image/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/could not save the profile image/i);
    expect(screen.getByAltText('Profile picture preview')).toBeInTheDocument();
  });

  it('asks for confirmation and reports successful deletion', async () => {
    const onDelete = jest.fn();
    const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);
    render(
      <ProfileImageSettings
        image="data:image/png;base64,cHJvZmlsZQ=="
        onSave={jest.fn()}
        onDelete={onDelete}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /delete picture/i }));

    expect(confirmSpy).toHaveBeenCalled();
    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(await screen.findByRole('status')).toHaveTextContent(/deleted from this browser/i);
    confirmSpy.mockRestore();
  });

  it('does not delete when confirmation is declined', () => {
    const onDelete = jest.fn();
    const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(false);
    render(
      <ProfileImageSettings
        image="data:image/png;base64,cHJvZmlsZQ=="
        onSave={jest.fn()}
        onDelete={onDelete}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /delete picture/i }));

    expect(onDelete).not.toHaveBeenCalled();
    expect(screen.getByAltText('Current profile')).toBeInTheDocument();
    confirmSpy.mockRestore();
  });

  it('shows a deletion error when storage fails', async () => {
    const onDelete = jest.fn().mockRejectedValue(new Error('Storage unavailable'));
    const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);
    render(
      <ProfileImageSettings
        image="data:image/png;base64,cHJvZmlsZQ=="
        onSave={jest.fn()}
        onDelete={onDelete}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /delete picture/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/could not delete the profile picture/i);
    expect(screen.getByAltText('Current profile')).toBeInTheDocument();
    confirmSpy.mockRestore();
  });

  it('rejects unsupported image types', () => {
    render(<ProfileImageSettings image={null} onSave={jest.fn()} onDelete={jest.fn()} />);

    fireEvent.change(screen.getByLabelText('Choose profile image'), {
      target: { files: [new File(['content'], 'profile.gif', { type: 'image/gif' })] },
    });

    expect(screen.getByRole('alert')).toHaveTextContent(/JPEG, PNG, or WebP/i);
    expect(screen.queryByAltText('Profile picture preview')).not.toBeInTheDocument();
  });

  it('rejects images larger than 5 MB', () => {
    render(<ProfileImageSettings image={null} onSave={jest.fn()} onDelete={jest.fn()} />);
    const oversizedImage = new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'profile.png', {
      type: 'image/png',
    });

    fireEvent.change(screen.getByLabelText('Choose profile image'), {
      target: { files: [oversizedImage] },
    });

    expect(screen.getByRole('alert')).toHaveTextContent(/smaller than 5 MB/i);
  });
});