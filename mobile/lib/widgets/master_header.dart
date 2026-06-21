import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:provider/provider.dart';
import '../core/theme.dart';
import '../providers/auth_provider.dart';

class MasterHeader extends StatelessWidget {
  final bool showBack;

  const MasterHeader({super.key, this.showBack = false});

  @override
  Widget build(BuildContext context) {
    final auth = Provider.of<AuthProvider>(context);
    final isDark = auth.isDarkMode;

    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        if (showBack)
          IconButton(
            icon: const Icon(LucideIcons.arrowLeft, size: 20),
            onPressed: () => Navigator.maybePop(context),
            padding: EdgeInsets.zero,
            constraints: const BoxConstraints(),
          )
        else
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            decoration: BoxDecoration(
              color: AppColors.getCard(isDark),
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: AppColors.getBorder(isDark)),
            ),
            child: Row(
              children: [
                Container(
                  width: 16, height: 16,
                  decoration: const BoxDecoration(color: AppColors.accent, shape: BoxShape.circle),
                  child: Center(child: Text(auth.user?.username[0].toUpperCase() ?? '?', style: const TextStyle(fontSize: 8, fontWeight: FontWeight.bold, color: Colors.white))),
                ),
                const SizedBox(width: 8),
                Text(auth.user?.username.toUpperCase() ?? 'AGENTE', style: const TextStyle(fontSize: 8, fontWeight: FontWeight.w900, letterSpacing: 0.5)),
              ],
            ),
          ),
        Row(
          children: [
            IconButton(
              icon: Icon(isDark ? LucideIcons.sun : LucideIcons.moon, size: 20),
              onPressed: () => auth.toggleTheme(),
              padding: const EdgeInsets.symmetric(horizontal: 12),
              constraints: const BoxConstraints(),
            ),
            IconButton(
              icon: const Icon(LucideIcons.bell, size: 20),
              onPressed: () => Navigator.pushNamed(context, '/notifications'),
              padding: const EdgeInsets.only(right: 12),
              constraints: const BoxConstraints(),
            ),
          ],
        )
      ],
    );
  }
}
