import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { XMarkIcon } from '@heroicons/react/24/outline';
import Button from './Button';
import { empleadoService } from '../services/api';

const emptyForm = () => ({
  passwordActual: '',
  passwordNuevo: '',
  confirmarPassword: ''
});

const CambiarPasswordModal = ({ open, onClose }) => {
  const [passwordData, setPasswordData] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) setPasswordData(emptyForm());
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setPasswordData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (passwordData.passwordNuevo !== passwordData.confirmarPassword) {
      toast.error('Las contraseñas no coinciden');
      return;
    }
    if (passwordData.passwordNuevo.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres');
      return;
    }
    setSaving(true);
    try {
      await empleadoService.cambiarPassword(
        passwordData.passwordActual,
        passwordData.passwordNuevo,
        passwordData.confirmarPassword
      );
      toast.success('Contraseña actualizada correctamente');
      onClose();
    } catch (error) {
      toast.error(error.response?.data?.mensaje || 'Error al cambiar contraseña');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="cambiar-password-titulo"
        className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl animate-fadeIn"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 mb-4">
          <h3 id="cambiar-password-titulo" className="text-lg font-semibold text-slate-800">
            Cambiar contraseña
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Cerrar"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Contraseña actual</label>
            <input
              type="password"
              name="passwordActual"
              value={passwordData.passwordActual}
              onChange={handleChange}
              required
              autoComplete="current-password"
              className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Nueva contraseña</label>
            <input
              type="password"
              name="passwordNuevo"
              value={passwordData.passwordNuevo}
              onChange={handleChange}
              required
              minLength={6}
              autoComplete="new-password"
              className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Confirmar nueva contraseña</label>
            <input
              type="password"
              name="confirmarPassword"
              value={passwordData.confirmarPassword}
              onChange={handleChange}
              required
              autoComplete="new-password"
              className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
              Cancelar
            </Button>
            <Button type="submit" loading={saving} className="flex-1">
              Guardar
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CambiarPasswordModal;
