from rest_framework.response import Response
from rest_framework import status


def respuesta_exitosa(datos=None, mensaje=None, codigo_http=status.HTTP_200_OK):
    payload = {'exito': True}
    if datos is not None:
        payload['datos'] = datos
    if mensaje:
        payload['mensaje'] = mensaje
    return Response(payload, status=codigo_http)


def respuesta_error(codigo: str, mensaje: str, codigo_http=status.HTTP_400_BAD_REQUEST):
    return Response({
        'exito': False,
        'error': {'codigo': codigo, 'mensaje': mensaje}
    }, status=codigo_http)
