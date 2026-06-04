import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class AppColors {
  // Global
  static const Color accent = Color(0xFFFF0055);
  static const Color accentGlow = Color(0x1AFF0055);
  static const Color safe = Color(0xFF10B981);
  static const Color safeGlow = Color(0x1A10B981);
  static const Color textMuted = Color(0xFF94A3B8);

  // Dark Mode
  static const Color bgDark = Color(0xFF09090B);
  static const Color cardDark = Color(0xFF18181B);
  static const Color borderDark = Color(0xFF27272A);
  static const Color textMainDark = Colors.white;

  // Light Mode
  static const Color bgLight = Color(0xFFF4F4F5);
  static const Color cardLight = Color(0xFFFFFFFF);
  static const Color borderLight = Color(0xFFE4E4E7);
  static const Color textMainLight = Color(0xFF09090B);

  static Color getBg(bool isDark) => isDark ? bgDark : bgLight;
  static Color getCard(bool isDark) => isDark ? cardDark : cardLight;
  static Color getBorder(bool isDark) => isDark ? borderDark : borderLight;
  static Color getText(bool isDark) => isDark ? textMainDark : textMainLight;
}

class AppTheme {
  static ThemeData theme(bool isDark) {
    return ThemeData(
      useMaterial3: true,
      brightness: isDark ? Brightness.dark : Brightness.light,
      scaffoldBackgroundColor: AppColors.getBg(isDark),
      colorScheme: ColorScheme(
        brightness: isDark ? Brightness.dark : Brightness.light,
        primary: AppColors.accent,
        onPrimary: Colors.white,
        secondary: AppColors.accent,
        onSecondary: Colors.white,
        error: Colors.red,
        onError: Colors.white,
        background: AppColors.getBg(isDark),
        onBackground: AppColors.getText(isDark),
        surface: AppColors.getCard(isDark),
        onSurface: AppColors.getText(isDark),
      ),
      textTheme: GoogleFonts.interTextTheme().apply(
        bodyColor: AppColors.getText(isDark),
        displayColor: AppColors.getText(isDark),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: AppColors.accent,
          foregroundColor: Colors.white,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          padding: const EdgeInsets.symmetric(vertical: 18),
          textStyle: const TextStyle(fontWeight: FontWeight.w900, letterSpacing: 2, fontSize: 12),
          elevation: 0,
        ),
      ),
    );
  }

  static const Color bg = AppColors.bgDark;
  static const Color card = AppColors.cardDark;
  static const Color border = AppColors.borderDark;
}
