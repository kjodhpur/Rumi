import type { Messages } from "../en";

export const consent: Messages["consent"] = {
  share_with_housing: {
    title: "Compartir mis resultados de Rumi con {office}",
    shares:
      "Tu nombre, correo escolar, identificación estudiantil (si la agregas), puntuaciones de compatibilidad, tu grupo y el estado del acuerdo de convivencia, para que el personal te ayude a ubicarte y vincule tu grupo de Rumi con tu solicitud de vivienda. Sin esto, solo ven totales que te incluyen.",
  },
  checkins: {
    title: "Seguimientos de convivencia",
    shares:
      "Preguntas breves después de mudarte. Tus respuestas son privadas, salvo que también decidas compartirlas con tu RA.",
  },
  research_outcomes: {
    title: "Ayudar a mejorar las compatibilidades",
    shares:
      "Resultados anónimos (puntuaciones y si una pareja de compañeros funcionó) para estudiar qué hace que la convivencia funcione. Nunca tu nombre ni tus mensajes.",
  },
  sms: {
    title: "Mensajes de texto",
    shares: "Recordatorios de fechas límite por texto. Responde STOP cuando quieras.",
  },
  calendar: {
    title: "Calendario",
    shares:
      "Solo horarios libres u ocupados, para sugerir cuándo reunirse. Nunca detalles de eventos.",
  },
  social_verification: {
    title: "Conexiones en común",
    shares:
      'Personas que ambos confirmaron conocer, mostradas como "conexiones en común" a estudiantes que también lo activaron.',
  },
  family_view: {
    title: "Las familias de mis compañeros pueden ver mi nombre",
    shares:
      'Si un compañero comparte un enlace familiar, muestra tu nombre y foto. Sin esto apareces como "El compañero de tu estudiante".',
  },
};
