import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:provider/provider.dart';
import '../core/theme.dart';
import '../providers/auth_provider.dart';
import '../models/analysis.dart';
import '../widgets/master_header.dart';
import '../widgets/evidence_player.dart';

class AnalysisDetailScreen extends StatelessWidget {
  final AnalysisResult analysis;

  const AnalysisDetailScreen({super.key, required this.analysis});

  @override
  Widget build(BuildContext context) {
    final auth = Provider.of<AuthProvider>(context);
    final isDark = auth.isDarkMode;
    final userPlan = auth.user?.plan ?? 'gratis';
    
    // Detectar si el rastro físico fue purgado
    final bool isPurged = analysis.content.contains('[ELIMINADO]') || 
                          analysis.content.contains('[PURGADO]') ||
                          !analysis.content.startsWith('http');

    return Scaffold(
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const MasterHeader(showBack: true),
              const SizedBox(height: 32),
              const Text('REPORTE_TÉCNICO', style: TextStyle(fontSize: 24, fontWeight: FontWeight.w900, fontStyle: FontStyle.italic)),
              Text('ID DE OPERACIÓN: #${analysis.id.substring(analysis.id.length - 8).toUpperCase()}', style: const TextStyle(color: AppColors.textMuted, fontSize: 10, fontWeight: FontWeight.w800, letterSpacing: 1)),
              const SizedBox(height: 30),

              // Visualización de Evidencia
              if (isPurged)
                _buildPurgedPlaceholder(isDark)
              else if (['imagen', 'audio', 'video'].contains(analysis.type))
                ClipRRect(
                  borderRadius: BorderRadius.circular(24),
                  child: EvidencePlayer(type: analysis.type, url: analysis.content, userPlan: userPlan),
                )
              else if (analysis.type == 'texto' || analysis.type == 'url')
                _buildTextContent(isDark)
              else
                _buildPurgedPlaceholder(isDark),

              const SizedBox(height: 32),
              _buildCircularScore(),
              const SizedBox(height: 32),
              
              _buildInfoCard('VEREDICTO_SISTEMA', analysis.details, LucideIcons.brainCircuit, isDark),
              const SizedBox(height: 16),
              
              if (analysis.criticalPoints.isNotEmpty)
                ...analysis.criticalPoints.map((p) => Padding(
                  padding: const EdgeInsets.only(bottom: 12),
                  child: _buildInfoCard(p.title.toUpperCase(), p.description, LucideIcons.target, isDark),
                )),
              
              const SizedBox(height: 24),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildPurgedPlaceholder(bool isDark) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(40),
      decoration: BoxDecoration(
        color: AppColors.getCard(isDark),
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: AppColors.getBorder(isDark), style: BorderStyle.solid),
      ),
      child: Column(
        children: [
          Icon(LucideIcons.fileX, size: 48, color: AppColors.accent.withOpacity(0.5)),
          const SizedBox(height: 20),
          const Text('ARCHIVO_PURGADO', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 14, letterSpacing: 2)),
          const SizedBox(height: 8),
          Text(
            'El rastro binario ha sido eliminado según el protocolo de retención de tu nivel de acceso.',
            textAlign: TextAlign.center,
            style: TextStyle(color: AppColors.textMuted, fontSize: 10, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 20),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            decoration: BoxDecoration(color: AppColors.getBg(isDark), borderRadius: BorderRadius.circular(12)),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(LucideIcons.file, size: 14, color: AppColors.textMuted),
                const SizedBox(width: 10),
                Text(
                  'EVIDENCIA.${_getExtension()}',
                  style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w900, color: AppColors.textMuted),
                ),
              ],
            ),
          )
        ],
      ),
    );
  }

  String _getExtension() {
    if (analysis.type == 'video') return 'MP4';
    if (analysis.type == 'audio') return 'MP3';
    if (analysis.type == 'imagen') return 'JPG';
    return 'TXT';
  }

  Widget _buildTextContent(bool isDark) {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: AppColors.getCard(isDark),
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: AppColors.getBorder(isDark)),
      ),
      child: Text(
        analysis.content,
        style: const TextStyle(fontStyle: FontStyle.italic, fontWeight: FontWeight.bold, fontSize: 13, height: 1.5),
      ),
    );
  }

  Widget _buildCircularScore() {
    final isSafe = analysis.aiProbability <= 50;
    return Center(
      child: Stack(
        alignment: Alignment.center,
        children: [
          SizedBox(
            width: 120, height: 120,
            child: CircularProgressIndicator(
              value: analysis.aiProbability / 100, 
              strokeWidth: 10, 
              backgroundColor: Colors.black12, 
              color: isSafe ? AppColors.safe : AppColors.accent
            ),
          ),
          Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text('${analysis.aiProbability.toInt()}%', style: const TextStyle(fontSize: 28, fontWeight: FontWeight.w900, fontStyle: FontStyle.italic)),
              const Text('IA CONFID.', style: TextStyle(fontSize: 7, fontWeight: FontWeight.w900, color: AppColors.textMuted, letterSpacing: 1)),
            ],
          )
        ],
      ),
    );
  }

  Widget _buildInfoCard(String title, String desc, IconData icon, bool isDark) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: AppColors.getCard(isDark),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppColors.getBorder(isDark)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, color: AppColors.accent, size: 14),
              const SizedBox(width: 10),
              Text(title, style: const TextStyle(fontSize: 9, fontWeight: FontWeight.w900, letterSpacing: 1)),
            ],
          ),
          const SizedBox(height: 12),
          Text(
            desc,
            style: const TextStyle(fontSize: 11, color: AppColors.textMuted, fontWeight: FontWeight.w700, height: 1.4),
          ),
        ],
      ),
    );
  }
}
