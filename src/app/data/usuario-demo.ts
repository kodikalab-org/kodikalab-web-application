import { Usuario } from '../models/usuario';

/**
 * Hardcoded user used while there is no backend. Replace this constant with the
 * authenticated user returned by the API once the integration starts.
 */
export const USUARIO_DEMO: Usuario = {
  id: 'usr-0001',
  nombres: 'Camila',
  apellidos: 'Rojas',
  correo: 'u20240001@upc.edu.pe',
  rol: 'PRACTICANTE',
  codigoEstudiante: '20240001',
  carrera: 'Ingeniería de Software',
  ciclo: '5.º ciclo',
  distrito: 'San Miguel',
  nivel: 'INTERMEDIO',
  experienciaMeses: 12,
  franjaHoraria: 'Noche',
  diasDisponibles: ['Mié', 'Vie'],
  objetivo: 'Clasificar a competencias',
  plataformas: [
    { plataforma: 'Codeforces', usuario: 'camila_cf', estado: 'VINCULADA', rating: 1432 },
    { plataforma: 'AtCoder', usuario: 'camila_r', estado: 'VINCULADA' },
    { plataforma: 'VJudge', usuario: 'camila_vj', estado: 'VINCULADA' },
  ],
};
