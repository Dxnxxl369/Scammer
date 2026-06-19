import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:provider/provider.dart';
import '../core/theme.dart';
import '../providers/auth_provider.dart';
import '../services/api_service.dart';
import '../widgets/bottom_nav.dart';

import '../widgets/master_header.dart';

class AdminSettingsScreen extends StatefulWidget {
  const AdminSettingsScreen({super.key});

  @override
  State<AdminSettingsScreen> createState() => _AdminSettingsScreenState();
}

class _AdminSettingsScreenState extends State<AdminSettingsScreen> {
  bool _isLoading = true;
  bool _isSaving = false;
  Map<String, dynamic> _prefs = {
    'global_push': true,
    'canales': {
      'analisis_liviano': {'mostrar': true, 'notificar': true, 'sonar': true},
      'analisis_pesado': {'mostrar': true, 'notificar': true, 'sonar': true},
      'seguridad': {'mostrar': true, 'notificar': true, 'sonar': true},
      'pago': {'mostrar': true, 'notificar': true, 'sonar': true},
      'registro': {'mostrar': true, 'notificar': true, 'sonar': true},
    }
  };

  final List<Map<String, dynamic>> _categories = [
    {
      'id': 'analisis_liviano',
      'label': 'Análisis_Liviano',
      'sub': 'Texto, Documentos, Código',
      'icon': LucideIcons.fileText,
      'color': Colors.cyan,
    },
    {
      'id': 'analisis_pesado',
      'label': 'Análisis_Pesado',
      'sub': 'Imagen, Video, Audio',
      'icon': LucideIcons.image,
      'color': AppColors.accent,
    },
    {
      'id': 'seguridad',
      'label': 'Seguridad_Forense',
      'sub': 'Accesos, Bloqueos, Tokens',
      'icon': LucideIcons.shieldAlert,
      'color': Colors.red,
    },
    {
      'id': 'pago',
      'label': 'Módulo_Finanzas',
      'sub': 'Suscripciones y Upgrades',
      'icon': LucideIcons.zap,
      'color': AppColors.safe,
    },
    {
      'id': 'registro',
      'label': 'Reclutamiento',
      'sub': 'Nuevos Agentes en Sistema',
      'icon': LucideIcons.userPlus,
      'color': AppColors.safe,
    },
  ];

  @override
  void initState() {
    super.initState();
    _fetchPrefs();
  }

  Future<void> _fetchPrefs() async {
    try {
      final response = await ApiService.get('/analisis/notificaciones/preferencias/');
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        setState(() {
          _prefs = data['datos'];
          _isLoading = false;
        });
      }
    } catch (e) {
      print("Admin Prefs Error: $e");
    }
  }

  Future<void> _savePrefs() async {
    setState(() => _isSaving = true);
    try {
      final response = await ApiService.patch('/analisis/notificaciones/preferencias/', _prefs);
      if (response.statusCode == 200) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('PROTOCOLOS SINCRONIZADOS CON ÉXITO')),
          );
        }
      }
    } catch (e) {
      print("Save Prefs Error: $e");
    } finally {
      if (mounted) setState(() => _isSaving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = Provider.of<AuthProvider>(context);
    final isDark = auth.isDarkMode;

    print('--- DEBUG CONFIG BUILD ---');
    print('isLoading: $_isLoading');
    print('prefs: $_prefs');
    if (_prefs != null && _prefs.containsKey('canales')) {
      print('canales keys: ${_prefs['canales'].keys}');
    } else {
      print('ALERTA: _prefs["canales"] es NULO o no existe');
    }

    return Scaffold(
      bottomNavigationBar: BottomNavBar(
        currentIndex: 3,
        onTap: (index) {
          if (index == 0) Navigator.pushReplacementNamed(context, '/dashboard');
          if (index == 1) Navigator.pushReplacementNamed(context, '/admin');
          if (index == 2) Navigator.pushReplacementNamed(context, '/admin_finance');
          if (index == 4) Navigator.pushReplacementNamed(context, '/profile');
        },
      ),
      body: SafeArea(
        child: _isLoading 
          ? const Center(child: CircularProgressIndicator())
          : Column(
              children: [
                Expanded(
                  child: SingleChildScrollView(
                    padding: const EdgeInsets.all(24.0),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const MasterHeader(),
                        const SizedBox(height: 32),
                        const Text('ALERTAS_CONFIG', style: TextStyle(fontSize: 24, fontWeight: FontWeight.w900, fontStyle: FontStyle.italic)),
                        const Text('PROTOCOLO DE ENRUTAMIENTO DE NOTIFICACIONES', style: TextStyle(color: AppColors.textMuted, fontSize: 10, fontWeight: FontWeight.w800, letterSpacing: 2)),
                        const SizedBox(height: 32),
                        
                        _buildGlobalPushTile(isDark),
                        const SizedBox(height: 32),
                        
                        const Text('CANALES DE TRANSMISIÓN', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w900, letterSpacing: 2, color: AppColors.textMuted)),
                        const SizedBox(height: 16),
                        
                        ..._categories.map((cat) => _buildCategoryCard(cat, isDark)),
                        const SizedBox(height: 100), // Espacio para el botón flotante
                      ],
                    ),
                  ),
                ),
              ],
            ),
      ),
      floatingActionButton: Padding(
        padding: const EdgeInsets.only(bottom: 20),
        child: FloatingActionButton.extended(
          onPressed: _isSaving ? null : _savePrefs,
          backgroundColor: AppColors.accent,
          icon: _isSaving ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2)) : const Icon(LucideIcons.settings2, size: 18, color: Colors.white),
          label: Text(_isSaving ? 'SINCRONIZANDO...' : 'SINCRONIZAR PROTOCOLOS', style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 10, letterSpacing: 1, color: Colors.white)),
        ),
      ),
      floatingActionButtonLocation: FloatingActionButtonLocation.centerFloat,
    );
  }

  Widget _buildGlobalPushTile(bool isDark) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: AppColors.getCard(isDark),
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: AppColors.getBorder(isDark)),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          const Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('GLOBAL_PUSH', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 12, letterSpacing: 1)),
              Text('Notificaciones maestras del sistema', style: TextStyle(color: AppColors.textMuted, fontSize: 9, fontWeight: FontWeight.bold)),
            ],
          ),
          Switch(
            value: _prefs!['global_push'] ?? false,
            onChanged: (val) => setState(() => _prefs!['global_push'] = val),
            activeColor: AppColors.accent,
          ),
        ],
      ),
    );
  }

  Widget _buildCategoryCard(Map<String, dynamic> cat, bool isDark) {
    final String id = cat['id'];
    
    // Obtener la config del canal con seguridad nula
    final Map<String, dynamic> canales = _prefs['canales'] ?? {};
    final Map<String, dynamic> config = canales[id] ?? {
      'mostrar': false,
      'notificar': false,
      'sonar': false,
    };

    void _updateToggle(String field, bool val) {
      setState(() {
        if (_prefs['canales'] == null) {
          _prefs['canales'] = <String, dynamic>{};
        }
        if (_prefs['canales'][id] == null) {
          _prefs['canales'][id] = {
            'mostrar': false,
            'notificar': false,
            'sonar': false,
          };
        }
        _prefs['canales'][id][field] = val;
      });
    }

    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: AppColors.getCard(isDark),
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: AppColors.getBorder(isDark)),
      ),
      child: Column(
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(color: (cat['color'] as Color).withOpacity(0.1), borderRadius: BorderRadius.circular(12)),
                child: Icon(cat['icon'], color: cat['color'], size: 18),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(cat['label'].toUpperCase(), style: TextStyle(fontWeight: FontWeight.w900, fontSize: 11, color: cat['color'])),
                    Text(cat['sub'], style: const TextStyle(color: AppColors.textMuted, fontSize: 8, fontWeight: FontWeight.bold, fontStyle: FontStyle.italic)),
                  ],
                ),
              )
            ],
          ),
          const SizedBox(height: 20),
          const Divider(height: 1, color: AppColors.textMuted),
          const SizedBox(height: 16),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: [
              _buildToggleOption('MOSTRAR', config['mostrar'] ?? false, (val) => _updateToggle('mostrar', val), isDark),
              _buildToggleOption('PUSH', config['notificar'] ?? false, (val) => _updateToggle('notificar', val), isDark),
              _buildToggleOption('SONIDO', config['sonar'] ?? false, (val) => _updateToggle('sonar', val), isDark),
            ],
          )
        ],
      ),
    );
  }

  Widget _buildToggleOption(String label, bool val, Function(bool) onChanged, bool isDark) {
    return Column(
      children: [
        Text(label, style: const TextStyle(fontSize: 8, fontWeight: FontWeight.w900, color: AppColors.textMuted, letterSpacing: 1)),
        const SizedBox(height: 4),
        Transform.scale(
          scale: 0.8,
          child: Switch(
            value: val,
            onChanged: onChanged,
            activeColor: AppColors.accent,
          ),
        ),
      ],
    );
  }
}
