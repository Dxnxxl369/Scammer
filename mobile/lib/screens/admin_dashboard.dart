import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:provider/provider.dart';
import '../core/theme.dart';
import '../providers/auth_provider.dart';
import '../services/api_service.dart';
import '../widgets/bottom_nav.dart';
import '../widgets/master_header.dart';

class AdminDashboard extends StatefulWidget {
  const AdminDashboard({super.key});

  @override
  State<AdminDashboard> createState() => _AdminDashboardState();
}

class _AdminDashboardState extends State<AdminDashboard> {
  bool _isLoading = true;
  List<dynamic> _logs = [];
  Map<String, dynamic>? _stats;

  @override
  void initState() {
    super.initState();
    _fetchData();
  }

  Future<void> _fetchData() async {
    setState(() => _isLoading = true);
    try {
      final statsRes = await ApiService.get('/admin/estadisticas/');
      final logsRes = await ApiService.get('/analisis/admin/bitacora/');
      
      if (mounted) {
        setState(() {
          if (statsRes.statusCode == 200) {
            _stats = jsonDecode(statsRes.body)['datos'];
          }
          if (logsRes.statusCode == 200) {
            _logs = jsonDecode(logsRes.body)['datos'] ?? [];
          }
          _isLoading = false;
        });
      }
    } catch (e) {
      print("Admin Data Error: $e");
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Provider.of<AuthProvider>(context).isDarkMode;

    return Scaffold(
      bottomNavigationBar: BottomNavBar(
        currentIndex: 1,
        onTap: (index) {
          if (index == 0) Navigator.pushReplacementNamed(context, '/dashboard');
          if (index == 2) Navigator.pushReplacementNamed(context, '/admin_finance');
          if (index == 3) Navigator.pushReplacementNamed(context, '/admin_settings');
          if (index == 4) Navigator.pushReplacementNamed(context, '/profile');
        },
      ),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const MasterHeader(),
              const SizedBox(height: 32),
              const Text('CENTRO_DE_CONTROL', style: TextStyle(fontSize: 24, fontWeight: FontWeight.w900, fontStyle: FontStyle.italic)),
              const Text('PANEL DE MANDO CENTRALIZADO', style: TextStyle(color: AppColors.textMuted, fontSize: 10, fontWeight: FontWeight.w800, letterSpacing: 2)),
              const SizedBox(height: 30),
              
              _buildStatsGrid(isDark),
              const SizedBox(height: 40),
              
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text('BITÁCORA_GLOBAL', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w900, fontStyle: FontStyle.italic)),
                  TextButton(
                    onPressed: _fetchData, 
                    child: const Text('REFRESCAR', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: AppColors.accent))
                  ),
                ],
              ),
              const SizedBox(height: 16),
              
              Expanded(
                child: _isLoading 
                  ? const Center(child: CircularProgressIndicator())
                  : _logs.isEmpty 
                    ? const Center(child: Text('NO HAY ACTIVIDAD RECIENTE'))
                    : ListView.builder(
                        itemCount: _logs.length,
                        physics: const BouncingScrollPhysics(),
                        itemBuilder: (context, index) => _buildLogItem(_logs[index], isDark),
                      ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildStatsGrid(bool isDark) {
    return Row(
      children: [
        Expanded(
          child: InkWell(
            onTap: () => Navigator.pushNamed(context, '/admin_users'),
            borderRadius: BorderRadius.circular(24),
            child: _buildStatCard('Agentes', '${_stats?['total_usuarios'] ?? 0}', LucideIcons.users, Colors.blue, isDark),
          ),
        ),
        const SizedBox(width: 16),
        Expanded(child: _buildStatCard('En Línea', '${_stats?['en_linea'] ?? 0}', LucideIcons.activity, AppColors.safe, isDark)),
      ],
    );
  }

  Widget _buildStatCard(String title, String value, IconData icon, Color color, bool isDark) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: AppColors.getCard(isDark),
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: AppColors.getBorder(isDark)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, color: color, size: 20),
          const SizedBox(height: 16),
          Text(value, style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w900)),
          Text(title.toUpperCase(), style: const TextStyle(fontSize: 8, color: AppColors.textMuted, fontWeight: FontWeight.w800, letterSpacing: 1)),
        ],
      ),
    );
  }

  Widget _buildLogItem(dynamic log, bool isDark) {
    final isError = log['estado'] == 'ERROR';
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.getCard(isDark),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppColors.getBorder(isDark)),
      ),
      child: Row(
        children: [
          Container(
            width: 6, height: 6,
            decoration: BoxDecoration(color: isError ? Colors.red : AppColors.safe, shape: BoxShape.circle),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(log['accion'].toString().toUpperCase(), style: const TextStyle(fontSize: 9, fontWeight: FontWeight.w900)),
                Text('${log['usuario_nombre'] ?? 'Anónimo'} • ${log['ip']}', style: const TextStyle(fontSize: 8, color: AppColors.textMuted, fontWeight: FontWeight.bold)),
              ],
            ),
          ),
          Text(log['fecha_creacion'].toString().split(' ')[0], style: const TextStyle(fontSize: 8, color: AppColors.textMuted, fontWeight: FontWeight.bold)),
        ],
      ),
    );
  }
}
