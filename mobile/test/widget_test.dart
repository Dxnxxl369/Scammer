// Smoke test mínimo del proyecto.
//
// El test por defecto de la plantilla (contador) no aplica a esta app, así que
// se reemplaza por una verificación básica de que el árbol de widgets construye.
// Para probar la app real (ScammerApp) hay que envolverla en su MultiProvider y
// mockear FirebaseService/ApiService; eso queda pendiente como test de integración.

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('smoke: construye un árbol de widgets básico', (WidgetTester tester) async {
    await tester.pumpWidget(const MaterialApp(home: Scaffold()));
    expect(find.byType(MaterialApp), findsOneWidget);
  });
}
