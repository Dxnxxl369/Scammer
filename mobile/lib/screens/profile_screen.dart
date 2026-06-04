import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:provider/provider.dart';
import '../core/theme.dart';
import '../providers/auth_provider.dart';
import '../widgets/bottom_nav.dart';
import '../widgets/master_header.dart';
import 'dashboard_screen.dart';
import 'history_screen.dart';
import 'plans_screen.dart';
import 'notifications_screen.dart';

class ProfileScreen extends StatelessWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final auth = Provider.of<AuthProvider>(context);
    final user = auth.user;
    final isDark = auth.isDarkMode;
    final isAdmin = auth.isAdmin;

    return Scaffold(
      bottomNavigationBar: BottomNavBar(
        currentIndex: isAdmin ? 4 : 3,
        onTap: (index) {
          if (isAdmin) {
            if (index == 0) Navigator.pushReplacementNamed(context, '/dashboard');
            if (index == 1) Navigator.pushReplacementNamed(context, '/admin');
            if (index == 2) Navigator.pushReplacementNamed(context, '/admin_finance');
            if (index == 3) Navigator.pushReplacementNamed(context, '/admin_settings');
          } else {
            if (index == 0) Navigator.pushReplacementNamed(context, '/dashboard');
            if (index == 1) Navigator.pushReplacementNamed(context, '/history');
            if (index == 2) Navigator.pushReplacementNamed(context, '/plans');
          }
        },
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const MasterHeader(),
              const SizedBox(height: 32),
              const Text('PERFIL_AGENTE', style: TextStyle(fontSize: 24, fontWeight: FontWeight.w900, fontStyle: FontStyle.italic)),
              const Text('IDENTIDAD Y PROTOCOLOS DE ACCESO', style: TextStyle(color: AppColors.textMuted, fontSize: 10, fontWeight: FontWeight.w800, letterSpacing: 2)),
              const SizedBox(height: 40),
              
              Center(
                child: Column(
                  children: [
                    Container(
                      width: 100, height: 100,
                      decoration: const BoxDecoration(color: AppColors.accent, shape: BoxShape.circle),
                      child: Center(child: Text(user?.username[0].toUpperCase() ?? '?', style: const TextStyle(fontSize: 40, fontWeight: FontWeight.w900, color: Colors.white))),
                    ),
                    const SizedBox(height: 16),
                    Text(user?.username.toUpperCase() ?? 'AGENTE', style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w900)),
                    Text(user?.email ?? '', style: const TextStyle(color: AppColors.textMuted, fontWeight: FontWeight.bold, fontSize: 12)),
                    const SizedBox(height: 8),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
                      decoration: BoxDecoration(color: AppColors.accent.withOpacity(0.1), borderRadius: BorderRadius.circular(20), border: Border.all(color: AppColors.accent.withOpacity(0.3))),
                      child: Text('RANGO: ${user?.plan.toUpperCase() ?? 'GRATIS'}', style: const TextStyle(color: AppColors.accent, fontWeight: FontWeight.w900, fontSize: 10, letterSpacing: 1)),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 40),
              const Text('ESTADÍSTICAS DE CONSUMO', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w900, letterSpacing: 2, color: AppColors.textMuted)),
              const SizedBox(height: 16),
              
              Row(
                children: [
                  Expanded(child: _buildStatCard('Análisis Livianos', '${user?.intentosLivianos ?? 0}', LucideIcons.fileText, Colors.blue, isDark)),
                  const SizedBox(width: 16),
                  Expanded(child: _buildStatCard('Análisis Pesados', '${user?.intentosPesados ?? 0}', LucideIcons.video, AppColors.accent, isDark)),
                ],
              ),

              const SizedBox(height: 40),
              const Text('HERRAMIENTAS Y TRANSMISIONES', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w900, letterSpacing: 2, color: AppColors.textMuted)),
              const SizedBox(height: 16),

              _buildOptionTile(
                icon: LucideIcons.bell,
                title: 'CENTRO DE ALERTAS',
                color: Colors.amber,
                onTap: () => Navigator.pushNamed(context, '/notifications'),
                isDark: isDark,
              ),
              const SizedBox(height: 12),

              if (isAdmin) ...[
                _buildOptionTile(
                  icon: LucideIcons.scan,
                  title: 'TERMINAL FORENSE',
                  color: AppColors.accent,
                  onTap: () => Navigator.push(context, MaterialPageRoute(builder: (context) => const DashboardScreen())),
                  isDark: isDark,
                ),
                const SizedBox(height: 12),
                _buildOptionTile(
                  icon: LucideIcons.history,
                  title: 'MI HISTORIAL PERSONAL',
                  color: Colors.cyan,
                  onTap: () => Navigator.push(context, MaterialPageRoute(builder: (context) => const HistoryScreen(fromProfile: true))),
                  isDark: isDark,
                ),
                const SizedBox(height: 12),
                _buildOptionTile(
                  icon: LucideIcons.creditCard,
                  title: 'GESTIONAR MI PLAN',
                  color: AppColors.safe,
                  onTap: () => Navigator.push(context, MaterialPageRoute(builder: (context) => const PlansScreen(fromProfile: true))),
                  isDark: isDark,
                ),
                const SizedBox(height: 12),
              ],

              _buildOptionTile(
                icon: LucideIcons.logOut,
                title: 'CERRAR SESIÓN FORENSE',
                color: AppColors.accent,
                onTap: () {
                  auth.logout();
                  Navigator.pushReplacementNamed(context, '/login');
                },
                isDark: isDark,
              ),
              const SizedBox(height: 24),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildStatCard(String title, String val, IconData icon, Color color, bool isDark) {
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
          Icon(icon, color: color, size: 20),
          const SizedBox(height: 16),
          Text(val, style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w900)),
          Text(title.toUpperCase(), style: const TextStyle(fontSize: 8, color: AppColors.textMuted, fontWeight: FontWeight.w900, letterSpacing: 1)),
        ],
      ),
    );
  }

  Widget _buildOptionTile({required IconData icon, required String title, required Color color, required VoidCallback onTap, required bool isDark}) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(20),
      child: Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: AppColors.getCard(isDark),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: AppColors.getBorder(isDark)),
        ),
        child: Row(
          children: [
            Icon(icon, color: color, size: 20),
            const SizedBox(width: 16),
            Text(title, style: TextStyle(color: color, fontWeight: FontWeight.w900, fontSize: 12, letterSpacing: 1)),
            const Spacer(),
            Icon(LucideIcons.chevronRight, size: 16, color: color.withOpacity(0.5)),
          ],
        ),
      ),
    );
  }
}
