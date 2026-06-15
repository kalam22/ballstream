import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Icon } from '../components/Icons';
import Navbar from '../components/Navbar';
import { validatePassword, isValidEmail } from '../utils/security';
import { getCSRFToken, invalidateCSRFToken } from '../hooks/useApi';
import { swal } from '../utils/swal';

export default function UsersPage() {
  const { token, user } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('create'); // 'create' or 'edit'
  const [selectedUser, setSelectedUser] = useState(null);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    role: 'user',
  });
  const [passwordError, setPasswordError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      console.log('[UsersPage] Fetching users with token:', token ? 'Token exists' : 'No token');
      
      const response = await fetch('/api/v1/users', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      console.log('[UsersPage] Response status:', response.status);
      
      const data = await response.json();
      console.log('[UsersPage] Response data:', data);

      if (!response.ok) {
        throw new Error(data.error?.message || 'Gagal memuat data user');
      }

      setUsers(data.data || []);
      setError(null);
    } catch (err) {
      console.error('[UsersPage] Error fetching users:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setModalMode('create');
    setSelectedUser(null);
    setFormData({
      email: '',
      password: '',
      role: 'user',
    });
    setShowPassword(false);
    setShowModal(true);
  };

  const handleEdit = (user) => {
    setModalMode('edit');
    setSelectedUser(user);
    setFormData({
      email: user.email,
      password: '',
      role: user.role,
    });
    setShowPassword(false);
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setPasswordError('');

    // Validate email
    if (!isValidEmail(formData.email)) {
      setPasswordError('Format email tidak valid');
      return;
    }

    // Validate password for new users or when password is being changed
    if (modalMode === 'create' || formData.password) {
      const passwordValidation = validatePassword(formData.password);
      if (!passwordValidation.valid) {
        setPasswordError(passwordValidation.message);
        return;
      }
    }

    try {
      const url = modalMode === 'create' 
        ? '/api/v1/users'
        : `/api/v1/users/${selectedUser.id}`;
      
      const method = modalMode === 'create' ? 'POST' : 'PUT';
      
      const body = modalMode === 'create'
        ? formData
        : {
            email: formData.email !== selectedUser.email ? formData.email : undefined,
            password: formData.password || undefined,
            role: formData.role !== selectedUser.role ? formData.role : undefined,
          };

      const csrfToken = await getCSRFToken();

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {})
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Gagal menyimpan user');
      }

      setShowModal(false);
      fetchUsers();
      await swal.success({ title: modalMode === 'create' ? 'User berhasil ditambahkan' : 'User berhasil diperbarui' });
    } catch (err) {
      await swal.error({ title: 'Gagal menyimpan', text: err.message });
    } finally {
      invalidateCSRFToken();
    }
  };

  const handleDelete = async (userId) => {
    const confirmed = await swal.confirm({
      title: 'Hapus User?',
      text: 'Tindakan ini tidak dapat dibatalkan.',
      confirmText: 'Hapus',
      cancelText: 'Batal',
    })
    if (!confirmed) return;

    try {
      const csrfToken = await getCSRFToken();

      const response = await fetch(`/api/v1/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {})
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Gagal menghapus user');
      }

      fetchUsers();
      await swal.success({ title: 'User berhasil dihapus' });
    } catch (err) {
      await swal.error({ title: 'Gagal menghapus', text: err.message });
    } finally {
      invalidateCSRFToken();
    }
  };

  const handleResetPassword = async (userId) => {
    const confirmed = await swal.confirm({
      title: 'Reset Password?',
      text: 'Password akan direset menjadi "Kana123!".',
      confirmText: 'Reset',
      cancelText: 'Batal',
    })
    if (!confirmed) return;

    try {
      const csrfToken = await getCSRFToken();

      const response = await fetch(`/api/v1/users/${userId}/reset-password`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {})
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Gagal mereset password');
      }

      await swal.success({ title: 'Password berhasil direset ke "Kana123!"' });
    } catch (err) {
      await swal.error({ title: 'Gagal mereset password', text: err.message });
    } finally {
      invalidateCSRFToken();
    }
  };

  const handleResetSession = async (userId) => {
    const confirmed = await swal.confirm({
      title: 'Reset Session?',
      text: 'User akan dipaksa keluar (force logout) dari semua perangkat.',
      confirmText: 'Reset',
      cancelText: 'Batal',
    })
    if (!confirmed) return;

    try {
      const csrfToken = await getCSRFToken();

      const response = await fetch(`/api/v1/users/${userId}/reset-session`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {})
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Gagal mereset session');
      }

      await swal.success({ title: 'Session berhasil direset' });
    } catch (err) {
      await swal.error({ title: 'Gagal mereset session', text: err.message });
    } finally {
      invalidateCSRFToken();
    }
  };



  // Loading state check (after all hooks)
  if (loading) {
    return (
      <>
        <Navbar activePage="users" />
        <div className="page-container">
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Memuat data user...</p>
          </div>
        </div>
      </>
    );
  }

  // Check if current user is super admin (after hooks)
  if (user?.role !== 'super_admin') {
    return (
      <>
        <Navbar activePage="users" />
        <div className="page-container">
          <div className="error-state">
            <Icon name="alert-circle" size={48} />
            <h2>Akses Ditolak</h2>
            <p>Anda tidak memiliki izin untuk mengakses halaman ini. Hanya Super Admin yang dapat mengakses User Management.</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar activePage="users" />
      <div className="page-container">
        <div className="users-page">
        <div className="page-header">
          <div>
            <h1>Manajemen User</h1>
            <p className="page-subtitle">Kelola user dan hak akses mereka</p>
          </div>
          <button className="btn btn-primary" onClick={handleCreate}>
            <Icon name="user-plus" size={18} />
            Tambah User
          </button>
        </div>

        {error && (
          <div className="alert alert-error">
            <Icon name="alert-circle" size={20} />
            {error}
          </div>
        )}

        <div className="data-table-container">
          <div className="data-table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: '30%' }}>EMAIL</th>
                  <th style={{ width: '15%' }}>ROLE</th>
                  <th style={{ width: '15%' }}>DIBUAT</th>
                  <th style={{ width: '15%' }}>STATUS</th>
                  <th style={{ width: '15%' }}>LAST LOGIN</th>
                  <th style={{ width: '10%', textAlign: 'center' }}>AKSI</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', padding: '3rem' }}>
                      <div className="empty-state">
                        <Icon name="users" size={48} />
                        <p>Belum ada user</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr key={user.id}>
                      <td>
                        <div className="user-email-cell">
                          <Icon name="user" size={16} />
                          <span className="email-text" title={user.email}>{user.email}</span>
                        </div>
                      </td>
                      <td>
                        <span className={`role-badge role-${user.role}`}>
                          {user.role === 'super_admin' ? 'SUPER_ADMIN' : 'USER'}
                        </span>
                      </td>
                      <td>
                        <span className="date-text">
                          {new Date(user.created_at).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'numeric',
                            year: 'numeric'
                          })}
                        </span>
                      </td>
                      <td>
                        <span className={`status-badge ${user.is_online ? 'online' : 'offline'}`}>
                          <span className="status-dot" />
                          {user.is_online ? 'Online' : 'Offline'}
                        </span>
                      </td>
                      <td>
                        <span className="date-text">
                          {user.last_login_at ? new Date(user.last_login_at).toLocaleString('id-ID', {
                            day: 'numeric',
                            month: 'numeric',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          }) : '-'}
                        </span>
                      </td>
                      <td>
                        <div className="action-buttons">
                          <button
                            className="btn-icon btn-edit"
                            onClick={() => handleEdit(user)}
                            title="Edit User"
                          >
                            <Icon name="edit" size={16} />
                          </button>
                          <button
                            className="btn-icon btn-reset-password"
                            onClick={() => handleResetPassword(user.id)}
                            title="Reset Password ke Default"
                          >
                            <Icon name="key" size={16} />
                          </button>
                          <button
                            className="btn-icon btn-reset-session"
                            onClick={() => handleResetSession(user.id)}
                            title="Reset Session / Force Logout"
                          >
                            <Icon name="shield" size={16} />
                          </button>
                          <button
                            className="btn-icon btn-delete"
                            onClick={() => handleDelete(user.id)}
                            title="Hapus User"
                          >
                            <Icon name="trash" size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{modalMode === 'create' ? 'Tambah User Baru' : 'Edit User'}</h2>
              <button className="btn-close" onClick={() => setShowModal(false)}>
                <Icon name="x" size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                {passwordError && (
                  <div className="alert alert-error" style={{ marginBottom: '1rem' }}>
                    <Icon name="alert-circle" size={20} />
                    {passwordError}
                  </div>
                )}
                
                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                    placeholder="user@example.com"
                  />
                </div>

                <div className="form-group">
                  <label>Password {modalMode === 'edit' && '(kosongkan jika tidak diubah)'}</label>
                  <div style={{ position: 'relative', width: '100%' }}>
                    <input
                      type={showPassword ? "text" : "password"}
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      required={modalMode === 'create'}
                      placeholder="Masukkan Password Baru"
                      style={{ paddingRight: '2.5rem', width: '100%' }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      style={{
                        position: 'absolute',
                        right: '0.75rem',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: 0,
                        display: 'flex',
                        alignItems: 'center',
                        color: 'var(--color-text-muted, #718096)'
                      }}
                      title={showPassword ? "Sembunyikan Password" : "Tampilkan Password"}
                    >
                      <Icon name={showPassword ? "eye-off" : "eye"} size={18} />
                    </button>
                  </div>
                </div>

                <div className="form-group">
                  <label>Role</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  >
                    <option value="user">User</option>
                    <option value="super_admin">Super Admin</option>
                  </select>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  Batal
                </button>
                <button type="submit" className="btn btn-primary">
                  {modalMode === 'create' ? 'Tambah User' : 'Simpan Perubahan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      </div>
    </>
  );
}
