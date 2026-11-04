import type { Messages } from "../en";

/** Rumi's default scenario questions. School-added questions show as written. */
export const scenarios: Messages["scenarios"] = {
  partner_overnight: {
    stem: "La pareja de tu compañero se queda a dormir tres noches por semana.",
    topic: "visitas que se quedan a dormir",
    choices: {
      fine: {
        label: "Me parece totalmente bien",
        reason: "A los dos les da igual que haya visitas que se queden a dormir",
      },
      talk_first: {
        label: "Está bien si lo hablamos antes",
        reason: "Los dos querrían hablar antes de las visitas que se quedan a dormir",
      },
      too_often: {
        label: "A veces está bien, pero tres noches es mucho",
        reason: "A los dos les parece demasiado varias noches por semana",
      },
      not_okay: {
        label: "No está bien para mí",
        reason: "Ninguno de los dos quiere visitas frecuentes que se queden a dormir",
      },
    },
  },
  dishes: {
    stem: "Quedan platos sucios en el fregadero toda la noche.",
    topic: "platos en el fregadero",
    choices: {
      no_big_deal: {
        label: "No pasa nada, ya se lavarán",
        reason: "A ninguno de los dos le molesta que los platos esperen un día",
      },
      next_day: {
        label: "Está bien si se lavan al día siguiente",
        reason: "Los dos quieren los platos lavados en un día",
      },
      mention: {
        label: "Lo comentaría en la mañana",
        reason: "Los dos mencionarían los platos sin lavar",
      },
      before_bed: {
        label: "Los platos se lavan antes de dormir",
        reason: "Los dos quieren el fregadero vacío antes de dormir",
      },
    },
  },
  thursday_night: {
    stem: "Son las 11 de la noche de un jueves y tu compañero tiene amigos en casa riéndose fuerte.",
    topic: "ruido entre semana",
    choices: {
      join: {
        label: "Seguramente me uniría",
        reason: "A los dos les gusta un ambiente animado, incluso entre semana",
      },
      wrap_up: {
        label: "Está bien si termina a medianoche",
        reason: "Los dos querrían que el ruido entre semana termine a medianoche",
      },
      headphones: {
        label: "Me pondría audífonos, pero lo comentaría",
        reason: "Los dos prefieren noches tranquilas entre semana",
      },
      quiet: {
        label: "Las noches entre semana deberían ser tranquilas",
        reason: "Los dos quieren noches tranquilas entre semana",
      },
    },
  },
  finals_group: {
    stem: "Durante los finales, tu compañero quiere hacer un grupo de estudio en el cuarto.",
    topic: "estudiar en el cuarto",
    choices: {
      love_it: {
        label: "Genial, me uno",
        reason: "A los dos les gusta estudiar con gente alrededor",
      },
      heads_up: {
        label: "Está bien si me avisa antes",
        reason: "Los dos querrían un aviso antes de un grupo de estudio",
      },
      library: {
        label: "Me iría a la biblioteca",
        reason: "Los dos llevarían un grupo de estudio a otro lugar",
      },
      keep_quiet: {
        label: "El cuarto debe estar en silencio durante los finales",
        reason: "Los dos quieren el cuarto en silencio durante los finales",
      },
    },
  },
  bathroom: {
    stem: "El baño compartido está desordenado a mitad de semana.",
    topic: "limpiar el baño",
    choices: {
      dont_notice: {
        label: "La verdad, no lo notaría",
        reason: "A ninguno de los dos le preocupa un baño desordenado",
      },
      weekend: {
        label: "Lo limpiamos el fin de semana",
        reason: "Los dos limpiarían el baño cada semana",
      },
      every_few_days: {
        label: "Una limpieza rápida cada pocos días",
        reason: "A los dos les gusta una limpieza rápida cada pocos días",
      },
      right_away: {
        label: "Se limpia de inmediato",
        reason: "Los dos mantienen el baño impecable",
      },
    },
  },
  early_alarm: {
    stem: "La alarma de tu compañero suena a las 6:30 de la mañana entre semana.",
    topic: "alarmas temprano",
    choices: {
      already_up: { label: "Seguramente ya estoy despierto", reason: "Los dos madrugan" },
      fine_weekdays: {
        label: "Está bien entre semana",
        reason: "A los dos les parecen bien las alarmas temprano entre semana",
      },
      no_snooze: {
        label: "Está bien, mientras no la posponga",
        reason: "Los dos querrían que la alarma se apague rápido",
      },
      bothers_me: {
        label: "Me molestaría mucho",
        reason: "Ninguno de los dos quiere alarmas temprano",
      },
    },
  },
  late_lamp: {
    stem: "Es la 1 de la mañana y tu compañero sigue despierto con la lámpara encendida.",
    topic: "noches con la luz encendida",
    choices: {
      me_too: { label: "Yo también sigo despierto", reason: "Los dos se acuestan tarde" },
      dim: {
        label: "Está bien si es una luz tenue",
        reason: "A los dos les parece bien una luz tenue de noche",
      },
      dark_by_midnight: {
        label: "Necesito oscuridad a medianoche",
        reason: "Los dos quieren las luces apagadas a medianoche",
      },
    },
  },
  weekend_visitor: {
    stem: "Un amigo de tu ciudad quiere dormir en el piso el fin de semana.",
    topic: "visitas de fin de semana",
    choices: {
      of_course: { label: "Claro que sí", reason: "A los dos les gusta recibir amigos" },
      heads_up: {
        label: "Sí, con aviso previo",
        reason: "Los dos querrían un aviso antes de que alguien se quede",
      },
      rarely: { label: "Solo de vez en cuando", reason: "Los dos prefieren visitas ocasionales" },
      rather_not: {
        label: "Prefiero que no",
        reason: "Ninguno de los dos quiere visitas que se queden a dormir",
      },
    },
  },
};
