import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../core/theme.dart';

import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';

class BottomNavBar extends StatelessWidget {
  final int currentIndex;
  final Function(int) onTap;

  const BottomNavBar({
    super.key,
    required this.currentIndex,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final auth = Provider.of<AuthProvider>(context);
    final isAdmin = auth.isAdmin;
    final isDark = auth.isDarkMode;

    return Container(
      height: 85,
      padding: const EdgeInsets.only(bottom: 20),
      decoration: BoxDecoration(
        color: AppColors.getCard(isDark).withOpacity(0.9),
        border: Border(top: BorderSide(color: AppColors.getBorder(isDark))),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceAround,
        children: isAdmin ? [
          _buildNavItem(0, LucideIcons.layoutGrid, 'Terminal'),
          _buildNavItem(1, LucideIcons.shieldCheck, 'Central'),
          _buildNavItem(2, LucideIcons.barChart3, 'Finanzas'),
          _buildNavItem(3, LucideIcons.settings2, 'Config'),
          _buildNavItem(4, LucideIcons.user, 'Perfil'),
        ] : [
          _buildNavItem(0, LucideIcons.layoutGrid, 'Terminal'),
          _buildNavItem(1, LucideIcons.history, 'Archivo'),
          _buildNavItem(2, LucideIcons.creditCard, 'Planes'),
          _buildNavItem(3, LucideIcons.user, 'Perfil'),
        ],
      ),
    );
  }

  Widget _buildNavItem(int index, IconData icon, String label) {
    final isActive = currentIndex == index;
    return GestureDetector(
      onTap: () => onTap(index),
      behavior: HitTestBehavior.opaque,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            icon,
            size: 24,
            color: isActive ? AppColors.accent : AppColors.textMuted,
          ),
          const SizedBox(height: 4),
          Text(
            label,
            style: TextStyle(
              fontSize: 10,
              fontWeight: FontWeight.w800,
              color: isActive ? AppColors.accent : AppColors.textMuted,
              textBaseline: TextBaseline.alphabetic,
            ),
          ),
        ],
      ),
    );
  }
}
