import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { controlProyectosService, empleadoService } from '../services/api';

const AdminCostoHoraProyectos = () => {
  const [cargando, setCargando] = useState(true);
  const [filas, setFilas] = useState([]);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const [costRes, empRes] = await Promise.all([
        controlProyectosService.listarCostosHora(),
        empleadoService.listar({ activo: true })
      ]);
      const costos = costRes.data.data || [];
      const mapCosto = new Map(costos.map((c) => [c.empleado_id, c]));
      const empleados = (empRes.data.data || []).slice().sort((a, b) => {
        const aa = `${a.apellidos || ''} ${a.nombres || ''}`.toLowerCase();
        const bb = `${b.apellidos || ''} ${b.nombres || ''}`.toLowerCase();
        return aa.localeCompare(bb);
      });
      setFilas(
        empleados.map((e) => {
          const c = mapCosto.get(e.id);
          return {
            empleado_id: e.id,
            nombre_completo: `${e.nombres || ''} ${e.apellidos || ''}`.trim(),
            email: e.email,
            costo_por_hora: c ? String(c.costo_por_hora) : '',
            existe: !!c,
            dirty: false
          };
        })
      );
    } catch {
      toast.error('No se pudieron cargar empleados o costos.');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const onChangeValor = (id, valor) => {
    setFilas((rows) =>
      rows.map((r) =>
        r.empleado_id === id ? { ...r, costo_por_hora: valor, dirty: true } : r
      )
    );
  };

  const guardarUno = async (r) => {
    const raw = String(r.costo_por_hora ?? '').trim().replace(',', '.');
    if (raw === '') {
      toast.error(`Indica costo para ${r.nombre_completo}`);
      return;
    }
    const num = Number(raw);
    if (!Number.isFinite(num) || num < 0) {
      toast.error('Costo por hora no válido');
      return;
    }
    try {
      await controlProyectosService.guardarCostoHora(r.empleado_id, num);
      toast.success('Costo guardado.');
      await cargar();
    } catch (err) {
      toast.error(err.response?.data?.mensaje || 'Error al guardar');
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <Link
        to="/portal"
        className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-indigo-600 mb-8 transition-colors"
      >
        <ArrowLeftIcon className="w-4 h-4" />
        Volver al portal
      </Link>

      <div className="rounded-3xl bg-white border border-slate-100 shadow-lg p-8 md:p-10">
        <h1 className="text-2xl font-bold text-slate-800 mb-2">Costo por hora (consultores)</h1>
        <p className="text-sm text-slate-600 mb-6">
          Datos utilizados por control de proyectos. Solo rol administrador.
        </p>
        {cargando ? (
          <p className="text-slate-500">Cargando…</p>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-100">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-slate-600">
                <tr>
                  <th className="px-4 py-3 font-medium">Consultor</th>
                  <th className="px-4 py-3 font-medium">Costo por hora (S/)</th>
                  <th className="px-4 py-3 font-medium w-36">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filas.map((r) => (
                  <tr key={r.empleado_id} className="text-slate-700">
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-800">{r.nombre_completo}</div>
                      <div className="text-xs text-slate-500">{r.email}</div>
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        inputMode="decimal"
                        placeholder="Ej. 45.50"
                        className="w-40 rounded-xl border border-slate-200 px-3 py-2 tabular-nums"
                        value={r.costo_por_hora}
                        onChange={(e) => onChangeValor(r.empleado_id, e.target.value)}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => guardarUno(r)}
                        className="rounded-xl bg-indigo-600 text-white text-xs font-medium px-3 py-2 hover:bg-indigo-700"
                      >
                        Guardar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Link
          to="/control-proyectos"
          className="inline-block mt-6 text-sm font-medium text-indigo-600 hover:underline"
        >
          Ir a Bolsa de Horas →
        </Link>
      </div>
    </div>
  );
};

export default AdminCostoHoraProyectos;
