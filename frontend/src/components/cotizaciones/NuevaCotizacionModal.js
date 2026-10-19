import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { DocumentPlusIcon } from '@heroicons/react/24/outline';
import ModalPortal from '../ModalPortal';
import CotizacionGeneralForm from './CotizacionGeneralForm';
import { cotizacionesService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { tiposProyectoOpciones } from '../../utils/cotizacionTiposProyecto';

const NuevaCotizacionModal = ({ open, onClose, onCreada }) => {
  const { usuario } = useAuth();
  const [tipos, setTipos] = useState([]);
  const [responsables, setResponsables] = useState([]);
  const [guardando, setGuardando] = useState(false);
  const [form, setForm] = useState({
    codigo: '',
    estado: 'borrador',
    nombre_proyecto: '',
    cliente: '',
    tipo_proyecto: '',
    tipo_proyecto_codigo: '',
    responsable_ids: [],
    responsable_id: null,
    notas_internas: ''
  });

  useEffect(() => {
    if (!open) return;
    setForm({
      codigo: '',
      estado: 'borrador',
      nombre_proyecto: '',
      cliente: '',
      tipo_proyecto: '',
    tipo_proyecto_codigo: '',
      responsable_ids: [],
      responsable_id: null,
      notas_internas: ''
    });
    setTipos(tiposProyectoOpciones());
    cotizacionesService
      .responsables()
      .then(({ data: r }) => {
        const respList = r.data || [];
        setResponsables(respList);
        const uid = usuario?.id ? Number(usuario.id) : null;
        if (uid && respList.some((x) => x.id === uid)) {
          setForm((f) => ({
            ...f,
            responsable_ids: [uid],
            responsable_id: uid
          }));
        }
      })
      .catch(() => toast.error('No se pudieron cargar catálogos'));
  }, [open, usuario?.id]);

  const patchForm = (patch) => setForm((f) => ({ ...f, ...patch }));

  const submit = async () => {
    setGuardando(true);
    try {
      const ids = Array.isArray(form.responsable_ids)
        ? form.responsable_ids.map(Number).filter((n) => Number.isFinite(n) && n > 0)
        : [];
      if (!ids.length) {
        toast.error('Selecciona al menos un responsable');
        setGuardando(false);
        return;
      }
      const { data } = await cotizacionesService.crear({
        general: {
          ...form,
          responsable_ids: ids,
          responsable_id: ids[0]
        }
      });
      toast.success('Cotización creada con versión 1');
      onCreada(data.data);
      onClose();
    } catch (e) {
      toast.error(e.response?.data?.mensaje || 'Error al crear');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <ModalPortal
      open={open}
      onClose={onClose}
      title="Nueva cotización"
      subtitle="Registra los datos generales de la propuesta"
      maxWidth="max-w-2xl"
      footer={
        <div className="flex justify-end gap-2 w-full">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm rounded-lg border border-slate-300">
            Cancelar
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={guardando}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            <DocumentPlusIcon className="w-5 h-5" /> Crear cotización
          </button>
        </div>
      }
    >
      <CotizacionGeneralForm
        form={form}
        onChange={patchForm}
        tipos={tipos}
        responsables={responsables}
      />
      <p className="text-xs text-slate-500 mt-4">
        Al crear la cotización se generará automáticamente su <strong>Versión 1</strong>. Luego podrás
        editar actividades, costos y propuesta económica desde el detalle.
      </p>
    </ModalPortal>
  );
};

export default NuevaCotizacionModal;
