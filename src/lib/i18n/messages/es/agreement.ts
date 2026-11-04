import type { Messages } from "../en";

export const agreement: Messages["agreement"] = {
  title: "Acuerdo de convivencia",
  you: "Tú",
  roommate: "Un compañero",
  version: " · versión {n}",
  staleTitle: "Tu grupo cambió",
  startTitle: "Empieza con un borrador",
  staleBody:
    "El acuerdo anterior era para otras personas. Empiecen uno nuevo para todos los que están ahora en el grupo.",
  startBody:
    "Redactaremos horas de silencio, tareas, visitas y más a partir de las respuestas de todos, además de lo que sus compatibilidades marcaron para conversar. Editen lo que quieran y luego firmen juntos.",
  draftReady: "Borrador listo",
  start: "Empezar el acuerdo",
  acceptedAll: "Aceptaste todas las secciones",
  signedAll: "Firmado por todos",
  savePdf: "Guardar como PDF",
  reopenedToast: "Reabierto. Editen y vuelvan a firmar.",
  reopen: "Reabrir",
  signed: "Firmado",
  signedAllHint: "Guarda una copia en PDF cuando quieras.",
  signedHint: "Esperaremos a los demás.",
  sectionsAgreed: "{agreed} de {total} secciones acordadas",
  reopened: "Reabierto",
  agreedWhen: "Una sección queda acordada cuando tú y {names} aceptaron el mismo texto.",
  and: " y ",
  acceptAll: "Aceptar las {count}",
  agreed: "Acordado",
  acceptedOf: "{count} de {total} aceptaron",
  saveChange: "Guardar cambio",
  cancel: "Cancelar",
  savingAsks: "Al guardar, se les pide a los demás que acepten tu versión.",
  changedBy: "Cambiado por {name}",
  formerMember: "un exmiembro",
  formerMemberStart: "Un exmiembro",
  hideChanges: "Ocultar cambios",
  showChanges: "Mostrar cambios",
  whatChanged: "Qué cambió",
  added: "Agregado: ",
  removed: "Eliminado: ",
  youAccepted: "Aceptaste",
  accept: "Aceptar",
  editAria: "Editar {title}",
  edit: "Editar",
  sign: "Firmar",
  signOpens: "La firma se habilita cuando todos hayan aceptado cada sección.",
  waiting: {
    one: "Firmaste. Falta {count} persona más.",
    other: "Firmaste. Faltan {count} personas más.",
  },
  typeName: "Escribe tu nombre completo",
  signAgreement: "Firmar el acuerdo",
  comments: { one: "{count} comentario", other: "{count} comentarios" },
  comment: "Comentar",
  delete: "Eliminar",
  addComment: "Agregar un comentario",
  commentPlaceholder: "Haz una pregunta o sugiere un ajuste",
  post: "Publicar",
  print: {
    hint: "Usa el diálogo de impresión de tu navegador y elige “Guardar como PDF”.",
    button: "Imprimir o guardar PDF",
    kicker: "Acuerdo de convivencia de Rumi",
    version: "Versión {n}",
    signedOn: "Firmado el {date}",
    notSigned: "Aún sin firmar",
    signatures: "Firmas",
    noSignatures: "Todavía no hay firmas.",
    disclaimer:
      "Un entendimiento compartido entre compañeros de cuarto, hecho en Rumi. No es un contrato de alquiler ni un contrato legal.",
  },
  sections: {
    sleep: "Sueño y horas de silencio",
    cleaning: "Limpieza y tareas",
    guests: "Visitas y pernoctaciones",
    noise: "Ruido",
    shared: "Cosas compartidas y comida",
    substances: "Fumar, beber y mascotas",
    study: "Tiempo de estudio",
    temperature: "Temperatura",
    conflict: "Cuando algo nos molesta",
    talk: "Para conversar",
  },
  draft: {
    weeknight: {
      t0: "las 10 p. m.",
      t1: "las 10:30 p. m.",
      t2: "las 11 p. m.",
      t3: "la medianoche",
      t4: "la 1 a. m.",
    },
    weekend: {
      t0: "las 11 p. m.",
      t1: "las 11:30 p. m.",
      t2: "la medianoche",
      t3: "la 1 a. m.",
      t4: "las 2 a. m.",
    },
    sleep:
      "Las horas de silencio empiezan a {weeknight} entre semana y a {weekend} los fines de semana. Durante las horas de silencio usamos audífonos y no hacemos llamadas en los espacios compartidos.",
    cleaningTidy:
      "Los espacios compartidos se ordenan un poco todos los días y los platos se lavan el mismo día. Rotamos baño, cocina y basura cada semana.",
    cleaning:
      "Los platos se lavan en un día como máximo. Rotamos baño, cocina y basura cada semana.",
    guestsAsk:
      "Avisamos por mensaje antes de recibir visitas. Nadie se queda a dormir sin preguntar antes cada vez.",
    guests: {
      one: "Avisamos por mensaje antes de recibir visitas. Visitas a dormir como máximo {count} noche por semana, y nunca durante los exámenes de la otra persona.",
      other:
        "Avisamos por mensaje antes de recibir visitas. Visitas a dormir como máximo {count} noches por semana, y nunca durante los exámenes de la otra persona.",
    },
    noiseQuiet:
      "Mantenemos la música y la tele bajas en los espacios compartidos y usamos audífonos para juegos y llamadas.",
    noise:
      "Música y tele a volumen normal en los espacios compartidos; audífonos después de las horas de silencio.",
    shared:
      "Las compras de comida son por separado salvo que acordemos otra cosa. Lo básico compartido (jabón, papel higiénico, toallas de papel) se divide en partes iguales y lo compramos por turnos. Preguntamos antes de pedir prestado.",
    noSmoke: "No se fuma ni se vapea adentro.",
    smokeOutside: "Solo se fuma afuera, lejos de las ventanas.",
    drinkLow: "Beber en casa es algo tranquilo, y preguntamos antes de invitar amigos a beber.",
    drinkFine: "Beber en casa está bien con moderación; preguntamos antes de recibir gente.",
    petStays:
      "La mascota de {names} no entra en los cuartos de los demás, y su dueño se encarga de todo su cuidado.",
    petOwners: "Quien tiene mascota se encarga de su cuidado y de limpiar lo que ensucie.",
    noNewPets: "Nada de mascotas nuevas salvo que todos estemos de acuerdo antes.",
    study:
      "Durante las semanas de exámenes hay silencio desde {time}. Nos avisamos de las entregas importantes.",
    temperature:
      "El termostato se mantiene entre 72 y 78 °F (22–26 °C) salvo que todos acordemos otra cosa. Ventanas cerradas cuando el aire acondicionado está prendido.",
    conflict:
      "Lo hablamos en unos pocos días, en persona y con calma. Si no podemos resolverlo entre nosotros, le pedimos ayuda a nuestro RA.",
    talk: "Nuestras compatibilidades marcaron estas diferencias. Ya las conversamos:",
  },
};
