const TOL_HORAS = 0.05;
const TOL_PCT = 0.05;

/** Reparte 100% según horas de cada perfil (última fila absorbe redondeo). */
export function perfilesConParticipacionAutomatica(perfiles) {
  const list = (perfiles || []).map((p) => ({ ...p, horas: Number(p.horas) || 0 }));
  const totalHoras = list.reduce((s, p) => s + p.horas, 0);
  if (totalHoras <= 0) {
    return list.map((p) => ({ ...p, participacion_pct: 0 }));
  }
  let acumulado = 0;
  return list.map((p, i) => {
    if (i === list.length - 1) {
      return { ...p, participacion_pct: Math.round((100 - acumulado) * 100) / 100 };
    }
    const pct = Math.round((p.horas / totalHoras) * 10000) / 100;
    acumulado += pct;
    return { ...p, participacion_pct: pct };
  });
}

function sumHorasActividades(bloques) {
  let base = 0;
  for (const b of bloques || []) {
    for (const a of b.actividades || []) {
      base += Number(a.horas) || 0;
    }
  }
  return Math.round(base * 100) / 100;
}

function dimensionamientoIniciado(actividades) {
  const perfiles = actividades?.perfiles || [];
  const bloques = actividades?.bloques || [];
  if (perfiles.length > 0) return true;
  return bloques.some((b) =>
    (b.actividades || []).some(
      (a) => (Number(a.horas) || 0) > 0 || String(a.descripcion || '').trim()
    )
  );
}

/** Validación de cuadre: perfiles ↔ actividades y % = 100. */
export function validarActividadesDimensionamiento(actividades) {
  if (!dimensionamientoIniciado(actividades)) {
    return { ok: true, errors: [], iniciado: false };
  }

  const errors = [];
  const perfiles = actividades?.perfiles || [];
  const bloques = actividades?.bloques || [];
  const horasActividades = sumHorasActividades(bloques);
  const totalHorasPerfiles = Math.round(
    perfiles.reduce((s, p) => s + (Number(p.horas) || 0), 0) * 100
  ) / 100;
  const perfilesNorm = perfilesConParticipacionAutomatica(perfiles);
  const totalPct = Math.round(
    perfilesNorm.reduce((s, p) => s + (Number(p.participacion_pct) || 0), 0) * 100
  ) / 100;

  if (perfiles.length === 0) {
    errors.push('Agrega al menos un perfil en el dimensionamiento.');
  }

  perfiles.forEach((p, i) => {
    const n = i + 1;
    if (!String(p.perfil || '').trim()) {
      errors.push(`Perfil ${n}: indica el nombre del recurso.`);
    }
    if ((Number(p.horas) || 0) <= 0) {
      errors.push(`Perfil ${n}: las horas deben ser mayores a cero.`);
    }
  });

  if (perfiles.length > 0 && Math.abs(totalPct - 100) > TOL_PCT) {
    errors.push(
      `La participación debe sumar 100% (actual: ${totalPct.toFixed(2)}%).`
    );
  }

  outer: for (const b of bloques) {
    for (const a of b.actividades || []) {
      const h = Number(a.horas) || 0;
      const desc = String(a.descripcion || '').trim();
      if (h > 0 && !desc) {
        errors.push('Toda actividad con horas debe tener descripción.');
        break outer;
      }
    }
  }

  if (horasActividades <= 0) {
    errors.push('Registra actividades con horas para cuadrar el alcance.');
  }

  if (perfiles.length > 0 && horasActividades > 0) {
    if (Math.abs(totalHorasPerfiles - horasActividades) > TOL_HORAS) {
      errors.push(
        `Las horas de perfiles (${totalHorasPerfiles.toFixed(1)} h) deben igualar las horas de actividades (${horasActividades.toFixed(1)} h).`
      );
    }
  }

  const uniq = [...new Set(errors)];
  return { ok: uniq.length === 0, errors: uniq, iniciado: true };
}

export function mensajeValidacionActividades(result) {
  if (!result?.errors?.length) return '';
  return result.errors[0];
}
