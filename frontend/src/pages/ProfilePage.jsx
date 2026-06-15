import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Icon } from '../components/Icons';
import Navbar from '../components/Navbar';
import { validatePassword } from '../utils/security';
import { swal } from '../utils/swal';

function EyeOn() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  );
}

function EyeOff() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
      <path d="m6.72 6.72-4.24-4.24"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  );
}

export default function ProfilePage() {
  const { token, user, logout } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const handleSubmit = async (e) => {
    e.preventDefault();

    const passwordValidation = validatePassword(formData.newPassword);
    if (!passwordValidation.valid) {
      await swal.error({ title: 'Password Tidak Valid', text: passwordValidation.message });
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      await swal.error({ title: 'Password Tidak Cocok', text: 'Password baru dan konfirmasi tidak cocok.' });
      return;
    }

    try {
      setLoading(true);

      const usersResponse = await fetch('/api/v1/users', {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!usersResponse.ok) throw new Error('Gagal mengambil data user');

      const usersData = await usersResponse.json();
      const currentUser = usersData.data.find(u => u.email === user.email);
      if (!currentUser) throw new Error('User tidak ditemukan');

      const response = await fetch(`/api/v1/users/${currentUser.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          current_password: formData.currentPassword,
          password: formData.newPassword,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error?.message || 'Gagal mengubah password');

      setFormData({ currentPassword: '', newPassword: '', confirmPassword: '' });

      await swal.success({
        title: 'Password Berhasil Diubah!',
        text: 'Anda akan logout otomatis dalam 2 detik...',
        timer: 2000,
      });

      await logout();
      window.location.href = '/login';

    } catch (err) {
      await swal.error({ title: 'Gagal Mengubah Password', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Navbar activePage="profile" />
      <div className="page-container">
        <div className="profile-page">
          <div className="profile-header">
            <div className="profile-avatar">
              <Icon name="user" size={48} />
            </div>
            <div className="profile-info">
              <h1>{user?.email}</h1>
              <span className={`role-badge role-${user?.role}`}>
                {user?.role === 'super_admin' ? 'Super Admin' : 'User'}
              </span>
            </div>
          </div>

          <div className="profile-card">
            <h2>Ubah Password</h2>
            <p className="card-subtitle">Pastikan password baru Anda kuat dan mudah diingat</p>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Password Saat Ini</label>
                <div className="input-wrapper">
                  <input
                    type={showCurrent ? 'text' : 'password'}
                    value={formData.currentPassword}
                    onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
                    required
                    placeholder="Masukkan password saat ini"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrent(!showCurrent)}
                    className="password-toggle"
                    aria-label={showCurrent ? 'Sembunyikan password' : 'Tampilkan password'}
                    tabIndex={-1}
                  >
                    {showCurrent ? <EyeOff /> : <EyeOn />}
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label>Password Baru</label>
                <div className="input-wrapper">
                  <input
                    type={showNew ? 'text' : 'password'}
                    value={formData.newPassword}
                    onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                    required
                    placeholder="Masukkan Password Baru"
                    minLength={8}
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew(!showNew)}
                    className="password-toggle"
                    aria-label={showNew ? 'Sembunyikan password' : 'Tampilkan password'}
                    tabIndex={-1}
                  >
                    {showNew ? <EyeOff /> : <EyeOn />}
                  </button>
                </div>
                <small className="password-hint">Minimal 8 karakter, kombinasi huruf besar, angka, dan simbol.</small>
              </div>

              <div className="form-group">
                <label>Konfirmasi Password Baru</label>
                <div className="input-wrapper">
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    required
                    placeholder="Ketik ulang password baru"
                    minLength={8}
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="password-toggle"
                    aria-label={showConfirm ? 'Sembunyikan password' : 'Tampilkan password'}
                    tabIndex={-1}
                  >
                    {showConfirm ? <EyeOff /> : <EyeOn />}
                  </button>
                </div>
              </div>

              <div className="form-actions">
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={loading}
                >
                  {loading ? 'Menyimpan...' : 'Ubah Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
