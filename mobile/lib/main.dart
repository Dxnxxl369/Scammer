import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'core/theme.dart';
import 'providers/auth_provider.dart';
import 'screens/login_screen.dart';
import 'screens/dashboard_screen.dart';
import 'screens/history_screen.dart';
import 'screens/plans_screen.dart';
import 'screens/admin_dashboard.dart';
import 'screens/profile_screen.dart';
import 'screens/admin_finance_screen.dart';
import 'screens/admin_settings_screen.dart';
import 'screens/notifications_screen.dart';
import 'screens/analysis_detail_screen.dart';
import 'screens/admin_users_screen.dart';
import 'screens/sms_monitor_screen.dart';
import 'models/analysis.dart';
import 'services/firebase_service.dart';
import 'services/api_service.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  print('════════════════ SCAMMER MOVIL ════════════════');
  print('[API] Backend en uso => ${ApiService.baseUrl}');
  print('════════════════════════════════════════════════');
  await FirebaseService.initialize();
  // Cargar el tema guardado antes de iniciar la app
  runApp(
    MultiProvider(

      providers: [
        ChangeNotifierProvider(create: (_) => AuthProvider()),
      ],
      child: const ScammerApp(),
    ),
  );
}

class ScammerApp extends StatelessWidget {



  const ScammerApp({super.key});

  @override
  Widget build(BuildContext context) {
    final auth = Provider.of<AuthProvider>(context);

    return MaterialApp(
      title: 'Scammer IA Mobile',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.theme(auth.isDarkMode),
      home: (auth.isLoading && auth.user == null)
        ? const Scaffold(body: Center(child: CircularProgressIndicator()))
        : (auth.user == null ? const LoginScreen() : const DashboardScreen()),
      routes: {
        '/login': (context) => const LoginScreen(),
        '/dashboard': (context) => const DashboardScreen(),
        '/history': (context) => const HistoryScreen(),
        '/plans': (context) => const PlansScreen(),
        '/admin': (context) => const AdminDashboard(),
        '/profile': (context) => const ProfileScreen(),
        '/admin_finance': (context) => const AdminFinanceScreen(),
        '/admin_settings': (context) => const AdminSettingsScreen(),
        '/notifications': (context) => const NotificationsScreen(),
        '/analysis_detail': (context) => AnalysisDetailScreen(analysis: ModalRoute.of(context)!.settings.arguments as AnalysisResult),
        '/admin_users': (context) => const AdminUsersScreen(),
        '/sms_monitor': (context) => const SmsMonitorScreen(),
      
      },
    );
  }
}
