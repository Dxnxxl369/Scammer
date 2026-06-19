#!/usr/bin/env python
"""Django's command-line utility for administrative tasks."""
import os
import sys


def main():
    """Run administrative tasks."""
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

    # --- Desarrollo: puerto fijo 8002 ---
    # Si se ejecuta `runserver` sin dirección/puerto explícito, escuchar en
    # 0.0.0.0:8002 (accesible como localhost:8002 desde el navegador y como
    # 192.168.x.x:8002 desde un dispositivo físico en la misma red).
    if len(sys.argv) > 1 and sys.argv[1] == 'runserver':
        if not any(not arg.startswith('-') for arg in sys.argv[2:]):
            sys.argv.append('0.0.0.0:8002')

    try:
        from django.core.management import execute_from_command_line
    except ImportError as exc:
        raise ImportError(
            "Couldn't import Django. Are you sure it's installed and "
            "available on your PYTHONPATH environment variable? Did you "
            "forget to activate a virtual environment?"
        ) from exc
    execute_from_command_line(sys.argv)


if __name__ == '__main__':
    main()
