class UserProfile {
  final String id;
  final String email;
  final String username;
  final String role;
  final String plan;
  final int intentosLivianos;
  final int intentosPesados;

  UserProfile({
    required this.id,
    required this.email,
    required this.username,
    required this.role,
    required this.plan,
    required this.intentosLivianos,
    required this.intentosPesados,
  });

  factory UserProfile.fromJson(Map<String, dynamic> json) {
    return UserProfile(
      id: json['id_supabase'] ?? '',
      email: json['correo'] ?? '',
      username: json['nombre_usuario'] ?? '',
      role: json['rol'] ?? 'usuario',
      plan: json['plan'] ?? 'gratis',
      intentosLivianos: json['intentos_livianos'] ?? 0,
      intentosPesados: json['intentos_pesados'] ?? 0,
    );
  }
}
