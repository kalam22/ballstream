import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Icon } from '../components/Icons';
import Navbar from '../components/Navbar';
import { validatePassword } from '../utils/security';

export default function ProfilePage() {
  const { token, user, logout } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    // Validasi password strength
    const passwordValidation = validatePassword(formData.newPassword);
    if (!passwordValidation.valid) {
      setError(passwordValidation.message);
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      setError('Password baru dan konfirmasi tidak cocok');
      return;
    }

    try {
      setLoading(true);

      // Get current user ID
      const usersResponse = await fetch('/api/v1/users', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!usersResponse.ok) {
        throw new Error('Gagal mengambil data user');
      }

      const usersData = await usersResponse.json();
      const currentUser = usersData.data.find(u => u.email === user.email);

      if (!currentUser) {
        throw new Error('User tidak ditemukan');
      }

      // Update password
      const response = await fetch(`/api/v1/users/${currentUser.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          password: formData.newPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Gagal mengubah password');
      }

      setSuccess(true);
      setFormData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });

      // Auto logout after 2 seconds
      setTimeout(async () => {
        await logout();
        window.location.href = '/login';
      }, 2000);

    } catch (err) {
      setError(err.message);
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

            {error && (
              <div className="alert alert-error">
                <Icon name="alert-circle" size={20} />
                {error}
              </div>
            )}

            {success && (
              <div className="alert alert-success">
                <Icon name="check-circle" size={20} />
                Password berhasil diubah! Anda akan logout otomatis...
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Password Baru</label>
                <input
                  type="password"
                  value={formData.newPassword}
                  onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                  required
                  placeholder="Masukkan Password Baru"
                  minLength={8}
                  disabled={loading}
                />
                <small style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '0.25rem', display: 'block' }}>
                  Masukkan Password Baru
                </small>
              </div>

              <div className="form-group">
                <label>Konfirmasi Password Baru</label>
                <input
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  required
                  placeholder="Ketik ulang password baru"
                  minLength={8}
                  disabled={loading}
                />
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

      <style>{`
        .profile-page {
          max-width: 600px;
          margin: 0 auto;
          padding: 2rem 1rem;
        }

        .profile-header {
          display: flex;
          align-items: center;
          gap: 1.5rem;
          margin-bottom: 2rem;
          padding: 2rem;
          background: var(--card-bg);
          border: 1px solid var(--border);
          border-radius: 12px;
        }

        .profile-avatar {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          background: var(--primary);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
        }

        .profile-info h1 {
          font-size: 1.5rem;
          margin: 0 0 0.5rem 0;
        }

        .profile-card {
          background: var(--card-bg);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 2rem;
        }

        .profile-card h2 {
          font-size: 1.25rem;
          margin: 0 0 0.5rem 0;
        }

        .card-subtitle {
          color: var(--text-secondary);
          margin-bottom: 1.5rem;
        }

        .form-group {
          margin-bottom: 1.5rem;
        }

        .form-group label {
          display: block;
          margin-bottom: 0.5rem;
          font-weight: 500;
          color: var(--text-primary);
        }

        .form-group input {
          width: 100%;
          padding: 0.75rem;
          border: 1px solid var(--border);
          border-radius: 6px;
          background: var(--bg);
          color: var(--text-primary);
          font-size: 1rem;
        }

        .form-group input:focus {
          outline: none;
          border-color: var(--primary);
        }

        .form-group input:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .form-actions {
          margin-top: 2rem;
        }

        .alert {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 1rem;
          border-radius: 6px;
          margin-bottom: 1.5rem;
        }

        .alert-error {
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.3);
          color: #ef4444;
        }

        .alert-success {
          background: rgba(16, 185, 129, 0.1);
          border: 1px solid rgba(16, 185, 129, 0.3);
          color: #10b981;
        }

        @media (max-width: 640px) {
          .profile-header {
            flex-direction: column;
            text-align: center;
          }
        }
      `}</style>
    </>
  );
}
