import 'dart:io';
import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:provider/provider.dart';
import 'package:file_picker/file_picker.dart';
import '../core/theme.dart';
import '../providers/auth_provider.dart';
import '../widgets/bottom_nav.dart';
import '../widgets/evidence_player.dart';
import '../services/analysis_service.dart';
import '../models/analysis.dart';
import '../widgets/master_header.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  String _selectedModule = 'TEXTO';
  bool _isAnalyzing = false;
  AnalysisResult? _lastResult;
  File? _selectedFile;
  final _textController = TextEditingController();
  final _codeController = TextEditingController();
  final _smsController = TextEditingController();
  final _senderController = TextEditingController();
  String _selectedLanguage = 'auto';
  final List<String> _languages = ['auto', 'python', 'javascript', 'typescript', 'java', 'c', 'cpp', 'csharp', 'go', 'rust', 'php', 'ruby', 'sql'];

  @override
  void dispose() {
    _textController.dispose();
    _codeController.dispose();
    _smsController.dispose();
    _senderController.dispose();
    super.dispose();
  }
  
  final List<Map<String, dynamic>> _modules = [
    {'id': 'TEXTO', 'label': 'Texto', 'icon': LucideIcons.fileText},
    {'id': 'DOCS', 'label': 'Docs', 'icon': LucideIcons.code},
    {'id': 'IMAGEN', 'label': 'Imagen', 'icon': LucideIcons.image},
    {'id': 'VIDEO', 'label': 'Video', 'icon': LucideIcons.video},
    {'id': 'AUDIO', 'label': 'Audio', 'icon': LucideIcons.music},
    {'id': 'CODIGO', 'label': 'Código', 'icon': LucideIcons.code},
    {'id': 'SMS', 'label': 'SMS', 'icon': LucideIcons.messageSquare},
    {'id': 'LLAMADA', 'label': 'Llamada', 'icon': LucideIcons.phoneCall},
  ];

  Future<void> _handlePickFile() async {
    try {
      FilePickerResult? result = await FilePicker.platform.pickFiles(
        type: _selectedModule == 'IMAGEN' ? FileType.image : (_selectedModule == 'VIDEO' ? FileType.video : FileType.audio),
      );

      if (result != null && result.files.single.path != null) {
        setState(() {
          _selectedFile = File(result.files.single.path!);
          _lastResult = null; // Limpiar resultado previo al elegir nuevo archivo
        });
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('ERROR AL SELECCIONAR ARCHIVO: $e')),
        );
      }
    }
  }

  Future<void> _handleStartScan() async {
    final auth = Provider.of<AuthProvider>(context, listen: false);

    if (_selectedModule == 'CODIGO') {
      if (_codeController.text.trim().isEmpty) return;
      setState(() => _isAnalyzing = true);
      try {
        final out = await AnalysisService.analyzeCode(
          _codeController.text,
          _selectedLanguage == 'auto' ? null : _selectedLanguage,
        );
        if (out.error != null) {
          if (out.error!.contains('LIMITE')) {
            _showLimitDialog('LIVIANOS');
          } else if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(content: Text(out.error!.toUpperCase())),
            );
          }
        } else {
          final res = out.result!;
          if (res.estado != null && res.estado != 'OK') {
            // Fragmento insuficiente u otro estado no-OK: avisar sin abrir reporte
            if (mounted) {
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(content: Text(res.details.toUpperCase())),
              );
            }
          } else {
            await auth.refreshUser();
            setState(() => _lastResult = res);
          }
        }
      } finally {
        if (mounted) setState(() => _isAnalyzing = false);
      }
      return;
    }

    if (_selectedModule == 'SMS') {
      if (_smsController.text.trim().isEmpty) return;
      setState(() => _isAnalyzing = true);
      try {
        final out = await AnalysisService.analyzeSms(
          _smsController.text,
          _senderController.text,
        );
        if (out.error != null) {
          if (out.error!.contains('LIMITE')) {
            _showLimitDialog('LIVIANOS');
          } else if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(content: Text(out.error!.toUpperCase())),
            );
          }
        } else {
          final res = out.result!;
          if (res.estado != null && res.estado != 'OK') {
            if (mounted) {
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(content: Text(res.details.toUpperCase())),
              );
            }
          } else {
            await auth.refreshUser();
            setState(() => _lastResult = res);
          }
        }
      } finally {
        if (mounted) setState(() => _isAnalyzing = false);
      }
      return;
    }

    if (_selectedModule == 'TEXTO') {
      if (_textController.text.isEmpty) return;
      setState(() => _isAnalyzing = true);
      try {
        final res = await AnalysisService.analyzeText(_textController.text);
        if (res != null) {
          await auth.refreshUser();
          setState(() => _lastResult = res);
        } else {
          _showLimitDialog('LIVIANOS');
        }
      } finally {
        if (mounted) setState(() => _isAnalyzing = false);
      }
    } else {
      if (_selectedFile == null) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('POR FAVOR SELECCIONE UN ARCHIVO PRIMERO')));
        return;
      }
      
      setState(() => _isAnalyzing = true);
      try {
        final type = _selectedModule.toLowerCase();
        final res = await AnalysisService.analyzeFile(_selectedFile!, type);
        if (res != null) {
          await auth.refreshUser();
          setState(() {
            _lastResult = res;
            _selectedFile = null; // Limpiar tras éxito
          });
        } else {
          _showLimitDialog('PESADOS');
        }
      } finally {
        if (mounted) setState(() => _isAnalyzing = false);
      }
    }
  }

  void _showLimitDialog(String tipo) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: AppColors.getCard(Provider.of<AuthProvider>(context, listen: false).isDarkMode),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(24),
          side: const BorderSide(color: AppColors.accent, width: 1),
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const SizedBox(height: 20),
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(color: AppColors.accent.withOpacity(0.1), shape: BoxShape.circle),
              child: const Icon(LucideIcons.shieldAlert, color: AppColors.accent, size: 48),
            ),
            const SizedBox(height: 24),
            const Text('CRÉDITOS AGOTADOS', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w900, fontStyle: FontStyle.italic)),
            const SizedBox(height: 12),
            Text(
              'Has agotado tu cupo de análisis $tipo para este periodo. Eleva tu nivel de acreditación para continuar con la investigación forense.',
              textAlign: TextAlign.center,
              style: const TextStyle(color: AppColors.textMuted, fontSize: 11, fontWeight: FontWeight.w600),
            ),
            const SizedBox(height: 32),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: () {
                  Navigator.pop(context);
                  Navigator.pushReplacementNamed(context, '/plans');
                },
                child: const Text('VER PLANES DE ACCESO'),
              ),
            ),
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('CANCELAR', style: TextStyle(color: AppColors.textMuted, fontSize: 10, fontWeight: FontWeight.bold)),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final auth = Provider.of<AuthProvider>(context);

    return Scaffold(
      bottomNavigationBar: BottomNavBar(
        currentIndex: 0,
        onTap: (index) {
          if (auth.isAdmin) {
            if (index == 1) Navigator.pushReplacementNamed(context, '/admin');
            if (index == 2) Navigator.pushReplacementNamed(context, '/admin_finance');
            if (index == 3) Navigator.pushReplacementNamed(context, '/admin_settings');
            if (index == 4) Navigator.pushReplacementNamed(context, '/profile');
          } else {
            if (index == 1) Navigator.pushReplacementNamed(context, '/history');
            if (index == 2) Navigator.pushReplacementNamed(context, '/plans');
            if (index == 3) Navigator.pushReplacementNamed(context, '/profile');
          }
        },
      ),
      body: SafeArea(
        child: _lastResult != null ? _buildResultView(auth) : _buildMainView(auth),
      ),
    );
  }

  Widget _buildMainView(AuthProvider auth) {
    final isDark = auth.isDarkMode;
    return Padding(
      padding: const EdgeInsets.all(24.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const MasterHeader(),
          const SizedBox(height: 32),
          const Text('NUEVO_ANÁLISIS', style: TextStyle(fontSize: 24, fontWeight: FontWeight.w900, fontStyle: FontStyle.italic)),
          const Text('PROTOCOLO DE DETECCIÓN FORENSE', style: TextStyle(color: AppColors.textMuted, fontSize: 10, fontWeight: FontWeight.w800, letterSpacing: 2)),
          const SizedBox(height: 30),
          _buildModuleGrid(isDark),
          const SizedBox(height: 30),
          _buildInputZone(isDark),
          const SizedBox(height: 24),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: _isAnalyzing ? null : _handleStartScan,
              child: _isAnalyzing 
                ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                : const Text('COMENZAR ESCANEO'),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildModuleGrid(bool isDark) {
    return SizedBox(
      height: 75,
      child: ListView.builder(
        scrollDirection: Axis.horizontal,
        physics: const BouncingScrollPhysics(),
        itemCount: _modules.length,
        padding: const EdgeInsets.symmetric(horizontal: 4),
        itemBuilder: (context, index) {
          final m = _modules[index];
          final isActive = _selectedModule == m['id'];
          return Padding(
            padding: const EdgeInsets.only(right: 12),
            child: InkWell(
              onTap: () => setState(() => _selectedModule = m['id']),
              borderRadius: BorderRadius.circular(20),
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 200),
                width: 100,
                decoration: BoxDecoration(
                  color: isActive ? AppColors.accentGlow : AppColors.getCard(isDark),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: isActive ? AppColors.accent : AppTheme.border),
                ),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(m['icon'], size: 20, color: isActive ? AppColors.accent : AppColors.textMuted),
                    const SizedBox(height: 6),
                    Text(m['label'].toUpperCase(), style: TextStyle(fontSize: 8, fontWeight: FontWeight.w900, color: isActive ? AppColors.accent : AppColors.textMuted, letterSpacing: 1)),
                  ],
                ),
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _buildInputZone(bool isDark) {
    if (_selectedModule == 'TEXTO') {
      return Expanded(
        child: Container(
          decoration: BoxDecoration(
            color: AppColors.getCard(isDark),
            borderRadius: BorderRadius.circular(24),
            border: Border.all(color: AppColors.getBorder(isDark)),
          ),
          padding: const EdgeInsets.all(20),
          child: TextField(
            controller: _textController,
            maxLines: null,
            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
            decoration: const InputDecoration(
              hintText: 'PEGAR TEXTO SOSPECHOSO AQUÍ...',
              border: InputBorder.none,
              hintStyle: TextStyle(color: AppColors.textMuted, fontSize: 11, fontWeight: FontWeight.bold),
            ),
          ),
        ),
      );
    }

    if (_selectedModule == 'CODIGO') {
      return Expanded(
        child: Column(
          children: [
            Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
              decoration: BoxDecoration(
                color: AppColors.getCard(isDark),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: AppColors.getBorder(isDark)),
              ),
              child: Row(
                children: [
                  const Icon(LucideIcons.code, size: 16, color: AppColors.textMuted),
                  const SizedBox(width: 10),
                  const Text('LENGUAJE', style: TextStyle(fontSize: 9, fontWeight: FontWeight.w900, color: AppColors.textMuted, letterSpacing: 1)),
                  const Spacer(),
                  DropdownButtonHideUnderline(
                    child: DropdownButton<String>(
                      value: _selectedLanguage,
                      isDense: true,
                      dropdownColor: AppColors.getCard(isDark),
                      style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w900, color: AppColors.accent),
                      items: _languages
                          .map((l) => DropdownMenuItem(value: l, child: Text(l.toUpperCase())))
                          .toList(),
                      onChanged: (v) => setState(() => _selectedLanguage = v ?? 'auto'),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 12),
            Expanded(
              child: Container(
                decoration: BoxDecoration(
                  color: AppColors.getCard(isDark),
                  borderRadius: BorderRadius.circular(24),
                  border: Border.all(color: AppColors.getBorder(isDark)),
                ),
                padding: const EdgeInsets.all(20),
                child: TextField(
                  controller: _codeController,
                  maxLines: null,
                  expands: true,
                  textAlignVertical: TextAlignVertical.top,
                  style: const TextStyle(fontFamily: 'monospace', fontWeight: FontWeight.bold, fontSize: 13),
                  decoration: const InputDecoration(
                    hintText: '// PEGA CÓDIGO FUENTE AQUÍ...',
                    border: InputBorder.none,
                    hintStyle: TextStyle(color: AppColors.textMuted, fontSize: 11, fontWeight: FontWeight.bold),
                  ),
                ),
              ),
            ),
            const SizedBox(height: 10),
            const Text(
              'LA DETECCIÓN DE CÓDIGO IA NO ES 100% FIABLE: ES UN INDICIO, NO UNA ACUSACIÓN.',
              style: TextStyle(fontSize: 8, fontWeight: FontWeight.w800, color: AppColors.textMuted, letterSpacing: 0.5, height: 1.4),
            ),
          ],
        ),
      );
    }

    if (_selectedModule == 'SMS') {
      return Expanded(
        child: Column(
          children: [
            Container(
              decoration: BoxDecoration(
                color: AppColors.getCard(isDark),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: AppColors.getBorder(isDark)),
              ),
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 4),
              child: TextField(
                controller: _senderController,
                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                decoration: const InputDecoration(
                  hintText: 'REMITENTE (OPCIONAL)',
                  border: InputBorder.none,
                  icon: Icon(LucideIcons.user, size: 16, color: AppColors.textMuted),
                  hintStyle: TextStyle(color: AppColors.textMuted, fontSize: 11, fontWeight: FontWeight.bold),
                ),
              ),
            ),
            const SizedBox(height: 12),
            Expanded(
              child: Container(
                decoration: BoxDecoration(
                  color: AppColors.getCard(isDark),
                  borderRadius: BorderRadius.circular(24),
                  border: Border.all(color: AppColors.getBorder(isDark)),
                ),
                padding: const EdgeInsets.all(20),
                child: TextField(
                  controller: _smsController,
                  maxLines: null,
                  expands: true,
                  textAlignVertical: TextAlignVertical.top,
                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                  decoration: const InputDecoration(
                    hintText: 'PEGA AQUÍ EL SMS SOSPECHOSO...',
                    border: InputBorder.none,
                    hintStyle: TextStyle(color: AppColors.textMuted, fontSize: 11, fontWeight: FontWeight.bold),
                  ),
                ),
              ),
            ),
            const SizedBox(height: 10),
            const Text(
              'SE ANALIZAN ENLACES E INTENCIÓN DEL MENSAJE. NO ABRAS LINKS SOSPECHOSOS.',
              style: TextStyle(fontSize: 8, fontWeight: FontWeight.w800, color: AppColors.textMuted, letterSpacing: 0.5, height: 1.4),
            ),
            const SizedBox(height: 10),
            GestureDetector(
              onTap: () => Navigator.pushNamed(context, '/sms_monitor'),
              child: Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(vertical: 12),
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: AppColors.accent.withOpacity(0.5)),
                ),
                child: const Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(LucideIcons.shieldCheck, size: 16, color: AppColors.accent),
                    SizedBox(width: 8),
                    Text('MONITOREO AUTOMÁTICO (ANDROID)',
                        style: TextStyle(color: AppColors.accent, fontWeight: FontWeight.w900, fontSize: 11, letterSpacing: 0.5)),
                  ],
                ),
              ),
            ),
          ],
        ),
      );
    }

    return Expanded(
      child: GestureDetector(
        onTap: _handlePickFile,
        child: Container(
          width: double.infinity,
          decoration: BoxDecoration(
            color: AppColors.getCard(isDark),
            borderRadius: BorderRadius.circular(32),
            border: Border.all(
              color: _selectedFile != null ? AppColors.accent : AppColors.getBorder(isDark), 
              width: 2, 
              style: _selectedFile != null ? BorderStyle.solid : BorderStyle.none
            ),
          ),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              if (_selectedFile == null) ...[
                Icon(LucideIcons.uploadCloud, size: 48, color: AppColors.accent.withOpacity(0.5)),
                const SizedBox(height: 16),
                Text('CARGAR $_selectedModule', style: const TextStyle(fontWeight: FontWeight.w900, letterSpacing: 2, fontSize: 12)),
                const Text('HASTA 50MB PERMITIDOS', style: TextStyle(color: AppColors.textMuted, fontSize: 9, fontWeight: FontWeight.w800)),
              ] else ...[
                Icon(
                  _selectedModule == 'IMAGEN' ? LucideIcons.image : (_selectedModule == 'VIDEO' ? LucideIcons.video : (_selectedModule == 'LLAMADA' ? LucideIcons.phoneCall : LucideIcons.music)), 
                  size: 48, 
                  color: AppColors.accent
                ),
                const SizedBox(height: 16),
                Text(
                  _selectedFile!.path.split('/').last.toUpperCase(), 
                  style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 10, letterSpacing: 1),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 8),
                const Text('ARCHIVO LISTO PARA ESCANEO', style: TextStyle(color: AppColors.safe, fontSize: 9, fontWeight: FontWeight.w900, letterSpacing: 2)),
                const SizedBox(height: 16),
                TextButton(
                  onPressed: () => setState(() => _selectedFile = null),
                  child: const Text('CAMBIAR ARCHIVO', style: TextStyle(color: AppColors.accent, fontSize: 10, fontWeight: FontWeight.bold)),
                )
              ],
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildResultView(AuthProvider auth) {
    final res = _lastResult!;
    final isDark = auth.isDarkMode;
    
    return SingleChildScrollView(
      padding: const EdgeInsets.all(24.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              IconButton(icon: const Icon(LucideIcons.arrowLeft), onPressed: () => setState(() => _lastResult = null)),
              const Text('REPORTE_TÉCNICO', style: TextStyle(fontWeight: FontWeight.w900, letterSpacing: 2, fontSize: 10)),
              const SizedBox(width: 40), // Espaciador para centrar el título
            ],
          ),
          const SizedBox(height: 32),
          
          if (['imagen', 'audio', 'video', 'llamada'].contains(res.type))
            ClipRRect(
              borderRadius: BorderRadius.circular(24),
              child: EvidencePlayer(type: res.type == 'llamada' ? 'audio' : res.type, url: res.content, userPlan: auth.user?.plan ?? 'gratis'),
            ),
          
          if (res.type == 'texto')
            Container(
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(color: AppColors.getCard(isDark), borderRadius: BorderRadius.circular(24), border: Border.all(color: AppColors.getBorder(isDark))),
              child: Text(res.content, style: const TextStyle(fontStyle: FontStyle.italic, fontWeight: FontWeight.bold, fontSize: 14)),
            ),

          if (res.type == 'codigo')
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(color: AppColors.getCard(isDark), borderRadius: BorderRadius.circular(24), border: Border.all(color: AppColors.getBorder(isDark))),
              child: Text(res.content, style: const TextStyle(fontFamily: 'monospace', fontWeight: FontWeight.bold, fontSize: 12)),
            ),

          if (res.type == 'sms')
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(color: AppColors.getCard(isDark), borderRadius: BorderRadius.circular(24), border: Border.all(color: AppColors.getBorder(isDark))),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Icon(LucideIcons.messageSquare, size: 16, color: AppColors.textMuted),
                  const SizedBox(width: 12),
                  Expanded(child: Text(res.content, style: const TextStyle(fontStyle: FontStyle.italic, fontWeight: FontWeight.bold, fontSize: 13))),
                ],
              ),
            ),

          const SizedBox(height: 32),
          _buildCircularScore(res),
          const SizedBox(height: 32),
          
          Container(
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(color: AppColors.getCard(isDark), borderRadius: BorderRadius.circular(24), border: Border.all(color: AppColors.getBorder(isDark))),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Row(children: [Icon(LucideIcons.brainCircuit, color: AppColors.accent, size: 16), SizedBox(width: 10), Text('VEREDICTO_SISTEMA', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w900, letterSpacing: 1))]),
                const SizedBox(height: 12),
                Text(res.details, style: const TextStyle(fontSize: 12, color: AppColors.textMuted, fontWeight: FontWeight.w600, height: 1.5)),
              ],
            ),
          ),
          const SizedBox(height: 24),
        ],
      ),
    );
  }

  Widget _buildCircularScore(AnalysisResult res) {
    final isSafe = res.aiProbability <= 50;
    return Center(
      child: Stack(
        alignment: Alignment.center,
        children: [
          SizedBox(
            width: 140, height: 140,
            child: CircularProgressIndicator(value: res.aiProbability / 100, strokeWidth: 8, backgroundColor: Colors.black12, color: isSafe ? AppColors.safe : AppColors.accent),
          ),
          Column(
            children: [
              Text('${res.aiProbability.toInt()}%', style: const TextStyle(fontSize: 32, fontWeight: FontWeight.w900, fontStyle: FontStyle.italic)),
              const Text('IA CONFID.', style: TextStyle(fontSize: 8, fontWeight: FontWeight.w900, color: AppColors.textMuted, letterSpacing: 1)),
            ],
          )
        ],
      ),
    );
  }
}
