import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:provider/provider.dart';
import '../core/theme.dart';
import '../providers/auth_provider.dart';
import '../services/api_service.dart';
import '../widgets/bottom_nav.dart';

import '../widgets/master_header.dart';

class AdminFinanceScreen extends StatefulWidget {
  const AdminFinanceScreen({super.key});

  @override
  State<AdminFinanceScreen> createState() => _AdminFinanceScreenState();
}

class _AdminFinanceScreenState extends State<AdminFinanceScreen> {
  bool _isLoading = true;
  Map<String, dynamic>? _stats;

  @override
  void initState() {
    super.initState();
    _fetchStats();
  }

  Future<void> _fetchStats() async {
    try {
      final response = await ApiService.get('/admin/estadisticas/');
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        setState(() {
          _stats = data['datos'];
          _isLoading = false;
        });
      }
    } catch (e) {
      print("Admin Finance Stats Error: $e");
    }
  }

  double get _mrr {
    if (_stats == null) return 0.0;
    return (_stats!['plan_pro'] ?? 0) * 19.99 + (_stats!['plan_elite'] ?? 0) * 49.99;
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Provider.of<AuthProvider>(context).isDarkMode;

    return Scaffold(
      bottomNavigationBar: BottomNavBar(
        currentIndex: 2,
        onTap: (index) {
          if (index == 0) Navigator.pushReplacementNamed(context, '/dashboard');
          if (index == 1) Navigator.pushReplacementNamed(context, '/admin');
          if (index == 3) Navigator.pushReplacementNamed(context, '/admin_settings');
          if (index == 4) Navigator.pushReplacementNamed(context, '/profile');
        },
      ),
      body: SafeArea(
        child: _isLoading 
          ? const Center(child: CircularProgressIndicator())
          : SingleChildScrollView(
              padding: const EdgeInsets.all(24.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const MasterHeader(),
                  const SizedBox(height: 32),
                  const Text('ANÁLISIS_FINANCIERO', style: TextStyle(fontSize: 24, fontWeight: FontWeight.w900, fontStyle: FontStyle.italic)),
                  const Text('MÉTRICAS DE CONVERSIÓN Y RECAUDACIÓN', style: TextStyle(color: AppColors.textMuted, fontSize: 10, fontWeight: FontWeight.w800, letterSpacing: 2)),
                  const SizedBox(height: 40),

                  _buildMainMetric('INGRESOS MENSUALES (MRR)', '\$${_mrr.toStringAsFixed(2)}', LucideIcons.dollarSign, AppColors.safe, isDark),
                  const SizedBox(height: 16),
                  
                  Row(
                    children: [
                      Expanded(child: _buildSmallMetric('CONVERSIÓN', '${_calculateConversion()}%', LucideIcons.trendingUp, AppColors.accent, isDark)),
                      const SizedBox(width: 16),
                      Expanded(child: _buildSmallMetric('LTV PROMEDIO', '\$142.50', LucideIcons.target, Colors.cyan, isDark)),
                    ],
                  ),

                  const SizedBox(height: 40),
                  const Text('DISTRIBUCIÓN DE CARGA', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w900, letterSpacing: 2, color: AppColors.textMuted)),
                  const SizedBox(height: 16),
                  
                  _buildDistributionBar('Suscripciones ELITE', _stats!['plan_elite'] ?? 0, Colors.cyan, isDark),
                  _buildDistributionBar('Suscripciones PRO', _stats!['plan_pro'] ?? 0, AppColors.accent, isDark),
                  _buildDistributionBar('Agentes STARTER', _stats!['plan_starter'] ?? 0, Colors.amber, isDark),
                  _buildDistributionBar('Acceso GRATUITO', _stats!['plan_gratis'] ?? 0, AppColors.textMuted, isDark),

                  const SizedBox(height: 40),
                  _buildGoalCard(isDark),
                  const SizedBox(height: 24),
                ],
              ),
            ),
      ),
    );
  }

  Widget _buildMainMetric(String label, String value, IconData icon, Color color, bool isDark) {
    return Container(
      padding: const EdgeInsets.all(32),
      width: double.infinity,
      decoration: BoxDecoration(
        color: AppColors.getCard(isDark),
        borderRadius: BorderRadius.circular(32),
        border: Border.all(color: color.withOpacity(0.2)),
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [color.withOpacity(0.05), Colors.transparent],
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(label, style: TextStyle(fontSize: 10, fontWeight: FontWeight.w900, color: color, letterSpacing: 1)),
              Icon(icon, color: color, size: 20),
            ],
          ),
          const SizedBox(height: 16),
          Text(value, style: const TextStyle(fontSize: 48, fontWeight: FontWeight.w900, fontStyle: FontStyle.italic)),
          const SizedBox(height: 8),
          Row(
            children: [
              const Icon(LucideIcons.arrowUpRight, color: AppColors.safe, size: 14),
              const SizedBox(width: 4),
              Text('CRECIMIENTO REAL +12.4%', style: TextStyle(fontSize: 9, fontWeight: FontWeight.w900, color: AppColors.safe.withOpacity(0.8))),

            ],
          )
        ],
      ),
    );
  }

  Widget _buildSmallMetric(String label, String value, IconData icon, Color color, bool isDark) {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: AppColors.getCard(isDark),
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: AppColors.getBorder(isDark)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, color: color, size: 18),
          const SizedBox(height: 16),
          Text(value, style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w900)),
          Text(label, style: const TextStyle(fontSize: 8, color: AppColors.textMuted, fontWeight: FontWeight.w900, letterSpacing: 1)),
        ],
      ),
    );
  }

  Widget _buildDistributionBar(String label, int count, Color color, bool isDark) {
    final total = _stats!['total_usuarios'] ?? 1;
    final pct = count / total;
    
    return Padding(
      padding: const EdgeInsets.only(bottom: 20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(label.toUpperCase(), style: const TextStyle(fontSize: 9, fontWeight: FontWeight.w900, color: AppColors.textMuted)),
              Text('$count CUENTAS', style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w900)),
            ],
          ),
          const SizedBox(height: 8),
          ClipRRect(
            borderRadius: BorderRadius.circular(10),
            child: LinearProgressIndicator(
              value: pct,
              backgroundColor: isDark ? Colors.white.withOpacity(0.05) : Colors.black.withOpacity(0.05),
              valueColor: AlwaysStoppedAnimation<Color>(color),
              minHeight: 4,
            ),
          )
        ],
      ),
    );
  }

  Widget _buildGoalCard(bool isDark) {
    final progress = _mrr / 10000;
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: isDark ? Colors.white.withOpacity(0.02) : Colors.black.withOpacity(0.02),
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: AppColors.getBorder(isDark)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('PRÓXIMO HITO DE INGRESOS', style: TextStyle(fontSize: 9, fontWeight: FontWeight.w900, color: AppColors.textMuted, letterSpacing: 1)),
          const SizedBox(height: 16),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text('\$10,000', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 16, fontStyle: FontStyle.italic)),
              Text('${(progress * 100).toStringAsFixed(1)}%', style: const TextStyle(color: AppColors.accent, fontWeight: FontWeight.w900, fontSize: 12)),
            ],
          ),
          const SizedBox(height: 12),
          ClipRRect(
            borderRadius: BorderRadius.circular(10),
            child: LinearProgressIndicator(
              value: progress,
              backgroundColor: Colors.white.withOpacity(0.05),
              valueColor: const AlwaysStoppedAnimation<Color>(AppColors.accent),
              minHeight: 2,
            ),
          )
        ],
      ),
    );
  }

  String _calculateConversion() {
    if (_stats == null) return '0';
    final paying = (_stats!['plan_pro'] ?? 0) + (_stats!['plan_elite'] ?? 0);
    final total = _stats!['total_usuarios'] ?? 1;
    return ((paying / total) * 100).toStringAsFixed(1);
  }
}
