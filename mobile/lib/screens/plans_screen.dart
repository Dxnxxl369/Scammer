import 'package:flutter/material.dart';
import 'dart:convert';
import 'package:url_launcher/url_launcher.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:provider/provider.dart';
import '../core/theme.dart';
import '../providers/auth_provider.dart';
import '../services/api_service.dart';
import '../widgets/bottom_nav.dart';
import 'package:mask_text_input_formatter/mask_text_input_formatter.dart';
import 'package:flutter/services.dart';
import '../widgets/master_header.dart';

class PlansScreen extends StatefulWidget {
  final bool fromProfile;
  const PlansScreen({super.key, this.fromProfile = false});

  @override
  State<PlansScreen> createState() => _PlansScreenState();
}

class _PlansScreenState extends State<PlansScreen> {
  bool _isUpdating = false;

  @override
  void initState() {
    super.initState();
    _cargarPlanesBackend();
  }

  // Trae precios y límites configurados por el admin y actualiza lo que se muestra.
  Future<void> _cargarPlanesBackend() async {
    try {
      final resp = await ApiService.get('/pagos/planes/');
      if (resp.statusCode != 200) return;
      final data = jsonDecode(resp.body);
      final lista = (data['datos'] as List?) ?? [];
      for (final item in lista) {
        final idx = _plans.indexWhere((p) => p['id'] == item['plan']);
        if (idx < 0) continue;
        final precio = item['precio'];
        if (precio != null) _plans[idx]['price'] = precio.toString();
        final liv = item['limite_livianos'];
        final pes = item['limite_pesados'];
        final feats = List<String>.from(_plans[idx]['features'] ?? const []);
        if (liv != null && feats.isNotEmpty) {
          feats[0] = (liv >= 999999) ? 'Livianos Ilimitados' : '$liv Análisis Livianos';
        }
        if (pes != null && feats.length > 1) {
          feats[1] = (pes >= 999999) ? 'Pesados Ilimitados' : '$pes Análisis Pesados';
        }
        _plans[idx]['features'] = feats;
      }
      if (mounted) setState(() {});
    } catch (_) {}
  }

  final List<Map<String, dynamic>> _plans = [
    {
      'id': 'gratis',
      'name': 'AGENTE_FREE',
      'price': '0',
      'color': AppColors.textMuted,
      'features': ['10 Análisis Livianos', '1 Análisis Pesado', 'Almacén por 2 Días'],
    },
    {
      'id': 'starter',
      'name': 'STARTER_KIT',
      'price': '9.99',
      'color': Colors.blue,
      'features': ['20 Análisis Livianos', '5 Análisis Pesados', 'Almacén por 7 Días'],
    },
    {
      'id': 'pro',
      'name': 'PRO_OPERATOR',
      'price': '19.99',
      'color': AppColors.accent,
      'features': ['Livianos Ilimitados', '50 Análisis Pesados', 'Almacén por 30 Días'],
    },
    {
      'id': 'elite',
      'name': 'ELITE_TERMINAL',
      'price': '49.99',
      'color': Colors.amber,
      'features': ['Todo Ilimitado', 'Retención Indefinida', 'Soporte Prioritario'],
    },
  ];

  int _getPlanWeight(String? planId) {
    switch (planId) {
      case 'gratis': return 0;
      case 'starter': return 1;
      case 'pro': return 2;
      case 'elite': return 3;
      default: return 0;
    }
  }

  // Inicia el pago real con Stripe: pide la URL de checkout al backend y la abre.
  // No se piden datos de tarjeta en la app (los pide la página segura de Stripe).
  Future<void> _iniciarPagoStripe(String planId) async {
    setState(() => _isUpdating = true);
    try {
      final response = await ApiService.post('/pagos/checkout/', {'plan': planId});
      final data = jsonDecode(response.body);
      final url = (data['datos'] is Map) ? data['datos']['url'] : null;
      if (response.statusCode == 200 && url != null) {
        final abierto = await launchUrl(Uri.parse(url), mode: LaunchMode.externalApplication);
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(SnackBar(
            content: Text(abierto
                ? 'Completá el pago en el navegador. Al volver, tu plan se actualiza solo.'
                : 'No se pudo abrir la página de pago. Probá de nuevo.'),
            duration: const Duration(seconds: 5),
          ));
        }
      } else {
        final msg = data['mensaje'] ?? data['error'] ?? 'No se pudo iniciar el pago';
        throw Exception(msg);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error al iniciar el pago: $e')),
        );
      }
    } finally {
      if (mounted) setState(() => _isUpdating = false);
    }
  }

  Future<void> _cancelarSuscripcion() async {
    final confirmar = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('¿Cancelar suscripción?'),
        content: const Text('Mantenés tu plan hasta el fin del período ya pagado. Después volvés al plan gratis.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('No')),
          TextButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Sí, cancelar')),
        ],
      ),
    );
    if (confirmar != true) return;

    setState(() => _isUpdating = true);
    try {
      final response = await ApiService.post('/pagos/cancelar/', {});
      final data = jsonDecode(response.body);
      final msg = data['mensaje'] ?? data['error'] ?? 'No se pudo cancelar';
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(msg), duration: const Duration(seconds: 5)),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error al cancelar: $e')),
        );
      }
    } finally {
      if (mounted) setState(() => _isUpdating = false);
    }
  }

  void _showSuccessDialog(String planId) {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => AlertDialog(
        backgroundColor: AppColors.getCard(Provider.of<AuthProvider>(context).isDarkMode),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(24),
          side: BorderSide(color: AppColors.safe.withOpacity(0.5)),
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const SizedBox(height: 20),
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(color: AppColors.safe.withOpacity(0.1), shape: BoxShape.circle),
              child: const Icon(LucideIcons.shieldCheck, color: AppColors.safe, size: 48),
            ),
            const SizedBox(height: 24),
            const Text('PAGO AUTORIZADO', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w900, fontStyle: FontStyle.italic)),
            const SizedBox(height: 12),
            Text(
              'Tu nivel de acceso ha sido elevado a ${planId.toUpperCase()} exitosamente. Los protocolos han sido sincronizados.',
              textAlign: TextAlign.center,
              style: const TextStyle(color: AppColors.textMuted, fontSize: 11, fontWeight: FontWeight.w600),
            ),
            const SizedBox(height: 32),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: () => Navigator.pop(context),
                style: ElevatedButton.styleFrom(backgroundColor: AppColors.safe),
                child: const Text('ENTENDIDO'),
              ),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final auth = Provider.of<AuthProvider>(context);
    final userPlan = auth.user?.plan ?? 'gratis';
    final userWeight = _getPlanWeight(userPlan);
    final isDark = auth.isDarkMode;
    final isAdmin = auth.isAdmin;

    return Scaffold(
      bottomNavigationBar: BottomNavBar(
        currentIndex: widget.fromProfile ? (isAdmin ? 4 : 3) : 2,
        onTap: (index) {
          if (widget.fromProfile) {
            Navigator.pop(context);
            return;
          }
          if (isAdmin) {
            if (index == 0) Navigator.pushReplacementNamed(context, '/dashboard');
            if (index == 1) Navigator.pushReplacementNamed(context, '/admin');
            if (index == 2) Navigator.pushReplacementNamed(context, '/admin_finance');
            if (index == 3) Navigator.pushReplacementNamed(context, '/admin_settings');
            if (index == 4) Navigator.pushReplacementNamed(context, '/profile');
          } else {
            if (index == 0) Navigator.pushReplacementNamed(context, '/dashboard');
            if (index == 1) Navigator.pushReplacementNamed(context, '/history');
            if (index == 2) return;
            if (index == 3) Navigator.pushReplacementNamed(context, '/profile');
          }
        },
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              MasterHeader(showBack: widget.fromProfile),
              const SizedBox(height: 32),
              const Text('NIVELES_ACCESO', style: TextStyle(fontSize: 24, fontWeight: FontWeight.w900, fontStyle: FontStyle.italic)),
              const Text('PROTOCOLO DE ELEVACIÓN DE PRIVILEGIOS', style: TextStyle(color: AppColors.textMuted, fontSize: 10, fontWeight: FontWeight.w800, letterSpacing: 2)),
              const SizedBox(height: 30),
              ..._plans.map((plan) {
                final planWeight = _getPlanWeight(plan['id']);
                final isCurrent = userPlan == plan['id'];
                
                String btnText = 'ELEVAR AHORA';
                if (isCurrent) btnText = 'NIVEL ACTUAL';
                else if (planWeight < userWeight) btnText = 'SUSCRIBIRSE';

                return _buildPlanCard(plan, isCurrent, isDark, btnText);
              }),
              if (userPlan != 'gratis') ...[
                const SizedBox(height: 8),
                Center(
                  child: TextButton(
                    onPressed: _isUpdating ? null : _cancelarSuscripcion,
                    child: const Text('CANCELAR SUSCRIPCIÓN',
                        style: TextStyle(color: AppColors.textMuted, fontSize: 11, fontWeight: FontWeight.bold, decoration: TextDecoration.underline)),
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildPlanCard(Map<String, dynamic> plan, bool isCurrent, bool isDark, String btnText) {
    return Container(
      margin: const EdgeInsets.only(bottom: 20),
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: AppColors.getCard(isDark),
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: isCurrent ? plan['color'] : AppColors.getBorder(isDark), width: isCurrent ? 2 : 1),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(plan['name'], style: TextStyle(fontSize: 16, fontWeight: FontWeight.w900, color: plan['color'])),
              if (isCurrent) Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(color: plan['color'], borderRadius: BorderRadius.circular(10)),
                child: const Text('ACTUAL', style: TextStyle(fontSize: 8, fontWeight: FontWeight.bold, color: Colors.white)),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Row(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text('\$${plan['price']}', style: const TextStyle(fontSize: 28, fontWeight: FontWeight.w900)),
              const Padding(
                padding: EdgeInsets.only(bottom: 6, left: 4),
                child: Text('/MES', style: TextStyle(color: AppColors.textMuted, fontWeight: FontWeight.bold, fontSize: 10)),
              ),
            ],
          ),
          const SizedBox(height: 16),
          ...plan['features'].map((f) => Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: Row(
              children: [
                Icon(LucideIcons.check, size: 14, color: plan['color']),
                const SizedBox(width: 12),
                Text(f, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600)),
              ],
            ),
          )),
          const SizedBox(height: 20),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: (isCurrent || _isUpdating) ? null : () => _iniciarPagoStripe(plan['id']),
              style: ElevatedButton.styleFrom(
                backgroundColor: isCurrent ? Colors.grey[800] : plan['color'],
                padding: const EdgeInsets.symmetric(vertical: 14),
              ),
              child: Text(btnText),
            ),
          )
        ],
      ),
    );
  }
}

class _PaymentModal extends StatefulWidget {
  final Map<String, dynamic> plan;
  final Function(Map<String, String>) onConfirm;

  const _PaymentModal({required this.plan, required this.onConfirm});

  @override
  State<_PaymentModal> createState() => _PaymentModalState();
}

class _PaymentModalState extends State<_PaymentModal> {
  final _numberController = TextEditingController();
  final _expiryController = TextEditingController();
  final _cvvController = TextEditingController();

  @override
  void dispose() {
    _numberController.dispose();
    _expiryController.dispose();
    _cvvController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Provider.of<AuthProvider>(context).isDarkMode;
    final cardMask = MaskTextInputFormatter(mask: '#### #### #### ####', filter: { "#": RegExp(r'[0-9]') });
    final dateMask = MaskTextInputFormatter(mask: '## / ##', filter: { "#": RegExp(r'[0-9]') });
    final cvcMask = MaskTextInputFormatter(mask: '####', filter: { "#": RegExp(r'[0-9]') });
    
    return Container(
      padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom, left: 24, right: 24, top: 32),
      decoration: BoxDecoration(
        color: AppColors.getCard(isDark),
        borderRadius: const BorderRadius.vertical(top: Radius.circular(32)),
        border: Border.all(color: AppColors.getBorder(isDark)),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('ACREDITAR ${widget.plan['id'].toUpperCase()}', style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w900, fontStyle: FontStyle.italic)),
          const Text('PAGO SEGURO CON TARJETA DE CRÉDITO', style: TextStyle(color: AppColors.textMuted, fontSize: 10, fontWeight: FontWeight.w800, letterSpacing: 1)),
          const SizedBox(height: 32),
          
          _buildField('NOMBRE EN TARJETA', 'JOHN DOE', isDark, type: TextInputType.name),
          const SizedBox(height: 16),
          _buildField('NÚMERO DE TARJETA', '0000 0000 0000 0000', isDark, controller: _numberController, formatters: [cardMask], type: TextInputType.number),
          const SizedBox(height: 16),
          Row(
            children: [
              Expanded(child: _buildField('EXPIRACIÓN', 'MM / YY', isDark, controller: _expiryController, formatters: [dateMask], type: TextInputType.number)),
              const SizedBox(width: 16),
              Expanded(child: _buildField('CVC', '000', isDark, controller: _cvvController, formatters: [cvcMask], type: TextInputType.number)),
            ],
          ),
          
          const SizedBox(height: 32),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: () {
                widget.onConfirm({
                  'number': _numberController.text,
                  'expiry': _expiryController.text,
                  'cvv': _cvvController.text,
                });
              },
              style: ElevatedButton.styleFrom(backgroundColor: widget.plan['color']),
              child: Text('CONFIRMAR PAGO \$${widget.plan['price']}'),
            ),
          ),
          const SizedBox(height: 16),
          Center(
            child: TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('CANCELAR', style: TextStyle(color: AppColors.textMuted, fontWeight: FontWeight.w900, fontSize: 10, letterSpacing: 2)),
            ),
          ),
          const SizedBox(height: 24),
        ],
      ),
    );
  }

  Widget _buildField(String label, String hint, bool isDark, {TextEditingController? controller, List<TextInputFormatter>? formatters, TextInputType? type}) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: const TextStyle(fontSize: 8, fontWeight: FontWeight.w900, color: AppColors.textMuted, letterSpacing: 1)),
        const SizedBox(height: 8),
        TextField(
          controller: controller,
          inputFormatters: formatters,
          keyboardType: type,
          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
          decoration: InputDecoration(
            hintText: hint,
            hintStyle: TextStyle(color: AppColors.textMuted.withOpacity(0.3)),
            filled: true,
            fillColor: AppColors.getBg(isDark),
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide(color: AppColors.getBorder(isDark))),
            enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide(color: AppColors.getBorder(isDark))),
            contentPadding: const EdgeInsets.all(16),
          ),
        ),
      ],
    );
  }
}
