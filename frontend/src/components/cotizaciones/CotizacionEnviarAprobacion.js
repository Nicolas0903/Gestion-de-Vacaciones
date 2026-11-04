import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { PaperAirplaneIcon } from '@heroicons/react/24/outline';
import { cotizacionesService } from '../../services/api';

const CotizacionEnviarAprobacion = ({ cotizacionId, onSolicitudEnviada }) => {
  const [comentario, setComentario] = useState('');
  const [enviando, setEnviando] = useState(false);

  const enviar = async () => {
    if (
      !window.confirm(
        '¿Enviar la propuesta a aprobación? El estado pasará a En revisión y se notificará a Magali (copia a Enrique). Los adjuntos de la pestaña Adjuntos se incluirán en el correo si caben.'
      )
    ) {
      return;
    }
    setEnviando(true);
    try {
      const { data } = await cotizacionesService.solicitarAprobacion(cotizacionId, {
        comentario: comentario.trim()
      });
      toast.success(data.mensaje || 'Enviado a aprobación');
      setComentario('');
      onSolicitudEnviada?.(data.data);
    } catch (err) {
      toast.error(err.response?.data?.mensaje || 'Error al enviar');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-4 space-y-3">
      <h4 className="font-semibold text-amber-950 text-sm">Enviar propuesta a aprobación</h4>
      <p className="text-xs text-amber-900/80">
        Cambia el estado a <strong>En revisión</strong> y envía correo a <strong>Magali Sevillano</strong> (copia a{' '}
        <strong>Enrique Agapito</strong>). Pueden usarlo presales y comercial una vez lista la propuesta económica.
      </p>
      <textarea
        rows={2}
        value={comentario}
        onChange={(e) => setComentario(e.target.value)}
        placeholder="Mensaje para Magali (opcional)"
        className="w-full rounded-lg border border-amber-200 px-3 py-2 text-sm bg-white"
      />
      <button
        type="button"
        disabled={enviando}
        onClick={enviar}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-600 text-white text-sm font-medium disabled:opacity-50"
      >
        <PaperAirplaneIcon className="w-4 h-4" /> Notificar aprobación
      </button>
    </div>
  );
};

export default CotizacionEnviarAprobacion;
