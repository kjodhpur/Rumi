import type { Messages } from "../en";

export const matching: Messages["matching"] = {
  yourAnswers: "Tus respuestas",
  answered: "{answered} de {total}",
  progress: "Situaciones respondidas",
  required:
    "Tu oficina de vivienda le pregunta esto a todos. Puedes cambiar una respuesta cuando quieras en Configuración.",
  optional:
    "Opcional. Omite las que quieras; puedes cambiar o borrar una respuesta cuando quieras.",
  clear: "Borrar",
  changed: "Esta pregunta cambió. Respóndela de nuevo para que cuente.",
  onlyYou: "Solo tú ves esto. No cambia tu puntuación.",
  dismiss: "Descartar: {title}",
  consistency: {
    early_sleep_loud_home: {
      title: "Te duermes temprano, casa animada",
      message:
        "Te duermes temprano, pero te gusta tener música y tele encendidas casi siempre. Estas dos respuestas van en direcciones distintas. ¿Quieres ajustar alguna?",
    },
    quiet_study_loud_home: {
      title: "Estudio tranquilo, casa ruidosa",
      message:
        "Estudias en casa y necesitas calma, pero también te gusta el ruido en casa. ¿Qué pesa más una noche entre semana?",
    },
    quiet_study_many_guests: {
      title: "Estudio tranquilo, muchas visitas",
      message:
        "Amigos en casa casi todos los fines de semana o más, y un lugar tranquilo para estudiar. Las dos cosas pueden funcionar; ayuda decir cuál va primero.",
    },
    spotless_many_guests: {
      title: "Impecable, con visitas todo el tiempo",
      message:
        "Tener todo siempre en su lugar con amigos en casa todo el tiempo es mucho trabajo. ¿Alguna de las dos es más un deseo que un hábito?",
    },
    everything_must: {
      title: "Todo es esencial",
      message:
        'Todos los factores están en "tiene que coincidir", lo que reduce mucho tu lista. La mayoría elige dos o tres que de verdad importan.',
    },
    ideal_everything: {
      title: "El compañero perfecto",
      message:
        "Impecable, tranquilo, casi sin visitas, sin fumar ni tomar, y todo esencial. Las respuestas sinceras dan mejores compatibilidades que las ideales. ¿Quieres revisarlas?",
    },
  },
};
