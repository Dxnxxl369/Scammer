class CriticalPoint {
  final String title;
  final String description;
  final double? score;
  final String? label;

  CriticalPoint({required this.title, required this.description, this.score, this.label});

  factory CriticalPoint.fromJson(Map<String, dynamic> json) {
    return CriticalPoint(
      title: json['titulo'] ?? '',
      description: json['descripcion'] ?? '',
      score: (json['score'] ?? 0).toDouble(),
      label: json['label'],
    );
  }
}

class AnalysisResult {
  final String id;
  final String type;
  final double aiProbability;
  final String verdict;
  final String details;
  final String content;
  final String? fileName;
  final String? extension;
  final List<CriticalPoint> criticalPoints;
  final DateTime date;

  String get veredicto => verdict;

  AnalysisResult({
    required this.id,
    required this.type,
    required this.aiProbability,
    required this.verdict,
    required this.details,
    required this.content,
    this.fileName,
    this.extension,
    required this.criticalPoints,
    required this.date,
  });

  factory AnalysisResult.fromJson(Map<String, dynamic> json) {
    return AnalysisResult(
      id: json['id'] ?? '',
      type: json['tipo'] ?? '',
      aiProbability: (json['probabilidadIA'] ?? 0).toDouble(),
      verdict: json['veredicto'] ?? '',
      details: json['detalles'] ?? '',
      content: json['contenido'] ?? '',
      fileName: json['nombreArchivo'],
      extension: json['extension'],
      criticalPoints: (json['puntosCriticos'] as List?)
              ?.map((p) => CriticalPoint.fromJson(p))
              .toList() ?? [],
      date: DateTime.parse(json['fecha'] ?? DateTime.now().toIso8601String()),
    );
  }
}
