import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:provider/provider.dart';
import 'package:another_telephony/telephony.dart';
import '../core/theme.dart';
import '../providers/auth_provider.dart';
import '../models/analysis.dart';
import '../services/sms_monitor_service.dart';

class _Item {
  final SmsMessage msg;
  final AnalysisResult? res;
  _Item(this.msg, this.res);
}

class SmsMonitorScreen extends StatefulWidget {
  const SmsMonitorScreen({super.key});

  @override
  State<SmsMonitorScreen> createState() => _SmsMonitorScreenState();
}

class _SmsMonitorScreenState extends State<SmsMonitorScreen> {
  bool _active = false;
  bool _busy = false;
  final List<_Item> _feed = [];

  @override
  void initState() {
    super.initState();
    _active = SmsMonitorService.isStarted;
    SmsMonitorService.onAnalyzed = (msg, res) {
      print('[SMS-MON] (PANTALLA) onAnalyzed recibido: ${msg.address} -> prob=${res?.aiProbability} ${res?.veredicto}');
      if (mounted) setState(() => _feed.insert(0, _Item(msg, res)));
    };
  }

  @override
  void dispose() {
    SmsMonitorService.onAnalyzed = null;
    super.dispose();
  }

  Future<void> _activate() async {
    print('[SMS-MON] (PANTALLA) usuario tocó ACTIVAR MONITOREO');
    setState(() => _busy = true);
    final ok = await SmsMonitorService.requestPermissions();
    if (!mounted) return;
    setState(() => _busy = false);
    print('[SMS-MON] (PANTALLA) permisos => $ok');
    if (!ok) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('PERMISO DE SMS DENEGADO. ACTÍVALO EN AJUSTES.')),
      );
      return;
    }
    SmsMonitorService.start();
    print('[SMS-MON] (PANTALLA) start() ejecutado, isStarted=${SmsMonitorService.isStarted}');
    setState(() => _active = true);
  }

  Future<void> _testUltimo() async {
    print('[SMS-MON] (PANTALLA) usuario tocó ANALIZAR ÚLTIMO SMS');
    setState(() => _busy = true);
    final m = await SmsMonitorService.analizarUltimoDeBandeja();
    if (!mounted) return;
    setState(() => _busy = false);
    if (m == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('NO SE PUDO LEER LA BANDEJA (revisá el permiso de SMS).')),
      );
    }
  }

  Color _riskColor(AnalysisResult? res) {
    if (res == null) return AppColors.textMuted;
    final p = res.aiProbability;
    if (p >= 60) return AppColors.accent;
    if (p >= 30) return Colors.orange;
    return AppColors.safe;
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Provider.of<AuthProvider>(context).isDarkMode;
    return Scaffold(
      backgroundColor: AppColors.getBg(isDark),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  GestureDetector(
                    onTap: () => Navigator.pop(context),
                    child: const Icon(LucideIcons.arrowLeft, size: 24),
                  ),
                  const SizedBox(width: 16),
                  const Text('MONITOREO_SMS',
                      style: TextStyle(fontSize: 22, fontWeight: FontWeight.w900, fontStyle: FontStyle.italic)),
                ],
              ),
              const SizedBox(height: 4),
              const Text('VIGILANCIA DE SMS ENTRANTES (SOLO ANDROID)',
                  style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: AppColors.textMuted, letterSpacing: 1)),
              const SizedBox(height: 20),

              // Tarjeta de estado / activacion
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: AppColors.getCard(isDark),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: _active ? AppColors.safe : AppColors.getBorder(isDark)),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Icon(_active ? LucideIcons.shieldCheck : LucideIcons.shieldAlert,
                            size: 20, color: _active ? AppColors.safe : AppColors.accent),
                        const SizedBox(width: 10),
                        Text(_active ? 'MONITOREO ACTIVO' : 'MONITOREO INACTIVO',
                            style: TextStyle(fontWeight: FontWeight.w900, fontSize: 14,
                                color: _active ? AppColors.safe : null)),
                      ],
                    ),
                    const SizedBox(height: 10),
                    Text(
                      _active
                          ? 'Cada SMS de un número desconocido se analiza automáticamente. Te avisamos si parece fraude.'
                          : 'Activa la vigilancia para analizar los SMS entrantes. Requiere permiso de lectura de SMS.',
                      style: const TextStyle(fontSize: 12, color: AppColors.textMuted, height: 1.4),
                    ),
                    if (!_active) ...[
                      const SizedBox(height: 16),
                      SizedBox(
                        width: double.infinity,
                        child: ElevatedButton(
                          onPressed: _busy ? null : _activate,
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppColors.accent,
                            padding: const EdgeInsets.symmetric(vertical: 16),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                          ),
                          child: _busy
                              ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                              : const Text('ACTIVAR MONITOREO',
                                  style: TextStyle(color: Colors.white, fontWeight: FontWeight.w900, letterSpacing: 1)),
                        ),
                      ),
                    ],
                  ],
                ),
              ),
              if (_active) ...[
                const SizedBox(height: 12),
                SizedBox(
                  width: double.infinity,
                  child: OutlinedButton.icon(
                    onPressed: _busy ? null : _testUltimo,
                    icon: const Icon(LucideIcons.messageSquare, size: 16, color: AppColors.accent),
                    label: const Text('ANALIZAR ÚLTIMO SMS RECIBIDO',
                        style: TextStyle(color: AppColors.accent, fontWeight: FontWeight.w900, fontSize: 11, letterSpacing: 0.5)),
                    style: OutlinedButton.styleFrom(
                      side: const BorderSide(color: AppColors.accent),
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                    ),
                  ),
                ),
              ],
              const SizedBox(height: 24),
              const Text('ENTRANTES ANALIZADOS',
                  style: TextStyle(fontSize: 11, fontWeight: FontWeight.w900, color: AppColors.textMuted, letterSpacing: 1)),
              const SizedBox(height: 12),
              Expanded(
                child: _feed.isEmpty
                    ? Center(
                        child: Text(
                          _active ? 'Esperando SMS entrantes...' : 'Sin actividad',
                          style: const TextStyle(color: AppColors.textMuted, fontSize: 13, fontWeight: FontWeight.bold),
                        ),
                      )
                    : ListView.separated(
                        itemCount: _feed.length,
                        separatorBuilder: (_, __) => const SizedBox(height: 10),
                        itemBuilder: (_, i) {
                          final item = _feed[i];
                          final color = _riskColor(item.res);
                          final pct = item.res != null ? '${item.res!.aiProbability.toInt()}%' : '—';
                          final verd = item.res?.veredicto ?? 'NO ANALIZADO';
                          return Container(
                            padding: const EdgeInsets.all(16),
                            decoration: BoxDecoration(
                              color: AppColors.getCard(isDark),
                              borderRadius: BorderRadius.circular(16),
                              border: Border.all(color: AppColors.getBorder(isDark)),
                            ),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  children: [
                                    Expanded(
                                      child: Text(item.msg.address ?? 'Desconocido',
                                          style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 13)),
                                    ),
                                    Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                      decoration: BoxDecoration(
                                        color: color.withOpacity(0.15),
                                        borderRadius: BorderRadius.circular(20),
                                      ),
                                      child: Text('$pct · $verd',
                                          style: TextStyle(color: color, fontWeight: FontWeight.w900, fontSize: 10)),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 6),
                                Text(item.msg.body ?? '',
                                    maxLines: 3,
                                    overflow: TextOverflow.ellipsis,
                                    style: const TextStyle(fontSize: 12, color: AppColors.textMuted, height: 1.3)),
                              ],
                            ),
                          );
                        },
                      ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
