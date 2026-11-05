import type { Messages } from "../en";

export const retention: Messages["retention"] = {
  mediation: {
    heading: "Hablarlo",
    intro:
      "La mayoría de los malos momentos se arreglan con una conversación honesta. Aquí tienes por dónde empezar.",
    copyFailed: "No se pudo copiar.",
    agreementSays: "Su acuerdo dice: ",
    editSend: "Editar y enviar",
    openAgreement: "Abrir su acuerdo",
    askRa: "Pedirle ayuda a mi RA",
    tips: {
      noise: {
        title: "Ruido",
        advice:
          "Hablen de horarios concretos (“después de las 11 entre semana”) en vez del ruido en general.",
        message:
          "Oye, ¿tienes unos minutos hoy? Quiero confirmar que seguimos de acuerdo sobre el ruido entre semana.",
      },
      cleanliness: {
        title: "Limpieza y tareas",
        advice:
          "Señala la rotación, no a la persona. Ofrecer ordenar un espacio juntos baja la tensión.",
        message:
          "¿Podemos dedicar diez minutos esta noche a ordenar la cocina juntos y revisar otra vez la rotación de tareas?",
      },
      guests: {
        title: "Visitas y pernoctaciones",
        advice:
          "Acuerden avisarse con tiempo, como un mensaje unas horas antes, para que nadie se sorprenda.",
        message:
          "¿Podemos acordar avisarnos por mensaje antes de que alguien se quede a dormir? Me ayudaría a planear mis mañanas.",
      },
      schedule: {
        title: "Sueño y horarios",
        advice:
          "Los cambios pequeños ayudan más: una lámpara de escritorio, audífonos, una hora fija para apagar la luz entre semana.",
        message:
          "Este semestre tengo clases temprano. ¿Te funcionaría usar audífonos y una lámpara después de medianoche entre semana?",
      },
      communication: {
        title: "Hablarlo",
        advice: "Sácalo pronto y en persona. Pregúntale cómo le va antes de decir cómo te va a ti.",
        message:
          "¿Tienes diez minutos para sentarnos esta semana? Me gustaría ver cómo se siente el cuarto para los dos.",
      },
      other: {
        title: "La convivencia",
        advice: "Vuelvan juntos a su acuerdo y elijan lo que más necesita una actualización.",
        message:
          "¿Podemos tomarnos unos minutos para revisar otra vez nuestro acuerdo de convivencia y ver qué hay que actualizar?",
      },
    },
  },
  survey: {
    title: "Fin del periodo",
    description: "Cómo fue el año y si quieren mantener su grupo para el próximo.",
    answerFirst: "Responde las dos primeras preguntas.",
    thanks: "Gracias. Tus respuestas son tuyas; vivienda solo ve totales.",
    carried: "Tu grupo pasa al nuevo periodo",
    savedWaiting: "Guardado. Esperando a los demás.",
    saved: "Guardado",
    keepTitle: "¿Mantener {group} para {term}?",
    everyoneIn: "Todos dijeron que volverían a compartir cuarto.",
    leaving: {
      one: "{names} no compartirá cuarto el próximo año, así que hay lugar para alguien nuevo.",
      other: "{names} no compartirán cuarto el próximo año, así que hay lugar para alguien nuevo.",
    },
    oneTap: "Con un toque de cada uno, el grupo sigue como una pareja confirmada.",
    someone: "Alguien",
    and: " y ",
    you: "Tú",
    roommate: "Compañero",
    keptSr: " mantuvo el grupo",
    saidNoSr: " dijo que no",
    notAnsweredSr: " todavía no responde",
    keep: "Mantener nuestro grupo",
    notThisTime: "Esta vez no",
    waitingAll: "Esperando las respuestas de fin de periodo de todos.",
    fresh:
      "Menos de dos de ustedes quieren volver a compartir cuarto, así que la búsqueda empieza de nuevo, con tus respuestas ya completadas.",
    noTerm: "Tu oficina de vivienda todavía no configuró el periodo actual.",
    opensOn:
      "La encuesta de fin de periodo abre tres semanas antes de que termine {term} ({date}).",
    howDid: "{term}: ¿cómo les fue?",
    fourQuestions:
      "Cuatro preguntas. Tus respuestas son privadas; tu oficina de vivienda solo ve totales.",
    again: "¿Volverías a compartir cuarto con ellos?",
    yes: "Sí",
    maybe: "Tal vez",
    no: "No",
    overall: "En general, ¿cómo fue la convivencia?",
    rough: "{n} · difícil",
    great: "{n} · genial",
    friction: "Mayor roce",
    frictionHint: "Opcional. Hasta tres.",
    frictionTags: {
      noise: "Ruido",
      guests: "Visitas",
      cleanliness: "Limpieza",
      schedule: "Horarios",
      communication: "Comunicación",
      other: "Otra cosa",
    },
    win: "Mayor logro",
    winHint: "Opcional.",
    update: "Actualizar respuestas",
    send: "Enviar respuestas",
  },
};
