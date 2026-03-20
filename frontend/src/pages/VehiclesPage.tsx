import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Truck, ArrowLeft, Plus, Search, Edit3, Trash2, X, Loader2, RefreshCw } from 'lucide-react';
import { UserMenu } from '@/components';
import { useAuthStore } from '@/stores';
import { VehicleType, VehicleStatus, Permission } from '@/types';
import { vehiclesService } from '@/services/vehicles';
import type { VehicleItem, CreateVehiclePayload, VehicleStats } from '@/services/vehicles';

const TYPE_LABELS: Record<VehicleType, string> = {
  [VehicleType.MINI_PELLE]: 'Mini-pelle', [VehicleType.CHARGEUSE]: 'Chargeuse', [VehicleType.TRACTOPELLE]: 'Tractopelle',
  [VehicleType.NACELLE]: 'Nacelle', [VehicleType.COMPACTEUR]: 'Compacteur', [VehicleType.GROUPE_ELECTROGENE]: 'Groupe électrogène',
  [VehicleType.REMORQUE]: 'Remorque', [VehicleType.AUTRE]: 'Autre',
};

const STATUS_LABELS: Record<VehicleStatus, string> = {
  [VehicleStatus.DISPONIBLE]: 'Disponible', [VehicleStatus.EN_LOCATION]: 'En location', [VehicleStatus.EN_MAINTENANCE]: 'En maintenance',
  [VehicleStatus.HORS_SERVICE]: 'Hors service', [VehicleStatus.VOLE]: 'Volé',
};

function VehicleStatusBadge({ status }: { status: VehicleStatus }) {
  const config: Record<VehicleStatus, string> = {
    [VehicleStatus.DISPONIBLE]: 'bg-green-100 text-green-700', [VehicleStatus.EN_LOCATION]: 'bg-blue-100 text-blue-700',
    [VehicleStatus.EN_MAINTENANCE]: 'bg-orange-100 text-orange-700', [VehicleStatus.HORS_SERVICE]: 'bg-red-100 text-red-700',
    [VehicleStatus.VOLE]: 'bg-purple-100 text-purple-700',
  };
  return <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${config[status] ?? 'bg-gray-100 text-gray-700'}`}>{STATUS_LABELS[status] ?? status}</span>;
}

function StatsCards({ stats, isLoading }: { stats: VehicleStats | null; isLoading: boolean }) {
  const cards = [
    { label: 'Total engins', value: stats?.total ?? 0, color: 'bg-gray-50 border-gray-200', textColor: 'text-gray-900' },
    { label: 'Disponibles', value: stats?.byStatus[VehicleStatus.DISPONIBLE] ?? 0, color: 'bg-green-50 border-green-200', textColor: 'text-green-700' },
    { label: 'En location', value: stats?.byStatus[VehicleStatus.EN_LOCATION] ?? 0, color: 'bg-blue-50 border-blue-200', textColor: 'text-blue-700' },
    { label: 'En maintenance', value: stats?.byStatus[VehicleStatus.EN_MAINTENANCE] ?? 0, color: 'bg-orange-50 border-orange-200', textColor: 'text-orange-700' },
  ];
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
      {cards.map(card => (
        <div key={card.label} className={`${card.color} border rounded-xl p-4`}>
          {isLoading ? <div className="w-12 h-8 bg-gray-200 rounded mb-1 animate-pulse" /> : <p className={`text-2xl font-bold ${card.textColor}`}>{card.value}</p>}
          <p className="text-sm text-gray-500">{card.label}</p>
        </div>
      ))}
    </div>
  );
}

function SkeletonRow() {
  return <tr>{[...Array(7)].map((_, i) => <td key={i} className="px-4 py-4"><div className="h-4 bg-gray-100 rounded w-full animate-pulse" /></td>)}</tr>;
}

interface VehicleFormData {
  name: string; internalCode: string; registrationNumber: string; type: VehicleType; brand: string;
  vehicleModel: string; year: number; serialNumber: string; trackerId: string; notes: string;
}

const emptyForm = (): VehicleFormData => ({ name: '', internalCode: '', registrationNumber: '', type: VehicleType.AUTRE, brand: '', vehicleModel: '', year: new Date().getFullYear(), serialNumber: '', trackerId: '', notes: '' });

const fromVehicle = (v: VehicleItem): VehicleFormData => ({ name: v.name, internalCode: v.internalCode, registrationNumber: v.registrationNumber, type: v.type, brand: v.brand, vehicleModel: v.vehicleModel, year: v.year, serialNumber: v.serialNumber ?? '', trackerId: v.trackerId ?? '', notes: v.notes ?? '' });

function VehicleFormFields({ form, onChange, readOnlyRegistration = false }: { form: VehicleFormData; onChange: (f: VehicleFormData) => void; readOnlyRegistration?: boolean }) {
  const set = <K extends keyof VehicleFormData>(key: K, value: VehicleFormData[K]) => onChange({ ...form, [key]: value });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nom</label>
          <input type="text" value={form.name} onChange={e => set('name', e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="Mini-pelle Chantier A" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Code interne</label>
          <input type="text" value={form.internalCode} onChange={e => set('internalCode', e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="ENG-001" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Immatriculation</label>
          <input type="text" value={form.registrationNumber} onChange={e => !readOnlyRegistration && set('registrationNumber', e.target.value)}
            readOnly={readOnlyRegistration} className={`w-full border border-gray-300 rounded-lg px-3 py-2 text-sm ${readOnlyRegistration ? 'bg-gray-50 cursor-not-allowed' : ''}`} placeholder="AA-123-BB" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
          <select value={form.type} onChange={e => set('type', e.target.value as VehicleType)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
            {Object.values(VehicleType).map(t => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Marque</label>
          <input type="text" value={form.brand} onChange={e => set('brand', e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="Caterpillar" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Modèle</label>
          <input type="text" value={form.vehicleModel} onChange={e => set('vehicleModel', e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="308 CR" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Année</label>
          <input type="number" value={form.year} onChange={e => set('year', parseInt(e.target.value, 10))} min={1990} max={2030} placeholder="Ex: 2024" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">N° de série</label>
          <input type="text" value={form.serialNumber} onChange={e => set('serialNumber', e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="Optionnel" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">ID Tracker GPS</label>
          <input type="text" value={form.trackerId} onChange={e => set('trackerId', e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="Optionnel" />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
        <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2} placeholder="Optionnel" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none" />
      </div>
    </div>
  );
}

function CreateModal({ onClose, onCreated }: { onClose: () => void; onCreated: (v: VehicleItem) => void }) {
  const [form, setForm] = useState<VehicleFormData>(emptyForm());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setApiError(null);
    try {
      const payload: CreateVehiclePayload = {
        name: form.name, internalCode: form.internalCode, registrationNumber: form.registrationNumber, type: form.type,
        brand: form.brand, vehicleModel: form.vehicleModel, year: form.year,
        ...(form.serialNumber.trim() ? { serialNumber: form.serialNumber.trim() } : {}),
        ...(form.trackerId.trim() ? { trackerId: form.trackerId.trim() } : {}),
        ...(form.notes.trim() ? { notes: form.notes.trim() } : {}),
        location: { type: 'Point', coordinates: [0, 0] },
      };
      onCreated(await vehiclesService.createVehicle(payload));
      onClose();
    } catch (err) { setApiError(err instanceof Error ? err.message : 'Erreur'); }
    finally { setIsSubmitting(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
      <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold">Ajouter un engin</h2>
          <button onClick={onClose} className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"><X className="w-5 h-5" /></button>
        </div>
        {apiError && <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">{apiError}</div>}
        <form onSubmit={handleSubmit}>
          <VehicleFormFields form={form} onChange={setForm} />
          <div className="flex items-center justify-end gap-3 pt-4 mt-4 border-t">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50">Annuler</button>
            <button type="submit" disabled={isSubmitting} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin inline mr-1" />}Ajouter
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EditModal({ vehicle, onClose, onUpdated }: { vehicle: VehicleItem; onClose: () => void; onUpdated: (v: VehicleItem) => void }) {
  const [form, setForm] = useState<VehicleFormData>(fromVehicle(vehicle));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setApiError(null);
    try {
      const payload: CreateVehiclePayload = {
        name: form.name, internalCode: form.internalCode, registrationNumber: form.registrationNumber, type: form.type,
        brand: form.brand, vehicleModel: form.vehicleModel, year: form.year,
        ...(form.serialNumber.trim() ? { serialNumber: form.serialNumber.trim() } : {}),
        ...(form.trackerId.trim() ? { trackerId: form.trackerId.trim() } : {}),
        ...(form.notes.trim() ? { notes: form.notes.trim() } : {}),
        location: vehicle.location,
      };
      onUpdated(await vehiclesService.updateVehicle(vehicle._id, payload));
      onClose();
    } catch (err) { setApiError(err instanceof Error ? err.message : 'Erreur'); }
    finally { setIsSubmitting(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
      <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold">Modifier l'engin</h2>
          <button onClick={onClose} className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"><X className="w-5 h-5" /></button>
        </div>
        <p className="text-xs text-gray-500 mb-5 font-mono">{vehicle.registrationNumber}</p>
        {apiError && <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">{apiError}</div>}
        <form onSubmit={handleSubmit}>
          <VehicleFormFields form={form} onChange={setForm} readOnlyRegistration />
          <div className="flex items-center justify-end gap-3 pt-4 mt-4 border-t">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm border rounded-lg">Annuler</button>
            <button type="submit" disabled={isSubmitting} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin inline mr-1" />}Enregistrer
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function StatusModal({ vehicle, onClose, onUpdated }: { vehicle: VehicleItem; onClose: () => void; onUpdated: (v: VehicleItem) => void }) {
  const [status, setStatus] = useState<VehicleStatus>(vehicle.status);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setApiError(null);
    try { onUpdated(await vehiclesService.updateStatus(vehicle._id, status)); onClose(); }
    catch (err) { setApiError(err instanceof Error ? err.message : 'Erreur'); }
    finally { setIsSubmitting(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
      <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm mx-4">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold">Changer le statut</h2>
          <button onClick={onClose} className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"><X className="w-5 h-5" /></button>
        </div>
        <p className="text-sm text-gray-500 mb-4">{vehicle.name}</p>
        {apiError && <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">{apiError}</div>}
        <form onSubmit={handleSubmit}>
          <select value={status} onChange={e => setStatus(e.target.value as VehicleStatus)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mb-4">
            {Object.values(VehicleStatus).map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
          </select>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm border rounded-lg">Annuler</button>
            <button type="submit" disabled={isSubmitting} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg disabled:opacity-50">
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin inline mr-1" />}OK
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function DeleteDialog({ vehicle, onClose, onDeleted }: { vehicle: VehicleItem; onClose: () => void; onDeleted: (id: string) => void }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const handleDelete = async () => {
    setIsSubmitting(true);
    setApiError(null);
    try { await vehiclesService.deleteVehicle(vehicle._id); onDeleted(vehicle._id); onClose(); }
    catch (err) { setApiError(err instanceof Error ? err.message : 'Erreur'); }
    finally { setIsSubmitting(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
      <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm mx-4">
        <h2 className="text-lg font-semibold mb-2">Supprimer {vehicle.name} ?</h2>
        <p className="text-sm text-gray-500 mb-5">Cette action est irréversible.</p>
        {apiError && <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">{apiError}</div>}
        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm border rounded-lg">Annuler</button>
          <button onClick={handleDelete} disabled={isSubmitting} className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg disabled:opacity-50">
            {isSubmitting && <Loader2 className="w-4 h-4 animate-spin inline mr-1" />}Supprimer
          </button>
        </div>
      </div>
    </div>
  );
}

function FuelBar({ level }: { level?: number }) {
  if (level === undefined) return <span className="text-xs text-gray-400">—</span>;
  const color = level >= 50 ? 'bg-green-500' : level >= 20 ? 'bg-orange-500' : 'bg-red-500';
  return <div className="flex items-center gap-2"><div className="w-16 h-2 bg-gray-200 rounded-full"><div className={`h-2 ${color} rounded-full`} style={{ width: `${level}%` }} /></div><span className="text-xs text-gray-500">{level}%</span></div>;
}

export function VehiclesPage() {
  const { isAuthenticated, user } = useAuthStore();
  const navigate = useNavigate();
  const [vehicles, setVehicles] = useState<VehicleItem[]>([]);
  const [stats, setStats] = useState<VehicleStats | null>(null);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isStatsLoading, setIsStatsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<VehicleStatus | ''>('');
  const [filterType, setFilterType] = useState<VehicleType | ''>('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<VehicleItem | null>(null);
  const [statusVehicle, setStatusVehicle] = useState<VehicleItem | null>(null);
  const [deletingVehicle, setDeletingVehicle] = useState<VehicleItem | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { if (!isAuthenticated) navigate('/login'); }, [isAuthenticated, navigate]);
  useEffect(() => { void fetchStats(); }, []);
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => { void fetchVehicles(); }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [search, filterStatus, filterType, page]);

  const fetchStats = async () => { setIsStatsLoading(true); try { setStats(await vehiclesService.getStats()); } catch {} finally { setIsStatsLoading(false); } };
  const fetchVehicles = async () => {
    setIsLoading(true); setError(null);
    try { const result = await vehiclesService.listVehicles({ search: search || undefined, status: filterStatus || undefined, type: filterType || undefined, page }); setVehicles(result.vehicles); setTotal(result.total); setTotalPages(result.totalPages); }
    catch (err) { setError(err instanceof Error ? err.message : 'Erreur'); }
    finally { setIsLoading(false); }
  };

  const canCreate = user?.permissions.includes(Permission.VEHICLES_CREATE) ?? false;
  const canUpdate = user?.permissions.includes(Permission.VEHICLES_UPDATE) ?? false;
  const canDelete = user?.permissions.includes(Permission.VEHICLES_DELETE) ?? false;

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3"><div className="p-2 bg-primary-100 rounded-lg"><Truck className="w-8 h-8 text-primary-600" /></div><div><h1 className="text-2xl font-bold">SaaS BTP</h1><p className="text-sm text-gray-500">Gestion du parc d'engins</p></div></div>
            <UserMenu />
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-6"><ArrowLeft className="w-4 h-4" /> Tableau de bord</Link>
        <StatsCards stats={stats} isLoading={isStatsLoading} />
        <div className="flex items-center justify-between mb-6">
          <div><h2 className="text-lg font-semibold">Parc d'engins</h2><p className="text-sm text-gray-500">{total} engin{total > 1 ? 's' : ''}</p></div>
          {canCreate && <button onClick={() => setShowCreateModal(true)} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"><Plus className="w-4 h-4 inline mr-1" />Ajouter</button>}
        </div>
        <div className="flex gap-4 mb-4">
          <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" /><input type="text" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} className="w-full border border-gray-300 rounded-lg pl-9 pr-3 py-2 text-sm" /></div>
          <select value={filterType} onChange={e => { setFilterType(e.target.value as VehicleType | ''); setPage(1); }} className="border border-gray-300 rounded-lg px-3 py-2 text-sm"><option value="">Tous les types</option>{Object.values(VehicleType).map(t => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}</select>
          <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value as VehicleStatus | ''); setPage(1); }} className="border border-gray-300 rounded-lg px-3 py-2 text-sm"><option value="">Tous les statuts</option>{Object.values(VehicleStatus).map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}</select>
        </div>
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {error ? <div className="px-6 py-8 text-center"><p className="text-red-600 text-sm">{error}</p><button onClick={() => void fetchVehicles()} className="mt-3 text-sm text-blue-600">Réessayer</button></div> :
           <div className="overflow-x-auto">
             <table className="w-full">
               <thead className="bg-gray-50"><tr><th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Engin</th><th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th><th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Immatriculation</th><th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Marque / Modèle</th><th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Statut</th><th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Carburant</th><th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th></tr></thead>
               <tbody className="divide-y divide-gray-200">
                 {isLoading ? <><SkeletonRow /><SkeletonRow /><SkeletonRow /><SkeletonRow /></> : vehicles.length === 0 ? <tr><td colSpan={7} className="px-4 py-10 text-center text-sm text-gray-500">Aucun engin</td></tr> : vehicles.map(v => (
                  <tr key={v._id} className="hover:bg-gray-50">
                    <td className="px-4 py-4"><p className="text-sm font-medium">{v.name}</p><p className="text-xs text-gray-500">{v.internalCode}</p></td>
                    <td className="px-4 py-4 text-sm">{TYPE_LABELS[v.type] ?? v.type}</td>
                    <td className="px-4 py-4 text-sm font-mono">{v.registrationNumber}</td>
                    <td className="px-4 py-4"><p className="text-sm">{v.brand} {v.vehicleModel}</p><p className="text-xs text-gray-500">{v.year}</p></td>
                    <td className="px-4 py-4"><VehicleStatusBadge status={v.status} /></td>
                    <td className="px-4 py-4"><FuelBar level={v.fuelLevel} /></td>
                    <td className="px-4 py-4"><div className="flex gap-2">{canUpdate && <><button onClick={() => setEditingVehicle(v)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"><Edit3 className="w-4 h-4" /></button><button onClick={() => setStatusVehicle(v)} className="p-1.5 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg"><RefreshCw className="w-4 h-4" /></button></>}{canDelete && <button onClick={() => setDeletingVehicle(v)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>}</div></td>
                  </tr>
                 ))}
               </tbody>
             </table>
           </div>}
        </div>
        {totalPages > 1 && <div className="flex items-center justify-between mt-4"><button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} className="px-3 py-2 text-sm border rounded-lg disabled:opacity-50">Précédent</button><span className="text-sm text-gray-500">Page {page} sur {totalPages}</span><button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="px-3 py-2 text-sm border rounded-lg disabled:opacity-50">Suivant</button></div>}
      </main>
      {showCreateModal && <CreateModal onClose={() => setShowCreateModal(false)} onCreated={v => { setVehicles(prev => [v, ...prev]); setTotal(prev => prev + 1); void fetchStats(); }} />}
      {editingVehicle && <EditModal vehicle={editingVehicle} onClose={() => setEditingVehicle(null)} onUpdated={v => { setVehicles(prev => prev.map(x => x._id === v._id ? v : x)); void fetchStats(); }} />}
      {statusVehicle && <StatusModal vehicle={statusVehicle} onClose={() => setStatusVehicle(null)} onUpdated={v => { setVehicles(prev => prev.map(x => x._id === v._id ? v : x)); void fetchStats(); }} />}
      {deletingVehicle && <DeleteDialog vehicle={deletingVehicle} onClose={() => setDeletingVehicle(null)} onDeleted={id => { setVehicles(prev => prev.filter(v => v._id !== id)); setTotal(prev => prev - 1); void fetchStats(); }} />}
    </div>
  );
}

export default VehiclesPage;
