import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/user.dart';
import '../services/api_service.dart';
import '../services/firebase_service.dart';

class AuthProvider extends ChangeNotifier {
  UserProfile? _user;
  bool _isLoading = true;
  bool _isDarkMode = true;

  UserProfile? get user => _user;
  bool get isLoading => _isLoading;
  bool get isDarkMode => _isDarkMode;
  bool get isAdmin => _user?.role == 'administrador';

  AuthProvider() {
    print('✅ [DEBUG] AuthProvider instanciado');
    _init();
  }

  Future<void> _init() async {
    print('✅ [DEBUG] Ejecutando _init() en AuthProvider...');
    await checkSession();
    print('✅ [DEBUG] _init() finalizado');
  }

  void toggleTheme() {
    _isDarkMode = !_isDarkMode;
    notifyListeners();
  }

  Future<bool> login(String email, String password) async {
    try {
      final response = await ApiService.post('/auth/login/', {
        'correo': email,
        'password': password,
      });

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data['exito'] == true) {
          final userData = data['datos']['usuario'];
          final token = data['datos']['session']['access_token'];
          
          await _saveSession(token, userData);
          return true;
        }
      }
      return false;
    } catch (e) {
      print("Login Error: $e");
      return false;
    }
  }

  Future<bool> loginWithToken(String token) async {
    print('--- AUTH PROVIDER: INICIANDO LOGIN CON TOKEN ---');
    try {
      final prefs = await SharedPreferences.getInstance();
      print('GUARDANDO TOKEN TEMPORAL PARA VALIDACIÓN...');
      await prefs.setString('auth_token', token);

      print('PETICIÓN A: /auth/yo/');
      final response = await ApiService.get('/auth/yo/');
      print('RESPUESTA BACKEND (Status: ${response.statusCode})');
      print('BODY: ${response.body}');

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data['exito'] == true) {
          print('PERFIL OBTENIDO CON ÉXITO: ${data['datos']['nombre_usuario']}');
          final userData = data['datos'];
          await _saveSession(token, userData);
          return true;
        } else {
          print('ERROR EN DATA: ${data['error']}');
        }
      } else {
        print('ERROR HTTP: EL BACKEND NO RECONOCIÓ EL TOKEN O EL USUARIO NO EXISTE');
      }
      
      print('LIMPIANDO TOKEN POR FALLO EN VINCULACIÓN');
      await prefs.remove('auth_token');
      return false;
    } catch (e) {
      print('EXCEPCIÓN EN LOGIN_WITH_TOKEN: $e');
      return false;
    }
  }

  Future<void> _saveSession(String token, Map<String, dynamic> userData) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('auth_token', token);
    await prefs.setString('user_id', userData['id_supabase']);
    
    _user = UserProfile.fromJson(userData);
    notifyListeners();
  }

  Future<void> checkSession() async {
    print('✅ [DEBUG] Entrando a checkSession()...');
    _isLoading = true;
    notifyListeners();
    
    try {
      print('✅ [DEBUG] Haciendo GET a /auth/yo/');
      final response = await ApiService.get('/auth/yo/');
      print('✅ [DEBUG] Respuesta recibida de /auth/yo/: \${response.statusCode}');
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data['exito'] == true) {
          _user = UserProfile.fromJson(data['datos']);
          // Vincular dispositivo para notificaciones push
          print('✅ [DEBUG] Perfil cargado correctamente, inicializando Firebase Push...');
          FirebaseService.registerToken();
        }
      } else {
        print('✅ [DEBUG] Código de error HTTP: \${response.statusCode}');
        _user = null;
      }
    } catch (e) {
      print('❌ [DEBUG ERROR EN CHECKSESSION]: \$e');
      _user = null;
    } finally {
      print('✅ [DEBUG] checkSession() terminando, isLoading = false');
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> refreshUser() async {
    await checkSession();
  }

  Future<void> logout() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('auth_token');
    await prefs.remove('user_id');
    _user = null;
    _isLoading = false;
    notifyListeners();
  }
}
