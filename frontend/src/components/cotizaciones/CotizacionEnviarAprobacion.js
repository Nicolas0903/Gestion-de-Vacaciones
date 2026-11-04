import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { PaperAirplaneIcon } from '@heroicons/react/24/outline';
import { cotizacionesService } from '../../services/api';
import { capturarImagenResumenPropuesta } from '../../utils/capturaPropuestaImagen';
import { monedaFacturacionPropuesta } from '../../utils/cotizacionPropuestaInversion';

const CotizacionEnviarAprobacion = ({
  cotizacionId,
  codigoCotizacion,
  clienteCotizacion,
  propuesta,
  costos,
  onSolicitudEnviada
}) => {
  const [comentario, setComentario] = useState('');
  const [enviando, setEnviando] = useState(false);

  const enviar = async () => {
    if (
      !window.confirm(
        '¿Enviar a aprobación? Se notificará a Magali (copia a Enrique) con un pantallazo de la propuesta económica.'
      )
    ) {
      return;
    }
    setEnviando(true);
    try {
      let captura_propuesta_base64;
      try {
        const moneda = monedaFacturacionPropuesta(propuesta, costos);
        captura_propuesta_base64 = await capturarImagenResumenPropuesta({
          codigo: codigoCotizacion,
          cliente: clienteCotizacion,
          propuesta,
          moneda
        });
      } catch {
        toast('No se pudo generar la imagen; se envía el correo sin pantallazo.', { icon: '⚠️' });
      }
      const { data } = await cotizacionesService.solicitarAprobacion(cotizacionId, {
        comentario: comentario.trim(),
        captura_propuesta_base64
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
        Estado <strong>En revisión</strong> · correo a <strong>Magali</strong> (cc Enrique) con captura del cuadro de
        inversión / propuesta.
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
