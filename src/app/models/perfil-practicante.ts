export type PestanaPerfil = 'info' | 'solicitudes' | 'submissions' | 'ajustes';

/** Query param `estado` accepted by `/perfil` (it only applies to the tab that owns it). */
export type EstadoPerfil =
  | 'cargando'
  | 'sin-plataformas'
  | 'actualizado'
  | 'vacio'
  | 'ver-codigo'
  | 'codigo-recuperacion';

/** Query param `estado` accepted by `/perfil/editar`. */
export type EstadoEdicion = 'errores';

export type EstadoSolicitud = 'Pendiente' | 'Aceptada' | 'Rechazada';
export type VeredictoSubmission = 'Aceptado' | 'Wrong Answer' | 'Time Limit';
export type TonoEstadistica = 'exito' | 'alerta' | 'turquesa' | 'violeta';

export interface InfoPersonalPracticante {
  iniciales: string;
  nombreCompleto: string;
  usuario: string;
  rol: string;
  carreraCiclo: string;
  universidad: string;
  ubicacion: string;
  nivelCodigo: string;
  objetivo: string;
}

export interface PlataformaPerfil {
  nombre: string;
  usuario: string;
  icono: string;
}

export interface EstadisticaPerfil {
  valor: string;
  etiqueta: string;
  detalle: string;
  tono: TonoEstadistica;
  icono: string;
  iconoDetalle: string;
}

export interface SolicitudGrupo {
  inicial: string;
  grupo: string;
  descripcion: string;
  fecha: string;
  estado: EstadoSolicitud;
}

export interface FiltroSolicitud {
  valor: string;
  etiqueta: string;
}

export interface SubmissionPracticante {
  problema: string;
  lenguaje: string;
  veredicto: VeredictoSubmission;
  tiempo: string;
  memoria: string;
  fecha: string;
}

export interface OpcionSelect {
  valor: string;
  etiqueta: string;
}

export interface OpcionEdicion {
  valor: string;
  titulo: string;
  descripcion: string;
  icono: string;
}

export interface PlataformaEdicion {
  control: 'codeforces' | 'atcoder' | 'vjudge';
  nombre: string;
  icono: string;
}
