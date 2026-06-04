from django.core.management.base import BaseCommand
from apps.authentication.models import Usuario


class Command(BaseCommand):
    help = 'Convierte un usuario existente en administrador'

    def add_arguments(self, parser):
        parser.add_argument('correo', type=str)

    def handle(self, *args, **options):
        correo = options['correo'].lower().strip()
        usuario = Usuario.objects(correo=correo).first()

        if not usuario:
            self.stdout.write(self.style.ERROR(f'No existe usuario con correo {correo}'))
            return

        usuario.rol = 'administrador'
        usuario.save()

        self.stdout.write(self.style.SUCCESS(
            f'OK Usuario {usuario.nombre_usuario} ({correo}) ahora es administrador'
        ))
