import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Icon } from '../components/Icons';
import Navbar from '../components/Navbar';

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

  // Check if current user is super admin
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

  useEffect(() => {
    fetchUsers();
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
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

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

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Gagal menyimpan user');
      }

      setShowModal(false);
      fetchUsers();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDelete = async (userId) => {
    if (!confirm('Apakah Anda yakin ingin menghapus user ini?')) {
      return;
    }

    try {
      const response = await fetch(`/api/v1/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Gagal menghapus user');
      }

      fetchUsers();
    } catch (err) {
      alert(err.message);
    }
  };

  const handlePermissionChange = (permission) => {
    setFormData({
      ...formData,
      permissions: {
        ...formData.permissions,
        [permission]: !formData.permissions[permission],
      },
    });
  };

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

        <div className="users-table-container">
          <table className="users-table">
            <thead>
              <tr>
                <th>Email</th>
                <th>Role</th>
                <th>Dibuat</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td>
                    <div className="user-email">
                      <Icon name="user" size={16} />
                      {user.email}
                    </div>
                  </td>
                  <td>
                    <span className={`role-badge role-${user.role}`}>
                      {user.role}
                    </span>
                  </td>
                  <td>{new Date(user.created_at).toLocaleDateString('id-ID')}</td>
                  <td>
                    <div className="action-buttons">
                      <button
                        className="btn-icon"
                        onClick={() => handleEdit(user)}
                        title="Edit"
                      >
                        <Icon name="edit" size={16} />
                      </button>
                      <button
                        className="btn-icon btn-danger"
                        onClick={() => handleDelete(user.id)}
                        title="Hapus"
                      >
                        <Icon name="trash" size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {users.length === 0 && (
            <div className="empty-state">
              <Icon name="users" size={48} />
              <p>Belum ada user</p>
            </div>
          )}
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
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required={modalMode === 'create'}
                    placeholder="Minimal 8 karakter"
                    minLength={8}
                  />
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
