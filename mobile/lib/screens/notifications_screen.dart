import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:provider/provider.dart';
import '../core/theme.dart';
import '../providers/auth_provider.dart';
import '../services/api_service.dart';
import '../widgets/master_header.dart';
import 'analysis_detail_screen.dart';
import '../models/analysis.dart';

class NotificationsScreen extends StatefulWidget {
  const NotificationsScreen({super.key});

  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> {
  bool _isLoading = true;
  List<dynamic> _notifications = [];

  @override
  void initState() {
    super.initState();
    _fetchNotifications();
  }

  Future<void> _fetchNotifications() async {
    try {
      final response = await ApiService.get('/analisis/notificaciones/');
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        setState(() {
          _notifications = data['datos'] ?? [];
          _isLoading = false;
        });
      }
    } catch (e) {
      print("Fetch Notifications Error: $e");
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = Provider.of<AuthProvider>(context);
    final isDark = auth.isDarkMode;

    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const MasterHeader(showBack: true),
              const SizedBox(height: 32),
              const Text('CENTRO_ALERTA', style: TextStyle(fontSize: 24, fontWeight: FontWeight.w900, fontStyle: FontStyle.italic)),
              const Text('TRANSMISIONES Y NOTIFICACIONES DEL SISTEMA', style: TextStyle(color: AppColors.textMuted, fontSize: 10, fontWeight: FontWeight.w800, letterSpacing: 2)),
              const SizedBox(height: 30),
              
              Expanded(
                child: _isLoading 
                  ? const Center(child: CircularProgressIndicator())
                  : _notifications.isEmpty 
                    ? _buildEmptyState()
                    : ListView.builder(
                        itemCount: _notifications.length,
                        physics: const BouncingScrollPhysics(),
                        itemBuilder: (context, index) => _buildNotificationItem(_notifications[index], isDark),
                      ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(LucideIcons.bellOff, size: 48, color: AppColors.textMuted.withOpacity(0.2)),
          const SizedBox(height: 16),
          const Text('SIN TRANSMISIONES PENDIENTES', style: TextStyle(fontWeight: FontWeight.w900, color: AppColors.textMuted, fontSize: 10, letterSpacing: 1)),
        ],
      ),
    );
  }

  Widget _buildNotificationItem(dynamic n, bool isDark) {
    final bool isRead = n['leida'] ?? false;
    final String tipo = n['tipo'] ?? 'info';
    final String? analisisId = n['analisis_id'];
    
    Color iconColor = AppColors.accent;
    IconData icon = LucideIcons.bell;

    if (tipo == 'analisis') {
      iconColor = Colors.cyan;
      icon = LucideIcons.scan;
    } else if (tipo == 'sistema') {
      iconColor = Colors.amber;
      icon = LucideIcons.shieldCheck;
    }

    return InkWell(
      onTap: () async {
        if (!isRead) {
          // Actualizar UI instantáneamente mutando el mapa local
          setState(() {
            n['leida'] = true;
          });
          // Notificar al backend en segundo plano (fire-and-forget, sin romper en el error path)
          () async {
            try {
              await ApiService.patch('/analisis/notificaciones/${n['id']}/leida/', {});
            } catch (e) {
              print('Error marcando leída: $e');
            }
          }();
        }
        
        if (analisisId != null && analisisId.isNotEmpty) {
          // Obtener el análisis completo para navegar al detalle
          try {
            final res = await ApiService.get('/analisis/historial/');
            if (res.statusCode == 200) {
              final data = jsonDecode(res.body);
              final List historial = data['datos'] ?? [];
              final item = historial.firstWhere((element) => element['id'] == analisisId, orElse: () => null);
              if (item != null && mounted) {
                Navigator.push(
                  context, 
                  MaterialPageRoute(builder: (context) => AnalysisDetailScreen(analysis: AnalysisResult.fromJson(item)))
                );
              }
            }
          } catch (e) {
            print("Error navegando desde notif: $e");
          }
        }
      },
      borderRadius: BorderRadius.circular(16),
      child: Container(
        margin: const EdgeInsets.only(bottom: 12),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: isRead ? AppColors.getCard(isDark).withOpacity(0.5) : AppColors.getCard(isDark),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: isRead ? AppColors.getBorder(isDark).withOpacity(0.5) : AppColors.accent.withOpacity(0.3)),
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(color: iconColor.withOpacity(0.1), borderRadius: BorderRadius.circular(12)),
              child: Icon(icon, color: iconColor, size: 18),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(n['titulo'] ?? 'ALERTA', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 11, color: isRead ? AppColors.textMuted : AppColors.getText(isDark))),
                  const SizedBox(height: 4),
                  Text(n['mensaje'] ?? '', style: TextStyle(color: AppColors.textMuted, fontSize: 10, fontWeight: FontWeight.w600)),
                  const SizedBox(height: 8),
                  Text(n['fecha'] ?? '', style: const TextStyle(color: AppColors.textMuted, fontSize: 8, fontWeight: FontWeight.bold, fontStyle: FontStyle.italic)),
                ],
              ),
            ),
            if (!isRead)
              Container(
                width: 8, height: 8,
                decoration: const BoxDecoration(color: AppColors.accent, shape: BoxShape.circle),
              )
          ],
        ),
      ),
    );
  }
}
