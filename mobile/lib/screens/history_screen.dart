import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:provider/provider.dart';
import '../core/theme.dart';
import '../providers/auth_provider.dart';
import '../services/analysis_service.dart';
import '../models/analysis.dart';
import '../widgets/bottom_nav.dart';
import 'analysis_detail_screen.dart';

import '../widgets/master_header.dart';

class HistoryScreen extends StatefulWidget {
  final bool fromProfile;
  const HistoryScreen({super.key, this.fromProfile = false});

  @override
  State<HistoryScreen> createState() => _HistoryScreenState();
}

class _HistoryScreenState extends State<HistoryScreen> {
  List<AnalysisResult> _history = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _fetchHistory();
  }

  Future<void> _fetchHistory() async {
    final history = await AnalysisService.obtenerHistorial();
    if (mounted) {
      setState(() {
        _history = history ?? [];
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = Provider.of<AuthProvider>(context);
    final isDark = auth.isDarkMode;
    final isAdmin = auth.isAdmin;

    return Scaffold(
      bottomNavigationBar: BottomNavBar(
        currentIndex: widget.fromProfile ? (isAdmin ? 4 : 3) : 1,
        onTap: (index) {
          if (widget.fromProfile) {
            Navigator.pop(context);
            return;
          }
          if (isAdmin) {
            if (index == 0) Navigator.pushReplacementNamed(context, '/dashboard');
            if (index == 1) return;
            if (index == 2) Navigator.pushReplacementNamed(context, '/admin_finance');
            if (index == 3) Navigator.pushReplacementNamed(context, '/admin_settings');
            if (index == 4) Navigator.pushReplacementNamed(context, '/profile');
          } else {
            if (index == 0) Navigator.pushReplacementNamed(context, '/dashboard');
            if (index == 1) return;
            if (index == 2) Navigator.pushReplacementNamed(context, '/plans');
            if (index == 3) Navigator.pushReplacementNamed(context, '/profile');
          }
        },
      ),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              MasterHeader(showBack: widget.fromProfile),
              const SizedBox(height: 32),
              const Text('HISTORIAL_FORENSE', style: TextStyle(fontSize: 24, fontWeight: FontWeight.w900, fontStyle: FontStyle.italic)),
              const Text('REGISTROS DE EVIDENCIAS DETECTADAS', style: TextStyle(color: AppColors.textMuted, fontSize: 10, fontWeight: FontWeight.w800, letterSpacing: 2)),
              const SizedBox(height: 30),
              Expanded(
                child: _isLoading 
                  ? const Center(child: CircularProgressIndicator())
                  : _history.isEmpty 
                    ? _buildEmptyState()
                    : ListView.builder(
                        itemCount: _history.length,
                        physics: const BouncingScrollPhysics(),
                        itemBuilder: (context, index) => InkWell(
                          onTap: () => Navigator.push(
                            context, 
                            MaterialPageRoute(builder: (context) => AnalysisDetailScreen(analysis: _history[index]))
                          ),
                          child: _buildHistoryItem(_history[index], isDark),
                        ),
                      ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildHeader(AuthProvider auth) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Image(image: const AssetImage('assets/logo_mini.png'), width: 24, height: 24, errorBuilder: (c, e, s) => const Icon(LucideIcons.shield, size: 24, color: AppColors.accent)),
        Row(
          children: [
            IconButton(icon: Icon(auth.isDarkMode ? LucideIcons.sun : LucideIcons.moon, size: 20), onPressed: () => auth.toggleTheme()),
            const Icon(LucideIcons.bell, size: 24),
          ],
        )
      ],
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(LucideIcons.folderX, size: 48, color: AppColors.textMuted.withOpacity(0.2)),
          const SizedBox(height: 16),
          const Text('SIN REGISTROS', style: TextStyle(fontWeight: FontWeight.w900, color: AppColors.textMuted, fontSize: 10, letterSpacing: 1)),
        ],
      ),
    );
  }

  Widget _buildHistoryItem(AnalysisResult item, bool isDark) {
    final isSafe = item.aiProbability <= 50;
    
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.getCard(isDark),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.getBorder(isDark)),
      ),
      child: Row(
        children: [
          Container(
            width: 40, height: 40,
            decoration: BoxDecoration(
              color: (isSafe ? AppColors.safe : AppColors.accent).withOpacity(0.1),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(
              item.type == 'texto' ? LucideIcons.fileText : (item.type == 'video' ? LucideIcons.video : LucideIcons.image),
              color: isSafe ? AppColors.safe : AppColors.accent,
              size: 18,
            ),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(item.veredicto.toUpperCase(), style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 11)),
                Text(item.date.toString().split('.')[0], style: const TextStyle(color: AppColors.textMuted, fontSize: 9, fontWeight: FontWeight.bold)),
              ],
            ),
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text('${item.aiProbability.toInt()}%', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 16, color: isSafe ? AppColors.safe : AppColors.accent, fontStyle: FontStyle.italic)),
              const Text('IA CONF.', style: TextStyle(fontSize: 7, fontWeight: FontWeight.w900, color: AppColors.textMuted)),
            ],
          )
        ],
      ),
    );
  }
}
