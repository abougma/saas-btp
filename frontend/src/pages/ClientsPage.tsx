import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Truck, ArrowLeft, Plus, Search, Edit3, Trash2, X, Loader2 } from 'lucide-react';
import { UserMenu } from '@/components';
import { useAuthStore } from '@/stores';
import { Permission } from '@/types';
import { clientsService } from '@/services/clients';
import type { ClientItem, CreateClientPayload, UpdateClientPayload } from '@/services/clients';

function SkeletonRow() {
  return (
    <tr>
      {[...Array(5)].map((_, i) => (
        <td key={i} className="px-4 py-4"><div className="h-4 bg-gray-100 rounded w-full animate-pulse" /></td>
      ))}
    </tr>
  );
}

interface ClientFormData {
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
  address: { street: string; city: string; postalCode: string; country: string };
  siret: string;
}

const emptyForm = (): ClientFormData => ({
  companyName: '', contactName: '', email: '', phone: '',
  address: { street: '', city: '', postalCode: '', country: 'France' }, siret: '',
});

const fromClient = (c: ClientItem): ClientFormData => ({
  companyName: c.companyName, contactName: c.contactName, email: c.email, phone: c.phone,
  address: { ...c.address }, siret: c.siret ?? '',
});

type ValidationErrors = Partial<Record<string, string>>;

const validateForm = (form: ClientFormData): ValidationErrors => {
  const errors: ValidationErrors = {};
  if (!form.companyName.trim()) errors.companyName = 'Obligatoire';
  if (!form.contactName.trim()) errors.contactName = 'Obligatoire';
  if (!form.email.trim()) errors.email = 'Obligatoire';
  if (!form.phone.trim()) errors.phone = 'Obligatoire';
  if (!form.address.street.trim()) errors['address.street'] = 'Obligatoire';
  if (!form.address.city.trim()) errors['address.city'] = 'Obligatoire';
  if (!form.address.postalCode.trim()) errors['address.postalCode'] = 'Obligatoire';
  if (!form.address.country.trim()) errors['address.country'] = 'Obligatoire';
  return errors;
};

const inputClass = (hasError: boolean) =>
  `w-full border rounded-lg px-3 py-2 text-sm ${hasError ? 'border-red-500 bg-red-50' : 'border-gray-300'}`;

function ClientFormFields({ form, errors, onChange }: { form: ClientFormData; errors: ValidationErrors; onChange: (f: ClientFormData) => void }) {
  const set = (key: keyof Omit<ClientFormData, 'address'>, value: string) => onChange({ ...form, [key]: value });
  const setAddr = (key: keyof ClientFormData['address'], value: string) => onChange({ ...form, address: { ...form.address, [key]: value } });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Entreprise *</label>
          <input type="text" value={form.companyName} onChange={e => set('companyName', e.target.value)} className={inputClass(!!errors.companyName)} placeholder="Ex: BTP Dupont" />
          {errors.companyName && <p className="mt-1 text-xs text-red-600">{errors.companyName}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Contact *</label>
          <input type="text" value={form.contactName} onChange={e => set('contactName', e.target.value)} className={inputClass(!!errors.contactName)} placeholder="Ex: Jean Dupont" />
          {errors.contactName && <p className="mt-1 text-xs text-red-600">{errors.contactName}</p>}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
          <input type="email" value={form.email} onChange={e => set('email', e.target.value)} className={inputClass(!!errors.email)} placeholder="Ex: contact@btp-dupont.fr" />
          {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone *</label>
          <input type="tel" value={form.phone} onChange={e => set('phone', e.target.value)} className={inputClass(!!errors.phone)} placeholder="Ex: 06 12 34 56 78" />
          {errors.phone && <p className="mt-1 text-xs text-red-600">{errors.phone}</p>}
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Rue *</label>
        <input type="text" value={form.address.street} onChange={e => setAddr('street', e.target.value)} className={inputClass(!!errors['address.street'])} placeholder='Ex: 12 rue des Chantiers' />
        {errors['address.street'] && <p className="mt-1 text-xs text-red-600">{errors['address.street']}</p>}
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Code postal *</label>
          <input type="text" value={form.address.postalCode} onChange={e => setAddr('postalCode', e.target.value)} className={inputClass(!!errors['address.postalCode'])} placeholder='Ex: 75001' />
          {errors['address.postalCode'] && <p className="mt-1 text-xs text-red-600">{errors['address.postalCode']}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Ville *</label>
          <input type="text" value={form.address.city} onChange={e => setAddr('city', e.target.value)} className={inputClass(!!errors['address.city'])} placeholder='Ex: Paris' />
          {errors['address.city'] && <p className="mt-1 text-xs text-red-600">{errors['address.city']}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Pays *</label>
          <input type="text" value={form.address.country} onChange={e => setAddr('country', e.target.value)} className={inputClass(!!errors['address.country'])} placeholder='Ex: France' />
          {errors['address.country'] && <p className="mt-1 text-xs text-red-600">{errors['address.country']}</p>}
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">SIRET</label>
        <input type="text" value={form.siret} onChange={e => set('siret', e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="Ex: 123 456 789 01234" />
      </div>
    </div>
  );
}

function CreateModal({ onClose, onCreated }: { onClose: () => void; onCreated: (c: ClientItem) => void }) {
  const [form, setForm] = useState<ClientFormData>(emptyForm());
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validateForm(form);
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setIsSubmitting(true);
    setApiError(null);
    try {
      const payload: CreateClientPayload = {
        companyName: form.companyName, contactName: form.contactName, email: form.email, phone: form.phone,
        address: form.address, ...(form.siret.trim() ? { siret: form.siret.trim() } : {}),
      };
      onCreated(await clientsService.createClient(payload));
      onClose();
    } catch (err) {
      setApiError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
      <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold">Nouveau client</h2>
          <button onClick={onClose} className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"><X className="w-5 h-5" /></button>
        </div>
        {apiError && <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">{apiError}</div>}
        <form onSubmit={handleSubmit}>
          <ClientFormFields form={form} errors={errors} onChange={setForm} />
          <div className="flex items-center justify-end gap-3 pt-4 mt-4 border-t">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50">Annuler</button>
            <button type="submit" disabled={isSubmitting} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin inline mr-1" />}Créer
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EditModal({ client, onClose, onUpdated }: { client: ClientItem; onClose: () => void; onUpdated: (c: ClientItem) => void }) {
  const [form, setForm] = useState<ClientFormData>(fromClient(client));
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validateForm(form);
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setIsSubmitting(true);
    setApiError(null);
    try {
      const payload: UpdateClientPayload = {
        companyName: form.companyName, contactName: form.contactName, email: form.email, phone: form.phone,
        address: form.address, ...(form.siret.trim() ? { siret: form.siret.trim() } : {}),
      };
      onUpdated(await clientsService.updateClient(client._id, payload));
      onClose();
    } catch (err) {
      setApiError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
      <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold">Modifier le client</h2>
          <button onClick={onClose} className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"><X className="w-5 h-5" /></button>
        </div>
        {apiError && <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">{apiError}</div>}
        <form onSubmit={handleSubmit}>
          <ClientFormFields form={form} errors={errors} onChange={setForm} />
          <div className="flex items-center justify-end gap-3 pt-4 mt-4 border-t">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50">Annuler</button>
            <button type="submit" disabled={isSubmitting} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin inline mr-1" />}Enregistrer
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function DeleteDialog({ client, onClose, onDeleted }: { client: ClientItem; onClose: () => void; onDeleted: (id: string) => void }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const handleDelete = async () => {
    setIsSubmitting(true);
    setApiError(null);
    try {
      await clientsService.deleteClient(client._id);
      onDeleted(client._id);
      onClose();
    } catch (err) {
      setApiError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
      <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm mx-4">
        <h2 className="text-lg font-semibold mb-2">Supprimer {client.companyName} ?</h2>
        <p className="text-sm text-gray-500 mb-5">Cette action est irréversible.</p>
        {apiError && <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">{apiError}</div>}
        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50">Annuler</button>
          <button onClick={handleDelete} disabled={isSubmitting} className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50">
            {isSubmitting && <Loader2 className="w-4 h-4 animate-spin inline mr-1" />}Supprimer
          </button>
        </div>
      </div>
    </div>
  );
}

export function ClientsPage() {
  const { isAuthenticated, user } = useAuthStore();
  const navigate = useNavigate();
  const [clients, setClients] = useState<ClientItem[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingClient, setEditingClient] = useState<ClientItem | null>(null);
  const [deletingClient, setDeletingClient] = useState<ClientItem | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { if (!isAuthenticated) navigate('/login'); }, [isAuthenticated, navigate]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => { void fetchClients(); }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [search, page]);

  const fetchClients = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await clientsService.listClients({ search: search || undefined, page });
      setClients(result.clients);
      setTotal(result.total);
      setTotalPages(result.totalPages);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setIsLoading(false);
    }
  };

  const canCreate = user?.permissions.includes(Permission.CLIENTS_CREATE) ?? false;
  const canUpdate = user?.permissions.includes(Permission.CLIENTS_UPDATE) ?? false;
  const canDelete = user?.permissions.includes(Permission.CLIENTS_DELETE) ?? false;

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary-100 rounded-lg"><Truck className="w-8 h-8 text-primary-600" /></div>
              <div><h1 className="text-2xl font-bold">SaaS BTP</h1><p className="text-sm text-gray-500">Gestion des clients</p></div>
            </div>
            <UserMenu />
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-6"><ArrowLeft className="w-4 h-4" /> Tableau de bord</Link>
        <div className="flex items-center justify-between mb-6">
          <div><h2 className="text-lg font-semibold">Clients</h2><p className="text-sm text-gray-500">{total} client{total > 1 ? 's' : ''}</p></div>
          {canCreate && <button onClick={() => setShowCreateModal(true)} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"><Plus className="w-4 h-4 inline mr-1" />Nouveau</button>}
        </div>
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Rechercher..." className="w-full border border-gray-300 rounded-lg pl-9 pr-3 py-2 text-sm" />
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {error ? (
            <div className="px-6 py-8 text-center"><p className="text-red-600 text-sm">{error}</p><button onClick={() => void fetchClients()} className="mt-3 text-sm text-blue-600">Réessayer</button></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50"><tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Entreprise</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contact</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Téléphone</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ville</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr></thead>
                <tbody className="divide-y divide-gray-200">
                  {isLoading ? <><SkeletonRow /><SkeletonRow /><SkeletonRow /></> :
                   clients.length === 0 ? <tr><td colSpan={5} className="px-4 py-10 text-center text-sm text-gray-500">Aucun client</td></tr> :
                   clients.map(c => (
                    <tr key={c._id} className="hover:bg-gray-50">
                      <td className="px-4 py-4"><p className="text-sm font-medium">{c.companyName}</p>{c.siret && <p className="text-xs text-gray-500">{c.siret}</p>}</td>
                      <td className="px-4 py-4"><p className="text-sm">{c.contactName}</p><p className="text-xs text-gray-500">{c.email}</p></td>
                      <td className="px-4 py-4 text-sm">{c.phone}</td>
                      <td className="px-4 py-4 text-sm">{c.address.city}</td>
                      <td className="px-4 py-4">
                        <div className="flex gap-2">
                          {canUpdate && <button onClick={() => setEditingClient(c)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"><Edit3 className="w-4 h-4" /></button>}
                          {canDelete && <button onClick={() => setDeletingClient(c)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>}
                        </div>
                      </td>
                    </tr>
                  ))}
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
      {showCreateModal && <CreateModal onClose={() => setShowCreateModal(false)} onCreated={c => { setClients(prev => [c, ...prev]); setTotal(prev => prev + 1); }} />}
      {editingClient && <EditModal client={editingClient} onClose={() => setEditingClient(null)} onUpdated={c => setClients(prev => prev.map(x => x._id === c._id ? c : x))} />}
      {deletingClient && <DeleteDialog client={deletingClient} onClose={() => setDeletingClient(null)} onDeleted={id => { setClients(prev => prev.filter(c => c._id !== id)); setTotal(prev => prev - 1); }} />}
    </div>
  );
}

export default ClientsPage;
