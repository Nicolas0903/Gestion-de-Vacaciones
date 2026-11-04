import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { EnvelopeIcon } from '@heroicons/react/24/outline';
import { cotizacionesService } from '../../services/api';

const CotizacionNotificarComercial = ({ cotizacionId, solicitanteComercial, onEnviado }) => {
  const [comentario, setComentario] = useState('');
  const [enviando, setEnviando] = useState(false);

  const nombre = solicitanteComercial?.solicitante_nombre?.trim();
  const email = solicitanteComercial?.solicitante_email?.trim();
  const tieneDestino = Boolean(email);
  const destinoLabel = nombre ? `${nombre}${email ? ` (${email})` : ''}` : email || '—';

  const enviar = async () => {
    if (!tieneDestino) {
      toast.error('No hay comercial solicitante vinculado a esta cotización.');
      return;
    }
    if (
      !window.confirm(
        `¿Enviar correo a ${destinoLabel} avisando que la propuesta económica ya puede revisarse en el portal?`
      )
    ) {
      return;
    }
    setEnviando(true);
    try {
      const { data } = await cotizacionesService.notificarComercialPropuestaLista(cotizacionId, {
        comentario: comentario.trim()
      });
      toast.success(data.mensaje || 'Correo enviado al comercial');
      setComentario('');
      onEnviado?.();
    } catch (err) {
      toast.error(err.response?.data?.mensaje || 'Error al enviar');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="rounded-xl border border-teal-200 bg-teal-50/80 p-4 space-y-3">
      <h4 className="font-semibold text-teal-950 text-sm">Avisar al comercial (solicitud)</h4>
      <p className="text-xs text-teal-900/85">
        {tieneDestino ? (
          <>
            Envía un correo a quien registró la solicitud: <strong>{destinoLabel}</strong>, para que entre al portal y
            revise la propuesta económica.
          </>
        ) : (
          <>
            Esta cotización no está vinculada a una <strong>solicitud comercial</strong>. Al atender una solicitud desde
            el módulo correspondiente, aquí aparecerá el destinatario.
          </>
        )}
      </p>
      <textarea
        rows={2}
        value={comentario}
        onChange={(e) => setComentario(e.target.value)}
        placeholder="Mensaje opcional para el comercial"
        disabled={!tieneDestino}
        className="w-full rounded-lg border border-teal-200 px-3 py-2 text-sm bg-white disabled:bg-slate-50 disabled:text-slate-500"
      />
      <button
        type="button"
        disabled={enviando || !tieneDestino}
        onClick={enviar}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-teal-700 text-white text-sm font-medium disabled:opacity-50"
      >
        <EnvelopeIcon className="w-4 h-4" /> Enviar al comercial
      </button>
    </div>
  );
};

export default CotizacionNotificarComercial;
