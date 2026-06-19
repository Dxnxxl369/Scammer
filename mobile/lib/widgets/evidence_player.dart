import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:chewie/chewie.dart';
import 'package:video_player/video_player.dart';
import '../core/theme.dart';

class EvidencePlayer extends StatefulWidget {
  final String type;
  final String url;
  final String userPlan;

  const EvidencePlayer({
    super.key,
    required this.type,
    required this.url,
    required this.userPlan,
  });

  @override
  State<EvidencePlayer> createState() => _EvidencePlayerState();
}

class _EvidencePlayerState extends State<EvidencePlayer> {
  VideoPlayerController? _videoController;
  ChewieController? _chewieController;
  bool _isInitialized = false;

  bool get _canView {
    final plan = widget.userPlan.toLowerCase();
    if (widget.type == 'imagen') return ['pro', 'elite', 'admin'].contains(plan);
    if (['audio', 'video'].contains(widget.type)) return ['elite', 'admin', 'pro'].contains(plan);
    return false;
  }

  @override
  void initState() {
    super.initState();
    if (_canView && (widget.type == 'video' || widget.type == 'audio')) {
      _initializePlayer();
    }
  }

  Future<void> _initializePlayer() async {
    _videoController = VideoPlayerController.networkUrl(Uri.parse(widget.url));
    
    try {
      await _videoController!.initialize();
      _chewieController = ChewieController(
        videoPlayerController: _videoController!,
        autoPlay: false,
        looping: false,
        aspectRatio: _videoController!.value.aspectRatio,
        allowFullScreen: true,
        allowPlaybackSpeedChanging: true,
        showControls: true,
        materialProgressColors: ChewieProgressColors(
          playedColor: AppColors.accent,
          handleColor: AppColors.accent,
          backgroundColor: Colors.white24,
          bufferedColor: Colors.white54,
        ),
        placeholder: Container(color: Colors.black, child: const Center(child: CircularProgressIndicator(color: AppColors.accent))),
      );
      if (mounted) setState(() => _isInitialized = true);
    } catch (e) {
      print("Error al inicializar reproductor: $e");
    }
  }

  @override
  void dispose() {
    _videoController?.dispose();
    _chewieController?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (widget.url.contains('[') || !widget.url.startsWith('http')) {
      return _buildDeletedPlaceholder();
    }

    if (!_canView) {
      return _buildRestrictedPlaceholder();
    }

    return Column(
      children: [
        _buildHeader(),
        const SizedBox(height: 12),
        _buildMediaContainer(),
      ],
    );
  }

  Widget _buildHeader() {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Row(
          children: [
            Icon(
              widget.type == 'video' ? LucideIcons.monitorPlay : (widget.type == 'audio' ? LucideIcons.headphones : LucideIcons.fileImage),
              size: 16,
              color: AppColors.accent,
            ),
            const SizedBox(width: 8),
            const Text(
              'VISUALIZADOR FORENSE',
              style: TextStyle(fontSize: 10, fontWeight: FontWeight.w900, letterSpacing: 1),
            ),
          ],
        ),
        const SizedBox(width: 24), // Espaciador
      ],
    );
  }

  Widget _buildMediaContainer() {
    return Container(
      width: double.infinity,
      decoration: BoxDecoration(
        color: Colors.black.withOpacity(0.2),
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: AppTheme.border),
      ),
      clipBehavior: Clip.antiAlias,
      child: _buildPlayerContent(),
    );
  }

  Widget _buildPlayerContent() {
    if (widget.type == 'imagen') {
      return Image.network(
        widget.url,
        fit: BoxFit.cover,
        loadingBuilder: (context, child, loadingProgress) {
          if (loadingProgress == null) return child;
          return const Center(child: CircularProgressIndicator(color: AppColors.accent));
        },
        errorBuilder: (c, e, s) => const Center(child: Icon(LucideIcons.image)),
      );
    }

    if (!_isInitialized) {
      return const AspectRatio(
        aspectRatio: 16 / 9,
        child: Center(child: CircularProgressIndicator(color: AppColors.accent)),
      );
    }

    return AspectRatio(
      aspectRatio: _videoController!.value.aspectRatio,
      child: Chewie(controller: _chewieController!),
    );
  }

  Widget _buildDeletedPlaceholder() {
    return AspectRatio(
      aspectRatio: 16 / 9,
      child: Container(
        decoration: BoxDecoration(color: Colors.black45, borderRadius: BorderRadius.circular(32)),
        child: const Center(child: Icon(LucideIcons.lock, color: Colors.white24)),
      ),
    );
  }

  Widget _buildRestrictedPlaceholder() {
    return AspectRatio(
      aspectRatio: 16 / 9,
      child: Container(
        decoration: BoxDecoration(
          color: Colors.black45,
          borderRadius: BorderRadius.circular(32),
          border: Border.all(color: AppTheme.border),
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(LucideIcons.lock, color: AppColors.accent, size: 40),
            const SizedBox(height: 12),
            const Text('ACCESO RESTRINGIDO', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 12)),
            Text(
              'NIVEL ${widget.type == 'imagen' ? 'PRO' : 'ELITE'} REQUERIDO',
              style: const TextStyle(color: AppColors.accent, fontWeight: FontWeight.bold, fontSize: 8),
            ),
          ],
        ),
      ),
    );
  }
}
