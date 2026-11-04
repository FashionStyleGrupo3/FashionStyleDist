// @source-mirror: src/utils/validarPassword.js

class PasswordRequirement {
  final String id;
  final String texto;
  final bool Function(String) cumple;

  const PasswordRequirement({
    required this.id,
    required this.texto,
    required this.cumple,
  });
}

const List<String> palabrasComunesProhibidas = [
  'password',
  'contrasena',
  'qwerty',
  'abcdef',
  'fashionstyle',
  'admin',
  'administrador',
  'bienvenido',
  'colombia',
  'iloveyou',
];

String _normalizarParaComparacion(String texto) {
  return texto
      .toLowerCase()
      .replaceAll(RegExp(r'[áàäâã]', unicode: true), 'a')
      .replaceAll(RegExp(r'[éèëê]', unicode: true), 'e')
      .replaceAll(RegExp(r'[íìïî]', unicode: true), 'i')
      .replaceAll(RegExp(r'[óòöôõ]', unicode: true), 'o')
      .replaceAll(RegExp(r'[úùüû]', unicode: true), 'u')
      .replaceAll(RegExp(r'[ñ]', unicode: true), 'n')
      .replaceAll(RegExp(r'[^a-z]'), '');
}

final List<PasswordRequirement> requisitosPassword = [
  PasswordRequirement(
    id: 'largo',
    texto: 'Entre 10 y 64 caracteres',
    cumple: (p) => p.length >= 10 && p.length <= 64,
  ),
  PasswordRequirement(
    id: 'mayus',
    texto: 'Una mayúscula',
    cumple: (p) => RegExp(r'\p{Lu}', unicode: true).hasMatch(p),
  ),
  PasswordRequirement(
    id: 'minus',
    texto: 'Una minúscula',
    cumple: (p) => RegExp(r'\p{Ll}', unicode: true).hasMatch(p),
  ),
  PasswordRequirement(
    id: 'numero',
    texto: 'Un número',
    cumple: (p) => RegExp(r'\d').hasMatch(p),
  ),
  PasswordRequirement(
    id: 'simbolo',
    texto: 'Un símbolo (! @ # $ %)',
    cumple: (p) => RegExp(r'[^\p{L}\p{N}\s]', unicode: true).hasMatch(p),
  ),
  PasswordRequirement(
    id: 'comun',
    texto: 'No es una palabra común (ej. "Password")',
    cumple: (p) {
      if (p.isEmpty) return true;
      final base = _normalizarParaComparacion(p);
      return !palabrasComunesProhibidas.contains(base);
    },
  ),
];

bool passwordEsSegura(String? password) {
  final p = password ?? '';
  return requisitosPassword.every((r) => r.cumple(p));
}
