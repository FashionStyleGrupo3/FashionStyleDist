export const REQUISITOS_PASSWORD = [
  { id: 'largo', texto: 'Entre 10 y 64 caracteres', cumple: (p) => p.length >= 10 && p.length <= 64 },
  { id: 'mayus', texto: 'Una mayíscula', cumple: (p) => /\p{Lu}/u.test(p) },
  { id: 'minus', texto: 'Una miníscula', cumple: (p) => /\p{Ll}/u.test(p) },
  { id: 'numero', texto: 'Un número', cumple: (p) => /\d/.test(p) },
  { id: 'simbolo', texto: 'Un smbolo (! @ # $ %)', cumple: (p) => /[^\p{L}\p{N}\s]/u.test(p) },
  {
    id: 'comun',
    texto: 'No es una palabra comun (ej. "Password")',
    cumple: (p) => {
      const base = p.toLowerCase().normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '').replace(/[^a-z]/g, '');
      return !['password', 'contrasena', 'qwerty', 'abcdef', 'fashionstyle',
        'admin', 'administrador', 'bienvenido', 'colombia', 'iloveyou'].includes(base);
    }
  }
];

export function passwordEsSegura(password) {
  return REQUISITOS_PASSWORD.every((r) => r.cumple(password || ''));
}