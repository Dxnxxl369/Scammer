import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:provider/provider.dart';
import '../core/theme.dart';
import '../providers/auth_provider.dart';
import '../services/api_service.dart';
import '../widgets/master_header.dart';

class AdminUsersScreen extends StatefulWidget {
  const AdminUsersScreen({super.key});

  @override
  State<AdminUsersScreen> createState() => _AdminUsersScreenState();
}

class _AdminUsersScreenState extends State<AdminUsersScreen> {
  bool _isLoading = true;
  List<dynamic> _users = [];
  String _searchQuery = "";

  @override
  void initState() {
    super.initState();
    _fetchUsers();
  }

  Future<void> _fetchUsers() async {
    setState(() => _isLoading = true);
    try {
      final response = await ApiService.get('/admin/usuarios/?busqueda=$_searchQuery');
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        setState(() {
          _users = data['datos']['usuarios'] ?? [];
          _isLoading = false;
        });
      }
    } catch (e) {
      print("Admin Users Error: $e");
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Provider.of<AuthProvider>(context).isDarkMode;

    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const MasterHeader(showBack: true),
              const SizedBox(height: 32),
              const Text('GESTIÓN_AGENTES', style: TextStyle(fontSize: 24, fontWeight: FontWeight.w900, fontStyle: FontStyle.italic)),
              const Text('BASE DE DATOS OPERATIVA DE INVESTIGADORES', style: TextStyle(color: AppColors.textMuted, fontSize: 10, fontWeight: FontWeight.w800, letterSpacing: 2)),
              const SizedBox(height: 30),
              
              _buildSearchBar(isDark),
              const SizedBox(height: 20),

              Expanded(
                child: _isLoading 
                  ? const Center(child: CircularProgressIndicator())
                  : _users.isEmpty 
                    ? const Center(child: Text('NO SE ENCONTRARON AGENTES'))
                    : ListView.builder(
                        itemCount: _users.length,
                        physics: const BouncingScrollPhysics(),
                        itemBuilder: (context, index) => _buildUserCard(_users[index], isDark),
                      ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildSearchBar(bool isDark) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      decoration: BoxDecoration(
        color: AppColors.getCard(isDark),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.getBorder(isDark)),
      ),
      child: TextField(
        style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold),
        onChanged: (val) {
          _searchQuery = val;
          _fetchUsers();
        },
        decoration: const InputDecoration(
          icon: Icon(LucideIcons.search, size: 16, color: AppColors.textMuted),
          hintText: 'BUSCAR POR NOMBRE O CORREO...',
          hintStyle: TextStyle(fontSize: 10, fontWeight: FontWeight.w900, color: AppColors.textMuted),
          border: InputBorder.none,
        ),
      ),
    );
  }

  Widget _buildUserCard(dynamic user, bool isDark) {
    final String plan = user['plan'] ?? 'gratis';
    final bool isBlocked = user['bloqueado'] ?? false;
    final bool isAdmin = user['rol'] == 'administrador';

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.getCard(isDark),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: isBlocked ? Colors.red.withOpacity(0.3) : AppColors.getBorder(isDark)),
      ),
      child: Row(
        children: [
          Container(
            width: 40, height: 40,
            decoration: BoxDecoration(
              color: isAdmin ? Colors.amber.withOpacity(0.1) : AppColors.accent.withOpacity(0.1),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(
              isAdmin ? LucideIcons.shieldCheck : LucideIcons.user,
              color: isAdmin ? Colors.amber : AppColors.accent,
              size: 20,
            ),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  (user['nombre_usuario'] ?? 'Agente').toString().toUpperCase(), 
                  style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w900)
                ),
                Text(
                  user['correo'] ?? '', 
                  style: const TextStyle(fontSize: 9, color: AppColors.textMuted, fontWeight: FontWeight.bold)
                ),
                const SizedBox(height: 4),
                Row(
                  children: [
                    _buildTinyBadge(plan.toUpperCase(), _getPlanColor(plan)),
                    if (isBlocked) ...[
                      const SizedBox(width: 4),
                      _buildTinyBadge('BLOQUEADO', Colors.red),
                    ],
                  ],
                )
              ],
            ),
          ),
          IconButton(
            icon: const Icon(LucideIcons.moreVertical, size: 18, color: AppColors.textMuted),
            onPressed: () => _showUserActions(user),
          )
        ],
      ),
    );
  }

  Widget _buildTinyBadge(String label, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(4),
        border: Border.all(color: color.withOpacity(0.3)),
      ),
      child: Text(
        label, 
        style: TextStyle(fontSize: 7, fontWeight: FontWeight.w900, color: color)
      ),
    );
  }

  Color _getPlanColor(String plan) {
    switch (plan.toLowerCase()) {
      case 'starter': return Colors.blue;
      case 'pro': return AppColors.accent;
      case 'elite': return Colors.amber;
      default: return AppColors.textMuted;
    }
  }

  void _showUserActions(dynamic user) {
    final bool isBlocked = user['bloqueado'] ?? false;
    
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (context) => Container(
        padding: const EdgeInsets.all(24),
        decoration: BoxDecoration(
          color: AppColors.getCard(Provider.of<AuthProvider>(context, listen: false).isDarkMode),
          borderRadius: const BorderRadius.vertical(top: Radius.circular(32)),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              'PROTOCOLO: ${user['nombre_usuario'].toString().toUpperCase()}', 
              style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 14, fontStyle: FontStyle.italic)
            ),
            const SizedBox(height: 24),
            _buildActionItem(
              isBlocked ? LucideIcons.unlock : LucideIcons.lock, 
              isBlocked ? 'DESBLOQUEAR ACCESO' : 'BLOQUEAR AGENTE',
              isBlocked ? AppColors.safe : Colors.red,
              () async {
                final action = isBlocked ? 'desbloquear' : 'bloquear';
                await ApiService.post('/admin/usuarios/${user['id_supabase']}/$action/', {});
                Navigator.pop(context);
                _fetchUsers();
              }
            ),
            const SizedBox(height: 12),
            _buildActionItem(
              LucideIcons.shieldAlert, 
              'CAMBIAR RANGO',
              Colors.blue,
              () {
                Navigator.pop(context);
                _showPlanDialog(user);
              }
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildActionItem(IconData icon, String label, Color color, VoidCallback onTap) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          border: Border.all(color: color.withOpacity(0.2)),
          borderRadius: BorderRadius.circular(16),
        ),
        child: Row(
          children: [
            Icon(icon, color: color, size: 20),
            const SizedBox(width: 16),
            Text(label, style: TextStyle(color: color, fontWeight: FontWeight.w900, fontSize: 10, letterSpacing: 1)),
          ],
        ),
      ),
    );
  }

  void _showPlanDialog(dynamic user) {
    final plans = ['gratis', 'starter', 'pro', 'elite'];
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: AppColors.getCard(Provider.of<AuthProvider>(context, listen: false).isDarkMode),
        title: const Text('ASIGNAR NUEVO RANGO', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w900)),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: plans.map((p) => ListTile(
            title: Text(p.toUpperCase(), style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: _getPlanColor(p))),
            onTap: () async {
              await ApiService.post('/admin/usuarios/${user['id_supabase']}/plan/', {'plan': p});
              if (mounted) {
                Navigator.pop(context);
                _fetchUsers();
              }
            },
          )).toList(),
        ),
      ),
    );
  }
}
