import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Truck, ArrowLeft, Plus, X, Loader2, FileText } from 'lucide-react';
import { UserMenu } from '@/components';
import { useAuthStore } from '@/stores';
import { contractsService } from '@/services/contracts';
import type { ContractItem, CreateContractPayload } from '@/services/contracts';
import { ContractStatus, Permission } from '@/types';
import type { ApiResponse } from '@/types';
import { api } from '@/services/api';

const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
const formatCurrency = (n: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n);

const STATUS_LABELS: Record<ContractStatus, { label: string; className: string }> = {
  [ContractStatus.BROUILLON]: { label: 'Brouillon', className: 'bg-gray-100 text-gray-700' },
  [ContractStatus.ACTIF]: { label: 'Actif', className: 'bg-green-100 text-green-700' },
  [ContractStatus.TERMINE]: { label: 'Terminé', className: 'bg-blue-100 text-blue-700' },
  [ContractStatus.ANNULE]: { label: 'Annulé', className: 'bg-red-100 text-red-700' },
};

function SkeletonRow() {
  return <tr>{[...Array(6)].map((_, i) => <td key={i} className="px-4 py-4"><div className="h-4 bg-gray-100 rounded w-full animate-pulse" /></td>)}</tr>;
}

interface ContractFormData {
  clientId: string; vehicleId: string; startDate: string; endDate: string;
  dailyRate: string; deposit: string; deliveryAddress: string; notes: string;
}

const EMPTY_FORM: ContractFormData = { clientId: '', vehicleId: '', startDate: '', endDate: '', dailyRate: '', deposit: '', deliveryAddress: '', notes: '' };

function ContractForm({ formData, onChange, clients, vehicles, loadingOptions }: {
  formData: ContractFormData; onChange: (f: ContractFormData) => void;
  clients: { _id: string; companyName: string }[]; vehicles: { _id: string; name: string; registrationNumber: string }[];
  loadingOptions: boolean;
}) {
  const set = (field: keyof ContractFormData, value: string) => onChange({ ...formData, [field]: value });

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Client</label>
        <select value={formData.clientId} onChange={e => set('clientId', e.target.value)} disabled={loadingOptions} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
          <option value="">{loadingOptions ? 'Chargement...' : '-- Sélectionner --'}</option>
          {clients.map(c => <option key={c._id} value={c._id}>{c.companyName}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Véhicule</label>
        <select value={formData.vehicleId} onChange={e => set('vehicleId', e.target.value)} disabled={loadingOptions} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
          <option value="">{loadingOptions ? 'Chargement...' : '-- Sélectionner --'}</option>
          {vehicles.map(v => <option key={v._id} value={v._id}>{v.name} - {v.registrationNumber}</option>)}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Date début</label>
          <input type="date" value={formData.startDate} onChange={e => set('startDate', e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="jj/mm/aaaa" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Date fin</label>
          <input type="date" value={formData.endDate} onChange={e => set('endDate', e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="jj/mm/aaaa" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Tarif journalier (€)</label>
          <input type="number" min="0" step="0.01" value={formData.dailyRate} onChange={e => set('dailyRate', e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="0.00" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Caution (€)</label>
          <input type="number" min="0" step="0.01" value={formData.deposit} onChange={e => set('deposit', e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="Optionnel" />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Adresse livraison</label>
        <input type="text" value={formData.deliveryAddress} onChange={e => set('deliveryAddress', e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="Ex: 12 rue du Chantier, 75001" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
        <textarea value={formData.notes} onChange={e => set('notes', e.target.value)} rows={2} placeholder="Optionnel" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none" />
      </div>
    </div>
  );
}

function useContractOptions(open: boolean) {
  const [clients, setClients] = useState<{ _id: string; companyName: string }[]>([]);
  const [vehicles, setVehicles] = useState<{ _id: string; name: string; registrationNumber: string }[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoadingOptions(true);
    (async () => {
      try {
        const [cr, vr] = await Promise.all([
          api.get<ApiResponse<{ _id: string; companyName: string }[]>>('/clients', { params: { limit: 100 } }),
          api.get<ApiResponse<{ _id: string; name: string; registrationNumber: string }[]>>('/vehicles', { params: { limit: 100 } }),
        ]);
        if (!cancelled) {
          if (cr.data.success && cr.data.data) setClients(cr.data.data);
          if (vr.data.success && vr.data.data) setVehicles(vr.data.data);
        }
      } catch {}
      if (!cancelled) setLoadingOptions(false);
    })();
    return () => { cancelled = true; };
  }, [open]);

  return { clients, vehicles, loadingOptions };
}

function CreateModal({ onClose, onCreated }: { onClose: () => void; onCreated: (c: ContractItem) => void }) {
  const [formData, setFormData] = useState<ContractFormData>(EMPTY_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const { clients, vehicles, loadingOptions } = useContractOptions(true);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormError(null);
    try {
      const payload: CreateContractPayload = {
        clientId: formData.clientId, vehicleId: formData.vehicleId,
        startDate: formData.startDate, endDate: formData.endDate,
        dailyRate: parseFloat(formData.dailyRate) || 0,
        deposit: formData.deposit ? parseFloat(formData.deposit) : undefined,
        deliveryAddress: formData.deliveryAddress,
        deliveryLocation: { type: 'Point', coordinates: [0, 0] },
        notes: formData.notes || undefined,
      };
      onCreated(await contractsService.createContract(payload));
      onClose();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center overflow-y-auto py-6">
      <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-lg mx-4">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold">Nouveau contrat</h2>
          <button onClick={onClose} className="p-1 rounded-lg text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>
        {formError && <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">{formError}</div>}
        <form onSubmit={handleSubmit}>
          <ContractForm formData={formData} onChange={setFormData} clients={clients} vehicles={vehicles} loadingOptions={loadingOptions} />
          <div className="flex justify-end gap-3 pt-5">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm border rounded-lg">Annuler</button>
            <button type="submit" disabled={isSubmitting} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg disabled:opacity-50">
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin inline mr-1" />}Créer
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function DeleteDialog({ contract, onClose, onDeleted }: { contract: ContractItem; onClose: () => void; onDeleted: (id: string) => void }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleDelete = async () => {
    setIsSubmitting(true);
    setDeleteError(null);
    try {
      await contractsService.deleteContract(contract._id);
      onDeleted(contract._id);
      onClose();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
      <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm mx-4">
        <h2 className="text-lg font-semibold mb-2">Supprimer le contrat {contract.contractNumber} ?</h2>
        <p className="text-sm text-gray-500 mb-5">Cette action est irréversible.</p>
        {deleteError && <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">{deleteError}</div>}
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

export function ContractsPage() {
  const { isAuthenticated, user } = useAuthStore();
  const navigate = useNavigate();
  const canRead = user?.permissions.includes(Permission.CONTRACTS_READ) ?? false;
  const canCreate = user?.permissions.includes(Permission.CONTRACTS_CREATE) ?? false;
  const canDelete = user?.permissions.includes(Permission.CONTRACTS_DELETE) ?? false;

  const [contracts, setContracts] = useState<ContractItem[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<ContractStatus | ''>('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [deletingContract, setDeletingContract] = useState<ContractItem | null>(null);

  useEffect(() => { if (!isAuthenticated) navigate('/login'); }, [isAuthenticated, navigate]);

  const fetchContracts = useCallback(async () => {
    if (!canRead) return;
    setIsLoading(true);
    setError(null);
    try {
      const result = await contractsService.listContracts({ status: filterStatus || undefined, page });
      setContracts(result.contracts);
      setTotal(result.total);
      setTotalPages(result.totalPages);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setIsLoading(false);
    }
  }, [canRead, filterStatus, page]);

  const fetchRef = useRef(fetchContracts);
  fetchRef.current = fetchContracts;

  useEffect(() => { void fetchRef.current(); }, []);

  if (isAuthenticated && !canRead) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white rounded-xl p-8 max-w-md text-center">
          <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-lg font-semibold mb-2">Accès refusé</p>
          <p className="text-sm text-gray-500">Vous n'avez pas la permission de consulter les contrats.</p>
          <Link to="/" className="inline-flex items-center gap-2 mt-4 text-sm text-blue-600"><ArrowLeft className="w-4 h-4" /> Retour</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary-100 rounded-lg"><Truck className="w-8 h-8 text-primary-600" /></div>
              <div><h1 className="text-2xl font-bold">SaaS BTP</h1><p className="text-sm text-gray-500">Gestion des contrats</p></div>
            </div>
            <UserMenu />
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-6"><ArrowLeft className="w-4 h-4" /> Tableau de bord</Link>
        <div className="flex items-center justify-between mb-6">
          <div><h2 className="text-lg font-semibold">Contrats</h2><p className="text-sm text-gray-500">{total} contrat{total > 1 ? 's' : ''}</p></div>
          {canCreate && <button onClick={() => setShowCreateModal(true)} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"><Plus className="w-4 h-4 inline mr-1" />Nouveau</button>}
        </div>
        <div className="mb-4">
          <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value as ContractStatus | ''); setPage(1); }} className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
            <option value="">Tous les statuts</option>
            {Object.values(ContractStatus).map(s => <option key={s} value={s}>{STATUS_LABELS[s].label}</option>)}
          </select>
        </div>
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {error ? (
            <div className="px-6 py-8 text-center"><p className="text-red-600 text-sm">{error}</p><button onClick={() => void fetchContracts()} className="mt-3 text-sm text-blue-600">Réessayer</button></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">N°</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Client</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Période</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Montant</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Statut</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {isLoading ? <><SkeletonRow /><SkeletonRow /><SkeletonRow /></> :
                   contracts.length === 0 ? <tr><td colSpan={6} className="px-4 py-10 text-center text-sm text-gray-500">Aucun contrat</td></tr> :
                   contracts.map(c => {
                     const clientName = typeof c.clientId === 'object' ? c.clientId.companyName : c.clientId;
                     const canBeDeleted = canDelete && (c.status === ContractStatus.BROUILLON || c.status === ContractStatus.ANNULE);
                     return (
                      <tr key={c._id} className="hover:bg-gray-50">
                        <td className="px-4 py-4 text-sm font-medium">{c.contractNumber}</td>
                        <td className="px-4 py-4 text-sm">{clientName}</td>
                        <td className="px-4 py-4 text-sm">{formatDate(c.startDate)} → {formatDate(c.endDate)}</td>
                        <td className="px-4 py-4 text-sm font-medium">{c.totalAmount ? formatCurrency(c.totalAmount) : '—'}</td>
                        <td className="px-4 py-4"><span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${STATUS_LABELS[c.status].className}`}>{STATUS_LABELS[c.status].label}</span></td>
                        <td className="px-4 py-4">
                          {canBeDeleted && <button onClick={() => setDeletingContract(c)} className="px-2 py-1 text-xs bg-red-50 text-red-700 border border-red-200 rounded hover:bg-red-100">Supprimer</button>}
                        </td>
                      </tr>
                    );
                   })}
                </tbody>
              </table>
            </div>
          )}
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} className="px-3 py-2 text-sm border rounded-lg disabled:opacity-50">Précédent</button>
            <span className="text-sm text-gray-500">Page {page} sur {totalPages}</span>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="px-3 py-2 text-sm border rounded-lg disabled:opacity-50">Suivant</button>
          </div>
        )}
      </main>
      {showCreateModal && <CreateModal onClose={() => setShowCreateModal(false)} onCreated={c => { setContracts(prev => [c, ...prev]); setTotal(prev => prev + 1); }} />}
      {deletingContract && <DeleteDialog contract={deletingContract} onClose={() => setDeletingContract(null)} onDeleted={id => { setContracts(prev => prev.filter(c => c._id !== id)); setTotal(prev => prev - 1); }} />}
    </div>
  );
}

export default ContractsPage;
