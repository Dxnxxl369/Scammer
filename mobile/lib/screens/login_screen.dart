import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:app_links/app_links.dart';
import '../core/theme.dart';
import '../providers/auth_provider.dart';
import '../services/api_service.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  bool _showPassword = false;
  bool _isLoggingIn = false;
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  
  late AppLinks _appLinks;
  StreamSubscription<Uri>? _linkSubscription;

  @override
  void initState() {
    super.initState();
    _initDeepLinks();
  }

  @override
  void dispose() {
    _linkSubscription?.cancel();
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  void _initDeepLinks() {
    _appLinks = AppLinks();
    
    // Escuchar links cuando la app está abierta
    _linkSubscription = _appLinks.uriLinkStream.listen((uri) {
      _handleDeepLink(uri);
    });

    // Revisar si la app se abrió desde un link (app cerrada)
    _appLinks.getInitialLink().then((uri) {
      if (uri != null) _handleDeepLink(uri);
    });
  }

  void _handleDeepLink(Uri uri) {
    print('--- DEEP LINK RECIBIDO ---');
    print('URI: $uri');
    
    String? accessToken;
    
    // 1. Intentar buscar en el fragmento (Implicit Flow: #access_token=...)
    if (uri.hasFragment) {
      final params = Uri.splitQueryString(uri.fragment);
      accessToken = params['access_token'];
      if (accessToken != null) print('TOKEN DETECTADO EN FRAGMENTO');
    }
    
    // 2. Intentar buscar en query params (PKCE o config especial: ?access_token=...)
    if (accessToken == null) {
      accessToken = uri.queryParameters['access_token'];
      if (accessToken != null) print('TOKEN DETECTADO EN QUERY PARAMS');
    }

    // 3. Caso especial: Si recibimos un código en lugar de un token
    if (accessToken == null && uri.queryParameters.containsKey('code')) {
      print('AVISO: SE RECIBIÓ UN CÓDIGO (PKCE) EN LUGAR DE UN TOKEN. REVISE CONFIG BACKEND.');
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('ERROR: FLUJO PKCE NO SOPORTADO AÚN EN MÓVIL')),
      );
      return;
    }

    if (accessToken != null) {
      _completeOAuthLogin(accessToken);
    } else {
      print('ERROR: NO SE ENCONTRÓ ACCESS_TOKEN EN LA URL. PARÁMETROS: ${uri.queryParameters}');
    }
  }

  Future<void> _completeOAuthLogin(String token) async {
    print('INICIANDO VINCULACIÓN CON BACKEND...');
    setState(() => _isLoggingIn = true);
    final auth = Provider.of<AuthProvider>(context, listen: false);
    final success = await auth.loginWithToken(token);
    
    print('RESULTADO VINCULACIÓN: ${success ? "ÉXITO" : "FALLO"}');
    
    if (mounted) {
      setState(() => _isLoggingIn = false);
      if (success) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('ACCESO CONCEDIDO: BIENVENIDO AGENTE')),
        );
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('ERROR AL VINCULAR CUENTA DE GOOGLE - REVISE LOGS')),
        );
      }
    }
  }

  Future<void> _handleLogin() async {
    if (_emailController.text.isEmpty || _passwordController.text.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('POR FAVOR LLENE TODOS LOS CAMPOS')),
      );
      return;
    }

    setState(() => _isLoggingIn = true);
    final auth = Provider.of<AuthProvider>(context, listen: false);
    final success = await auth.login(_emailController.text, _passwordController.text);
    
    if (mounted) {
      setState(() => _isLoggingIn = false);
      if (!success) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('ERROR: CREDENCIALES INVÁLIDAS O ERROR DE RED')),
        );
      }
    }
  }

  Future<void> _handleGoogleLogin() async {
    try {
      final response = await ApiService.get('/auth/google-url/');
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        final url = Uri.parse(data['datos']['url']);
        if (await canLaunchUrl(url)) {
          await launchUrl(url, mode: LaunchMode.externalApplication);
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('REDIRECCIONANDO A GOOGLE...')),
          );
        }
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('ERROR AL OBTENER URL DE GOOGLE')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const SizedBox(height: 40),
              // Logo Area
              Center(
                child: Column(
                  children: [
                    Container(
                      width: 80,
                      height: 80,
                      decoration: BoxDecoration(
                        color: AppColors.accent,
                        borderRadius: BorderRadius.circular(24),
                        boxShadow: [
                          BoxShadow(
                            color: AppColors.accent.withOpacity(0.3),
                            blurRadius: 30,
                            spreadRadius: 5,
                          )
                        ],
                      ),
                      child: const Icon(LucideIcons.shieldAlert, color: Colors.white, size: 40),
                    ),
                    const SizedBox(height: 20),
                    const Text(
                      'SCAMMER_IA',
                      style: TextStyle(
                        fontSize: 32,
                        fontWeight: FontWeight.w900,
                        fontStyle: FontStyle.italic,
                        letterSpacing: -1,
                      ),
                    ),
                    const Text(
                      'TERMINAL FORENSE MÓVIL',
                      style: TextStyle(
                        color: AppColors.textMuted,
                        fontSize: 10,
                        fontWeight: FontWeight.w800,
                        letterSpacing: 4,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 60),

              // Inputs
              _buildInput(
                controller: _emailController,
                hint: 'AGENTE@SCAMMER.IO',
                icon: LucideIcons.mail,
              ),
              const SizedBox(height: 16),
              _buildInput(
                controller: _passwordController,
                hint: '••••••••',
                icon: LucideIcons.lock,
                isPassword: true,
                showPassword: _showPassword,
                onTogglePassword: () => setState(() => _showPassword = !_showPassword),
              ),

              const SizedBox(height: 24),
              ElevatedButton(
                onPressed: _isLoggingIn ? null : _handleLogin,
                child: _isLoggingIn 
                  ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                  : const Text('INICIAR SESIÓN'),
              ),

              const SizedBox(height: 12),
              OutlinedButton(
                onPressed: _handleGoogleLogin,
                style: OutlinedButton.styleFrom(
                  side: const BorderSide(color: AppTheme.border),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
                  padding: const EdgeInsets.symmetric(vertical: 18),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Icon(LucideIcons.globe, size: 18),
                    const SizedBox(width: 12),
                    const Text('ENTRAR CON GOOGLE', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 10, letterSpacing: 1)),
                  ],
                ),
              ),

              const SizedBox(height: 40),
              Center(
                child: RichText(
                  text: const TextSpan(
                    style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.textMuted),
                    children: [
                      TextSpan(text: '¿NUEVO AGENTE? '),
                      TextSpan(
                        text: 'SOLICITAR ACCESO',
                        style: TextStyle(color: AppColors.accent),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 20),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildInput({
    required TextEditingController controller,
    required String hint,
    required IconData icon,
    bool isPassword = false,
    bool showPassword = false,
    VoidCallback? onTogglePassword,
  }) {
    return Container(
      decoration: BoxDecoration(
        color: AppTheme.card,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppTheme.border),
      ),
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 4),
      child: TextField(
        controller: controller,
        obscureText: isPassword && !showPassword,
        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
        decoration: InputDecoration(
          icon: Icon(icon, size: 20, color: AppColors.textMuted),
          hintText: hint,
          hintStyle: const TextStyle(color: AppColors.textMuted, fontSize: 12),
          border: InputBorder.none,
          suffixIcon: isPassword
              ? IconButton(
                  icon: Icon(
                    showPassword ? LucideIcons.eye : LucideIcons.eyeOff,
                    size: 20,
                    color: AppColors.accent,
                  ),
                  onPressed: onTogglePassword,
                )
              : null,
        ),
      ),
    );
  }
}
