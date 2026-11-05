import type { Messages } from "../en";

export const pages: Messages["pages"] = {
  home: "Inicio de Rumi",
  signOut: "Cerrar sesión",
  tryAgain: "Intentar de nuevo",
  offline: {
    meta: "Sin conexión",
    title: "No tienes conexión",
    body: "Rumi necesita conexión para cargar compatibilidades y mensajes. Seguiremos donde lo dejaste en cuanto vuelvas.",
  },
  suspended: {
    meta: "Cuenta suspendida",
    title: "Esta cuenta está suspendida",
    body: "Después de una revisión, nuestro equipo de seguridad suspendió esta cuenta por no cumplir las normas de la comunidad de Rumi. Tu perfil está oculto para todos y tus chats están en pausa.",
    reason: "Motivo",
    mistakeLead: "Si crees que es un error, escribe a",
    mistakeTail: "desde tu correo escolar y lo revisaremos otra vez.",
    subject: "Revisión de cuenta",
    contact: "Contactar a soporte",
    download: "Descargar tus datos",
  },
  notStudent: {
    title: "Rumi es para estudiantes",
    body: "El inicio de sesión de tu escuela indica que esta cuenta pertenece a personal o docentes, así que no participa en la búsqueda de compañeros. Si trabajas en vivienda, pídele una invitación de personal a tu administrador de vivienda.",
    wrongLead: "¿Crees que es un error? Escribe a",
  },
  appError: {
    title: "Eso no cargó",
    body: "Revisa tu conexión e inténtalo de nuevo.",
    reference: "Referencia: {digest}",
  },
  globalError: {
    title: "Rumi tuvo un problema",
    body: "Vuelve a cargar la página. Si sigue pasando, inténtalo de nuevo en unos minutos.",
    reload: "Volver a cargar",
  },
};
