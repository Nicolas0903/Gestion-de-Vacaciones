/**
 * Genera una contraseña aleatoria que cumple requisitos habituales de seguridad:
 * mínimo 12 caracteres, al menos una mayúscula, minúscula, dígito y símbolo.
 * Usa crypto.getRandomValues (CSPRNG del navegador).
 */
export function generarPasswordSegura(longitud = 14) {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghjkmnpqrstuvwxyz';
  const digits = '23456789';
  const special = '!@#$%&*+-=?';
  const all = upper + lower + digits + special;

  const len = Math.max(12, longitud);

  const pick = (chars) => {
    const arr = new Uint32Array(1);
    crypto.getRandomValues(arr);
    return chars[arr[0] % chars.length];
  };

  const chars = [pick(upper), pick(lower), pick(digits), pick(special)];
  while (chars.length < len) {
    chars.push(pick(all));
  }

  for (let i = chars.length - 1; i > 0; i--) {
    const arr = new Uint32Array(1);
    crypto.getRandomValues(arr);
    const j = arr[0] % (i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }

  return chars.join('');
}
