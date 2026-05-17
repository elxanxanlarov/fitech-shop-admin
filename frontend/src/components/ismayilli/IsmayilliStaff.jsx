import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Alert from '../ui/Alert';
import { staffApi, authApi } from '../../api';
import { Users, Plus, Edit, Trash2, Shield, Mail, Phone, Calendar } from 'lucide-react';

export default function IsmayilliStaff() {
  const navigate = useNavigate();
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    fetchContextAndStaff();
  }, []);

  const fetchContextAndStaff = async () => {
    setLoading(true);
    try {
      const userRes = await authApi.me();
      if (userRes.success) {
        setCurrentUser(userRes.data);
      }
      
      const staffRes = await staffApi.getAll({ store: 'ISMAYILLI' });
      if (staffRes.success) {
        setStaffList(staffRes.date || []);
      }
    } catch (error) {
      console.error('Fetch staff error:', error);
      Alert.error('Xəta', 'İşçi siyahısı yüklənərkən xəta baş verdi');
    } finally {
      setLoading(false);
    }
  };

  const handleAddStaff = () => {
    navigate('/admin/staff-form');
  };

  const handleEditStaff = (staff) => {
    navigate(`/admin/staff-form?id=${staff.id}`);
  };

  const handleDeleteStaff = async (staff) => {
    const isCore = ['superadmin', 'admin'].includes(staff.role?.name?.toLowerCase());
    const isSelf = currentUser?.id === staff.id;

    if (isSelf) {
      Alert.error('Xəta', 'Öz hesabınızı silə bilməzsiniz!');
      return;
    }

    if (isCore && currentUser?.role?.name?.toLowerCase() !== 'superadmin') {
      Alert.error('Xəta', 'Bu roldakı istifadəçini silməyə icazəniz yoxdur!');
      return;
    }

    const confirm = await Alert.confirm(
      'Silməyə əminsiniz?',
      `${staff.name} ${staff.surName || ''} adlı işçi tamamilə silinəcəkdir.`
    );
    if (!confirm.isConfirmed) return;

    try {
      Alert.loading('Silinir...');
      const res = await staffApi.delete(staff.id);
      if (res.success) {
        Alert.success('Uğurlu', 'İşçi uğurla silindi');
        fetchContextAndStaff();
      }
    } catch (error) {
      Alert.close();
      Alert.error('Xəta', error.response?.data?.message || 'Silinmə zamanı xəta baş verdi');
    }
  };

  const getRoleDisplayName = (roleName) => {
    const rname = (roleName || '').toLowerCase();
    if (rname === 'ismayilliadmin') return 'Admin (İsmayıllı)';
    if (rname === 'ismayilliseller') return 'Satışçı (İsmayıllı)';
    return roleName;
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Users className="text-purple-600 w-7 h-7" /> İşçilər (İsmayıllı)
          </h1>
          <p className="text-slate-500 text-sm mt-1">İsmayıllı mağazasının işçi heyətinin idarə edilməsi</p>
        </div>
        <div>
          <button
            onClick={handleAddStaff}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-all font-semibold shadow-md shadow-purple-100"
          >
            <Plus className="w-4 h-4" /> Yeni İşçi
          </button>
        </div>
      </div>

      {/* Grid List */}
      {loading ? (
        <div className="bg-white p-12 text-center text-slate-500 rounded-2xl border border-slate-100">Yüklənir...</div>
      ) : staffList.length === 0 ? (
        <div className="bg-white p-12 text-center text-slate-400 rounded-2xl border border-slate-100 font-medium">Heç bir işçi tapılmadı.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {staffList.map((staff) => (
            <div key={staff.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 hover:shadow-md transition-all flex flex-col justify-between space-y-6">
              {/* Profile Block */}
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-purple-50 rounded-2xl border border-purple-100 flex items-center justify-center font-bold text-purple-600 text-lg">
                    {staff.name.charAt(0).toUpperCase()}{staff.surName?.charAt(0).toUpperCase() || ''}
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900">{staff.name} {staff.surName || ''}</h4>
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full mt-1 uppercase">
                      <Shield className="w-3 h-3" /> {getRoleDisplayName(staff.role?.name) || 'Rolu Yoxdur'}
                    </span>
                  </div>
                </div>

                <div className="space-y-2 border-t border-slate-50 pt-4">
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    <span className="truncate">{staff.email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span>{staff.phone || '-'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>Qeydiyyat: {new Date(staff.createdAt).toLocaleDateString('az-AZ')}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-4 border-t border-slate-50">
                <button
                  onClick={() => handleEditStaff(staff)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold text-xs rounded-xl transition-all"
                >
                  <Edit className="w-3.5 h-3.5 text-purple-600" /> Redaktə Et
                </button>
                <button
                  onClick={() => handleDeleteStaff(staff)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 border border-red-100 text-red-600 hover:bg-red-50 font-semibold text-xs rounded-xl transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5 text-red-500" /> Sil
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
