import uuid
from datetime import datetime, timedelta
from typing import Optional
from mongoengine.errors import NotUniqueError, ValidationError
from .models import Usuario, Anonimo


class UsuarioService:
    @staticmethod
    def crear_desde_supabase(
        id_supabase: str,
        correo: str,
        nombre_usuario: str,
        nombre_completo: Optional[str] = None,
        pais: str = 'BO',
    ) -> tuple[Optional[Usuario], Optional[str]]:
        correo_norm = correo.lower().strip()
        username_norm = nombre_usuario.lower().strip()

        if Usuario.objects(correo=correo_norm).first():
            return None, 'CORREO_DUPLICADO'
        if Usuario.objects(nombre_usuario=username_norm).first():
            return None, 'NOMBRE_USUARIO_DUPLICADO'
        if Usuario.objects(id_supabase=id_supabase).first():
            return None, 'ID_SUPABASE_DUPLICADO'

        try:
            usuario = Usuario(
                id_supabase=id_supabase,
                correo=correo_norm,
                nombre_usuario=username_norm,
                nombre_completo=nombre_completo,
                pais=pais,
            )
            usuario.save()

            # NOTIFICAR ADMINS (Reclutamiento)
            try:
                from apps.analysis.services import AnalisisService
                AnalisisService._notificar_admins(
                    titulo="Nuevo Reclutamiento",
                    mensaje=f"El agente {username_norm} se ha unido al sistema.",
                    tipo="registro"
                )
            except Exception as e:
                print(f"[AUTH SERVICE] Error al notificar admin sobre nuevo recluta: {e}")

            return usuario, None

        except NotUniqueError:
            return None, 'DUPLICADO'
        except ValidationError as e:
            return None, f'VALIDACION: {str(e)}'

    @staticmethod
    def obtener_por_supabase_id(id_supabase: str) -> Optional[Usuario]:
        return Usuario.objects(id_supabase=id_supabase).first()

    @staticmethod
    def obtener_por_correo(correo: str) -> Optional[Usuario]:
        return Usuario.objects(correo=correo.lower()).first()

    @staticmethod
    def obtener_por_username(nombre_usuario: str) -> Optional[Usuario]:
        return Usuario.objects(nombre_usuario=nombre_usuario.lower()).first()

    @staticmethod
    def actualizar(id_supabase: str, datos: dict) -> tuple[Optional[Usuario], Optional[str]]:
        usuario = Usuario.objects(id_supabase=id_supabase).first()
        if not usuario:
            return None, 'NO_ENCONTRADO'
        campos_permitidos = ['nombre_completo', 'pais']
        for campo, valor in datos.items():
            if campo in campos_permitidos:
                setattr(usuario, campo, valor)
        try:
            usuario.save()
            return usuario, None
        except (NotUniqueError, ValidationError) as e:
            return None, str(e)

    @staticmethod
    def incrementar_intentos_livianos(id_supabase: str) -> Optional[Usuario]:
        return Usuario.objects(id_supabase=id_supabase).modify(
            inc__intentos_livianos=1, new=True
        )

    @staticmethod
    def incrementar_intentos_pesados(id_supabase: str) -> Optional[Usuario]:
        return Usuario.objects(id_supabase=id_supabase).modify(
            inc__intentos_pesados=1, new=True
        )

    @staticmethod
    def existe_correo(correo: str) -> bool:
        return Usuario.objects(correo=correo.lower()).first() is not None

    @staticmethod
    def existe_username(nombre_usuario: str) -> bool:
        return Usuario.objects(nombre_usuario=nombre_usuario.lower()).first() is not None


class AnonimoService:
    HORAS_EXPIRACION = 1

    @staticmethod
    def crear_sesion(
        ip: Optional[str] = None,
        navegador: Optional[str] = None,
        pais: Optional[str] = None,
    ) -> Anonimo:
        anonimo = Anonimo(
            id_sesion=str(uuid.uuid4()),
            ip=ip,
            navegador=navegador,
            pais=pais,
            fecha_expiracion=datetime.utcnow() + timedelta(hours=AnonimoService.HORAS_EXPIRACION),
        )
        anonimo.save()
        return anonimo

    @staticmethod
    def obtener_por_id_sesion(id_sesion: str) -> Optional[Anonimo]:
        return Anonimo.objects(id_sesion=id_sesion).first()

    @staticmethod
    def obtener_por_ip(ip: str) -> Optional[Anonimo]:
        from datetime import datetime
        return Anonimo.objects(ip=ip, fecha_expiracion__gt=datetime.utcnow()).order_by('-fecha_creacion').first()

    @staticmethod
    def incrementar_intentos_livianos(id_sesion: str) -> Optional[Anonimo]:
        return Anonimo.objects(id_sesion=id_sesion).modify(
            inc__intentos_livianos=1, new=True
        )

    @staticmethod
    def incrementar_intentos_pesados(id_sesion: str) -> Optional[Anonimo]:
        return Anonimo.objects(id_sesion=id_sesion).modify(
            inc__intentos_pesados=1, new=True
        )


class AdminService:
    @staticmethod
    def listar_usuarios(
        rol: Optional[str] = None,
        plan: Optional[str] = None,
        bloqueado: Optional[bool] = None,
        busqueda: Optional[str] = None,
        pagina: int = 1,
        por_pagina: int = 20,
    ) -> dict:
        query = Usuario.objects
        if rol:
            query = query.filter(rol=rol)
        if plan:
            query = query.filter(plan=plan)
        if bloqueado is not None:
            query = query.filter(bloqueado=bloqueado)
        if busqueda:
            query = query.filter(
                __raw__={
                    '$or': [
                        {'correo': {'$regex': busqueda, '$options': 'i'}},
                        {'nombre_usuario': {'$regex': busqueda, '$options': 'i'}},
                        {'nombre_completo': {'$regex': busqueda, '$options': 'i'}},
                    ]
                }
            )
        total = query.count()
        skip = (pagina - 1) * por_pagina
        usuarios = query.order_by('-fecha_creacion').skip(skip).limit(por_pagina)
        return {
            'usuarios': [u.to_dict() for u in usuarios],
            'total': total,
            'pagina': pagina,
            'por_pagina': por_pagina,
            'total_paginas': (total + por_pagina - 1) // por_pagina,
        }

    @staticmethod
    def bloquear_usuario(id_supabase: str) -> tuple[Optional[Usuario], Optional[str]]:
        usuario = Usuario.objects(id_supabase=id_supabase).first()
        if not usuario:
            return None, 'NO_ENCONTRADO'
        usuario.bloqueado = True
        usuario.save()
        return usuario, None

    @staticmethod
    def desbloquear_usuario(id_supabase: str) -> tuple[Optional[Usuario], Optional[str]]:
        usuario = Usuario.objects(id_supabase=id_supabase).first()
        if not usuario:
            return None, 'NO_ENCONTRADO'
        usuario.bloqueado = False
        usuario.save()
        return usuario, None

    @staticmethod
    def cambiar_plan(id_supabase: str, plan: str) -> tuple[Optional[Usuario], Optional[str]]:
        if plan not in ['gratis', 'starter', 'pro', 'elite']:
            return None, 'PLAN_INVALIDO'
        usuario = Usuario.objects(id_supabase=id_supabase).first()
        if not usuario:
            return None, 'NO_ENCONTRADO'
        usuario.plan = plan
        usuario.save()

        # NOTIFICAR AL USUARIO (Módulo Finanzas)
        from apps.analysis.services import NotificacionService
        NotificacionService.crear(
            u_id=id_supabase,
            t="Actualización de Plan",
            m=f"Tu acreditación ha sido actualizada al nivel {plan.upper()}.",
            tp="pago"
        )

        return usuario, None

    @staticmethod
    def cambiar_rol(id_supabase: str, rol: str) -> tuple[Optional[Usuario], Optional[str]]:
        if rol not in ['administrador', 'usuario']:
            return None, 'ROL_INVALIDO'
        usuario = Usuario.objects(id_supabase=id_supabase).first()
        if not usuario:
            return None, 'NO_ENCONTRADO'
        usuario.rol = rol
        usuario.save()
        return usuario, None

    @staticmethod
    def obtener_usuario(id_supabase: str) -> tuple[Optional[Usuario], Optional[str]]:
        usuario = Usuario.objects(id_supabase=id_supabase).first()
        if not usuario:
            return None, 'NO_ENCONTRADO'
        return usuario, None

    @staticmethod
    def crear_usuario(
        correo: str,
        nombre_usuario: str,
        password: str,
        nombre_completo: Optional[str] = None,
        rol: str = 'usuario',
        plan: str = 'gratis',
        pais: str = 'BO',
        ip: Optional[str] = None,
    ) -> tuple[Optional[Usuario], Optional[str]]:
        """
        Crea un usuario completo: primero en Supabase Auth (para que pueda
        iniciar sesion) y luego en MongoDB con el rol y plan asignados por el
        administrador. Si falla la creacion en Mongo, revierte el alta en
        Supabase para no dejar usuarios huerfanos.
        """
        from . import supabase_admin

        correo_norm = correo.lower().strip()
        username_norm = nombre_usuario.lower().strip()

        if rol not in ['administrador', 'usuario']:
            return None, 'ROL_INVALIDO'
        if plan not in ['gratis', 'starter', 'pro', 'elite']:
            return None, 'PLAN_INVALIDO'

        # Validaciones de unicidad en Mongo antes de tocar Supabase
        if Usuario.objects(correo=correo_norm).first():
            return None, 'CORREO_DUPLICADO'
        if Usuario.objects(nombre_usuario=username_norm).first():
            return None, 'NOMBRE_USUARIO_DUPLICADO'

        # 1) Crear en Supabase Auth
        id_supabase, error = supabase_admin.crear_usuario_auth(
            correo=correo_norm,
            password=password,
            metadata={'nombre_usuario': username_norm, 'full_name': nombre_completo or username_norm},
        )
        if error:
            return None, f'SUPABASE: {error}'

        # 2) Crear en MongoDB
        try:
            usuario = Usuario(
                id_supabase=id_supabase,
                correo=correo_norm,
                nombre_usuario=username_norm,
                nombre_completo=nombre_completo,
                rol=rol,
                plan=plan,
                pais=pais,
            )
            usuario.save()
        except (NotUniqueError, ValidationError) as e:
            # Rollback: eliminar el usuario recien creado en Supabase
            supabase_admin.eliminar_usuario_auth(id_supabase)
            return None, f'VALIDACION: {str(e)}'

        # 3) Bitacora + notificacion (best-effort, no debe romper el alta)
        try:
            from apps.analysis.services import BitacoraService, NotificacionService
            BitacoraService.registrar(
                usuario_id=usuario.id_supabase,
                accion='Alta de Usuario (Admin)',
                modulo='Administracion',
                ip=ip,
                detalles=f'Admin creo a {username_norm} con rol {rol} y plan {plan}',
            )
            NotificacionService.crear(
                u_id=usuario.id_supabase,
                t='Cuenta creada',
                m=f'Un administrador ha creado tu cuenta con rol {rol.upper()}.',
                tp='sistema',
            )
        except Exception as e:
            print(f'[ADMIN SERVICE] Error auxiliar al crear usuario: {e}')

        return usuario, None

    @staticmethod
    def actualizar_usuario(
        id_supabase: str,
        datos: dict,
        ip: Optional[str] = None,
    ) -> tuple[Optional[Usuario], Optional[str]]:
        """
        Actualiza un usuario existente. Sincroniza correo/contrasena con
        Supabase cuando corresponde y valida unicidad de correo/usuario.
        """
        from . import supabase_admin

        usuario = Usuario.objects(id_supabase=id_supabase).first()
        if not usuario:
            return None, 'NO_ENCONTRADO'

        nuevo_correo = datos.get('correo')
        nuevo_username = datos.get('nombre_usuario')
        nuevo_password = datos.get('password')
        nuevo_rol = datos.get('rol')
        nuevo_plan = datos.get('plan')

        if nuevo_rol is not None and nuevo_rol not in ['administrador', 'usuario']:
            return None, 'ROL_INVALIDO'
        if nuevo_plan is not None and nuevo_plan not in ['gratis', 'starter', 'pro', 'elite']:
            return None, 'PLAN_INVALIDO'

        # Unicidad si cambian correo o nombre de usuario
        if nuevo_correo:
            correo_norm = nuevo_correo.lower().strip()
            existente = Usuario.objects(correo=correo_norm).first()
            if existente and existente.id_supabase != id_supabase:
                return None, 'CORREO_DUPLICADO'
        if nuevo_username:
            username_norm = nuevo_username.lower().strip()
            existente = Usuario.objects(nombre_usuario=username_norm).first()
            if existente and existente.id_supabase != id_supabase:
                return None, 'NOMBRE_USUARIO_DUPLICADO'

        # Sincronizar con Supabase si cambia correo o password
        if nuevo_correo or nuevo_password:
            ok, error = supabase_admin.actualizar_usuario_auth(
                id_supabase,
                correo=nuevo_correo.lower().strip() if nuevo_correo else None,
                password=nuevo_password or None,
            )
            if error:
                return None, f'SUPABASE: {error}'

        campos_permitidos = ['nombre_completo', 'nombre_usuario', 'correo', 'rol', 'plan', 'pais', 'activo', 'bloqueado']
        for campo, valor in datos.items():
            if campo in campos_permitidos and valor is not None:
                setattr(usuario, campo, valor)

        try:
            usuario.save()
        except (NotUniqueError, ValidationError) as e:
            return None, f'VALIDACION: {str(e)}'

        try:
            from apps.analysis.services import BitacoraService
            BitacoraService.registrar(
                usuario_id=usuario.id_supabase,
                accion='Edicion de Usuario (Admin)',
                modulo='Administracion',
                ip=ip,
                detalles=f'Admin actualizo a {usuario.nombre_usuario}',
            )
        except Exception as e:
            print(f'[ADMIN SERVICE] Error auxiliar al actualizar usuario: {e}')

        return usuario, None

    @staticmethod
    def eliminar_usuario(id_supabase: str, ip: Optional[str] = None) -> tuple[bool, Optional[str]]:
        """
        Elimina un usuario de Supabase Auth y de MongoDB.
        """
        from . import supabase_admin

        usuario = Usuario.objects(id_supabase=id_supabase).first()
        if not usuario:
            return False, 'NO_ENCONTRADO'

        nombre = usuario.nombre_usuario

        # 1) Eliminar de Supabase (idempotente: 404 se trata como exito)
        ok, error = supabase_admin.eliminar_usuario_auth(id_supabase)
        if error:
            return False, f'SUPABASE: {error}'

        # 2) Eliminar de Mongo
        usuario.delete()

        try:
            from apps.analysis.services import BitacoraService
            BitacoraService.registrar(
                usuario_id=id_supabase,
                accion='Baja de Usuario (Admin)',
                modulo='Administracion',
                ip=ip,
                detalles=f'Admin elimino a {nombre}',
            )
        except Exception as e:
            print(f'[ADMIN SERVICE] Error auxiliar al eliminar usuario: {e}')

        return True, None

    @staticmethod
    def estadisticas() -> dict:
        return {
            'total_usuarios': Usuario.objects.count(),
            'en_linea': Usuario.objects(esta_online=True).count(),
            'administradores': Usuario.objects(rol='administrador').count(),
            'usuarios_normales': Usuario.objects(rol='usuario').count(),
            'plan_gratis': Usuario.objects(plan='gratis').count(),
            'plan_starter': Usuario.objects(plan='starter').count(),
            'plan_pro': Usuario.objects(plan='pro').count(),
            'plan_elite': Usuario.objects(plan='elite').count(),
            'bloqueados': Usuario.objects(bloqueado=True).count(),
            'activos': Usuario.objects(activo=True, bloqueado=False).count(),
        }
