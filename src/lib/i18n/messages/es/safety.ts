import type { Messages } from "../en";

export const safety: Messages["safety"] = {
  report: {
    choose: "Elige qué está pasando.",
    thanks: "Gracias por contarnos",
    thanksBody: "Nuestro equipo de seguridad revisa cada reporte. {name} no sabrá que fuiste tú.",
    sentTo: " Lo enviamos a {office}.",
    title: "Reportar a {name}",
    description:
      "Los reportes son confidenciales. Si estás en peligro inmediato, llama al 911 o a {police} al {phone}.",
    submitForward: "Enviar y reenviar el reporte",
    submit: "Enviar reporte",
    disclaimer:
      "Rumi es una plataforma entre pares y no reemplaza la seguridad del campus, la policía, Title IX ni la atención de emergencia. En una emergencia, llama de inmediato al 911 o a la policía del campus.",
    urgent: "¿Seguridad urgente o reporte oficial?",
    urgentHint: "Envíalo a Title IX, CARE o seguridad de emergencia del campus",
    urgentToggle: "Activar el reporte urgente de seguridad",
    category: "Tipo de incidente",
    categoryAria: "Tipo de incidente grave",
    destination: "Destino oficial:",
    reportingPage: "Página oficial para reportar",
    contacts: "Contactos de emergencia nacionales y del campus",
    noRoute:
      "Tu escuela no configuró adónde van estos reportes, así que no se avisa a ninguna oficina del campus. El equipo de Rumi lo revisa, y puedes comunicarte directamente con estos servicios:",
    sendTo: "Enviar esto a {office}",
    sendToEmail:
      "Les enviaremos por correo lo que escribas, el mensaje reportado, y tu nombre y correo escolar para que puedan dar seguimiento.",
    sendToNoEmail:
      "No reciben reportes por correo. Usa su teléfono o su página para reportar arriba.",
    forwardAria: "Reenviar el reporte a {office}",
    blockNow: "Bloquear a {name} de inmediato",
    blockNowHint: "No podrá escribirte ni ver tu perfil",
    blockAria: "Bloquear a {name}",
    reason: "Motivo del reporte",
    details: "Detalles adicionales (opcional)",
    detailsAria: "Detalles (opcional)",
    detailsPlaceholder: "Cualquier cosa que nos ayude a entender qué pasó...",
  },
  categories: {
    harassment: {
      label: "Acoso o conducta sexual inapropiada",
      description: "Avances sexuales no deseados, acecho, coerción o acoso grave o persistente.",
    },
    threat: {
      label: "Amenaza de daño o violencia",
      description: "Amenazas físicas, armas, señales de autolesión o peligros inmediatos.",
    },
    discrimination: {
      label: "Discriminación o incidente de prejuicio",
      description:
        "Hostilidad dirigida por raza, religión, género, discapacidad u otra condición protegida.",
    },
    wellbeing: {
      label: "Bienestar o salud mental",
      description:
        "Un compañero o estudiante con angustia emocional aguda, aislamiento o que necesita que alguien lo revise.",
    },
    general: {
      label: "Problema urgente de seguridad en la vivienda",
      description:
        "Peligro urgente en las instalaciones, riesgo de pelea física o quedarse afuera fuera de horario.",
    },
  },
  resources: {
    emergency: "911 Emergencias",
    crisis: "988 Línea de Prevención del Suicidio y Crisis",
    rainn: "Línea de RAINN contra la agresión sexual",
    dv: "Línea Nacional contra la Violencia Doméstica",
  },
  block: {
    blocked: "Bloqueaste a {name}",
    blockedHint: "Puedes desbloquearlo en Configuración → Privacidad.",
    title: "¿Bloquear a {name}?",
    description:
      "No se verán en ninguna parte de Rumi y cualquier chat entre ustedes se cierra. No se le avisa.",
    cancel: "Cancelar",
    block: "Bloquear",
    tip: "Si hizo algo indebido, considera reportarlo también: ayuda a mantener a todos seguros.",
  },
};
