export const COLORES_AVATAR = ['#2D6A4F', '#1D4ED8', '#7C3AED', '#B45309', '#B5303A'];

export const iniciales = (nombre: string) =>
  nombre.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();

export const colorAvatar = (id: number) => COLORES_AVATAR[id % COLORES_AVATAR.length];

export const FORM_VACIO = { nombre: '', telefono: '' };