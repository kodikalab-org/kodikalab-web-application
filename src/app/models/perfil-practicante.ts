export type PestanaPerfil = 'info' | 'solicitudes' | 'submissions' | 'ajustes';

/** Query param `estado` accepted by `/perfil`: only shown right after saving the profile. */
export type EstadoPerfil = 'actualizado';

export interface InfoPersonalPracticante {
  iniciales: string;
  nombreCompleto: string;
  email: string;
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
