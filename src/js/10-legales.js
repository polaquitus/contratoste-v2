// ===== MODULO LEGALES: edición versionada del texto de cada cláusula del =====
// ===== modelo de Condiciones Particulares, usado luego para armar el Word =====
(function(){
  var CLAUSE_ORDER=['c1','c2','c3','c4','c5','c6','c7','c8','c9','c10','c11','c12','c13'];
  var CLAUSE_TITLES={
    c1:'1. Descripción', c2:'2. Horario de Trabajos', c3:'3. Duración', c4:'4. Precio',
    c5:'5. Facturación y Pago', c6:'6. Obligaciones de la Compañía', c7:'7. Obligaciones del Oferente',
    c8:'8. Cesión Contractual / Cambio de Control', c9:'9. Política de Higiene, Seguridad y Preservación del Medio Ambiente',
    c10:'10. Salud, Seguridad, Responsabilidad Social, Seguridad Física y Medio Ambiente',
    c11:'11. Principios Fundamentales de Contratación', c12:'12. Requerimientos de Ciberseguridad',
    c13:'13. Valor Económico'
  };
  var BLOCK_TYPE_LABEL={title:'Título',subtitle:'Subtítulo',p:'Párrafo',item:'Ítem de lista'};
  var BLOCK_TYPE_COLOR={title:'#1d4ed8',subtitle:'#7c3aed',p:'#6b7280',item:'#0f766e'};
  var SHOWIF_LABEL={
    'alcance:asr':'Solo si Alcance incluye Aguada San Roque',
    'alcance:api':'Solo si Alcance incluye Aguada Pichana',
    'alcance:tdf':'Solo si Alcance incluye Tierra del Fuego',
    'alcance:nqn':'Solo si Alcance incluye Neuquén',
    'alcance:ba_nqn':'Solo si Alcance incluye Neuquén o Buenos Aires',
    'fondoGarantia:true':'Solo si el contrato lleva Fondo de Garantía',
    'fondoGarantia:false':'Solo si el contrato NO lleva Fondo de Garantía',
    'hasPoly:true':'Solo si el contrato tiene fórmula polinómica',
    'trigA:true':'Solo si está activo el Gatillo A (mano de obra / CCT)',
    'trigB:true':'Solo si está activo el Gatillo B (variación acumulada)'
  };
  function showIfLabel(showIf){
    if(!showIf)return null;
    var k=Object.keys(showIf)[0];
    return SHOWIF_LABEL[k+':'+showIf[k]] || (k+'='+showIf[k]);
  }

  // Seed inicial — se usa solo la primera vez que se abre el módulo y la tabla
  // clause_templates está vacía. Texto extraído del modelo de Condiciones
  // Particulares subido por el usuario.
  var CLAUSE_SEED= {
  c1: {
    title: 'Descripción',
    blocks: [
      {type:'p', text:'Los servicios arriba mencionados seran prestados por el OFERENTE dentro de Horas / Días de emitido el Pedido de Ejecución por la COMPAÑIA, comprometiéndose el OFERENTE a:'},
      {type:'item', text:'a) Realizar el servicio según las tarifas indicadas en el Articulo 4.'},
      {type:'item', text:'b) Proveer todos los equipos y productos que sean necesarios.'},
      {type:'item', text:'c) Cumplir con los horarios de trabajo que se le especifiquen.'},
      {type:'p', text:'Además, queda convenido que la COMPAÑIA no asume obligación alguna de solicitar los servicios del OFERENTE. Unicamente se contratarán dichos servicios cuando la COMPAÑIA lo requiera al OFERENTE, emitiendo el Pedido de Ejecución correspondiente.'}
    ]
  },
  c2: {
    title: 'Horario de Trabajos',
    blocks: [
      {type:'p', text:'Las actividades objeto del presente contrato deberán realizarse dentro del horario establecido por LA COMPAÑÍA, el cual será {{HORARIO}}.'},
      {type:'p', text:'Todas las actividades deberán ser previamente acordadas con el representante de LA COMPAÑÍA. Cualquier trabajo fuera de este horario requerirá autorización expresa, previamente acordada por el representante de LA COMPAÑÍA.'}
    ]
  },
  c3: {
    title: 'Duración',
    blocks: [
      {type:'title', text:'3.1 Fecha de Inicio y fin del contrato'},
      {type:'p', text:'Fecha de inicio: {{FECHA_INICIO}}'},
      {type:'p', text:'Fecha de finalización: {{FECHA_FIN}}'},
      {type:'title', text:'3.2 Período operacional'},
      {type:'p', text:'El período operacional que transcurre entre la fecha de inicio y la fecha de terminación será de {{PLAZO}}.'},
      {type:'title', text:'3.3 Opción a prórroga'},
      {type:'p', text:'La COMPAÑIA podrá prorrogar el período operacional por un plazo similar o inferior, notificando su decisión al OFERENTE por escrito y con un aviso de 30 dias previos a la fecha de terminación del período operacional en curso, entendiendo que, durante tal extensión la COMPAÑIA tendrá derecho si el OFERENTE utilizara los mismos equipos / herramientas, etc., a solicitar la reducción del precio / tarifas en base a las amortizaciones de los mismos u otros conceptos, ya absorbidos durante el presente OFERTA.'}
    ]
  },
  c4: {
    title: 'Precio',
    blocks: [
      {type:'title', text:'4.1 Guía para revisión equitativa de precios y fórmula polinómica', showIf:{hasPoly:true}},
      {type:'p', text:'A los fines de mantener el equilibrio de la ecuación económico-financiera del presente contrato, el Contratista aplicará la fórmula polinómica informada en su propuesta, utilizando la distribución porcentual de los componentes e índices que forman parte de su estructura de costos, según lo declarado y aceptado por la Compañía.', showIf:{hasPoly:true}},
      {type:'p', text:'La proporción establecida se mantendrá sin modificaciones durante toda la vigencia del contrato.', showIf:{hasPoly:true}},
      {type:'p', text:'Los ajustes de tarifas se realizarán conforme al siguiente procedimiento:', showIf:{hasPoly:true}},
      {type:'title', text:'DETERMINACIÓN DE LOS % DE INCIDENCIA', showIf:{hasPoly:true}},
      {type:'p', text:'El Contratista ha definido los porcentajes de incidencia sobre el precio total del contrato para los conceptos que integran la fórmula polinómica, los cuales serán la base para cualquier redeterminación de precios.', showIf:{hasPoly:true}},
      {type:'title', text:'METODOLOGÍA DE REDETERMINACIÓN', showIf:{hasPoly:true}},
      {type:'p', text:'Una vez comenzada la ejecución del servicio, las partes acuerdan redeterminar las tarifas en las siguientes opciones:', showIf:{hasPoly:true}},
      {type:'subtitle', text:'OPCION A)', showIf:{trigA:true}},
      {type:'p', text:'En caso de verificarse una variación del componente de mano de obra de la estructura de costo consensuada con origen en acuerdos salariales homologados por el Ministerio de Trabajo de la Nación, en cuyo caso se revisará el precio del servicio en un todo de acuerdo a la estructura de costo mencionada, con los plazos de validez estipulados en la referida homologación.', showIf:{trigA:true}},
      {type:'subtitle', text:'OPCION B)', showIf:{trigB:true}},
      {type:'p', text:'Cuando exista una variación acumulada de quince por ciento (15%) en más o en menos de los costos del servicio conforme surja de la estructura de costo y la evolución de los índices asociados, considerando dicha variación acumulada partir del mes base (mes0) o desde la última redeterminación del precio acordada por las Partes.', showIf:{trigB:true}},
      {type:'p', text:'Las siguientes condiciones serán complementarias a lo expuesto precedentemente:'},
      {type:'item', text:'I. Los pagos adicionales remunerativos o no remunerativos, por única vez o según la frecuencia determinado por el gremio, que sean acordados por convenio y homologados serán reconocidos como reembolsable al costo más los impuestos aplicables.'},
      {type:'item', text:'II. No serán reconocidas variaciones que surjan de acuerdos particulares entre el Contratista y sus empleados o el gremio (ej: premios de por productividad).'},
      {type:'item', text:'III. El Contratista presentará a la Compañía el análisis de variaciones a fin de que la Compañía lo analice y, en caso de estar de acuerdo, lo apruebe. El Contratista deberá presentar el soporte documental razonablemente requerido por la Compañía.'},
      {type:'item', text:'IV. Cuando la Compañía haya otorgado Anticipos Financieros en Pesos Argentinos, los ajustes a los valores certificados mensualmente serán realizados sobre los valores resultantes de descontar a dichos valores certificados la porción correspondiente al desacopio del anticipo. Es decir, no se ajustará el 100% del valor certificado, sino que se ajustará el 100% menos el valor del desacopio aplicable. El anticipo otorgado no estará sujeto a redeterminaciones.'},
      {type:'item', text:'V. Cuando la Compañía haya otorgado Anticipos Financieros, en el caso de terminación anticipada del Contrato, el Contratista deberá devolver a la Compañía el monto de los anticipos aún no desacopiados. A tal fin, el Contratista no devolverá los montos a su valor nominal, sino que dicho monto será actualizado con el Factor de Actualización Total a la fecha de la terminación. La compañía descontará este monto de cualquier factura que el Contratista tenga pendiente de cobro. Asimismo, si las facturas pendientes no alcanzaran a cubrir dicho monto, el Contratista emitirá una Nota de Crédito a favor de la Compañía y pagará el valor adeudado en un plazo máximo de 15 días.'},
      {type:'item', text:'VI. Cuando el plazo de servicio / obra supere lo indicado en el contrato no se realizará ajuste alguno sobre los periodos posteriores al plazo indicado.'}
    ]
  },
  c5: {
    title: 'Facturación y Pago',
    blocks: [
      {type:'p', text:'Las Condiciones de Facturación y Pago correspondientes al presente OFERTA, deberán ser facturadas a la/s U.T./s:'},
      {type:'p', text:'Estas U.T./s anulan y reemplazan a las que se mencionan en las Condiciones Generales de Contratación de Obras y Servicios, Sección 2 de Facturación y Pago (versión 2019):'},
      {type:'subtitle', text:'TOTAL AUSTRAL S.A.', showIf:{alcance:'ba_nqn'}},
      {type:'p', text:'Moreno 877 - Piso 17, 1091 - Bs.As. IVA - C.U.I.T. Nº 30-56971934-4. Responsable Inscripto. TOTAL AUSTRAL.', showIf:{alcance:'ba_nqn'}},
      {type:'subtitle', text:'YACIMIENTO AREA CUENCA AUSTRAL I - TIERRA DEL FUEGO', showIf:{alcance:'tdf'}},
      {type:'p', text:'Moreno 877 - Piso 17, 1091 - Bs.As. IVA - C.U.I.T. Nº 30-63681824-7. Responsable Inscripto. TOTAL AUSTRAL S.A. - WINTERSHALL DEA ARGENTINA S.A. - PAN AMERICAN ENERGY LLC (SUCURSAL ARGENTINA) - YPF S.A.', showIf:{alcance:'tdf'}},
      {type:'subtitle', text:'"SAN ROQUE U.T."', showIf:{alcance:'asr'}},
      {type:'p', text:'Moreno 877 - Piso 17, 1091 - Bs.As. IVA - C.U.I.T. Nº 30-66331467-6. Responsable Inscripto. TOTAL AUSTRAL S.A. - WINTERSHALL DEA ARGENTINA S.A. - PAN AMERICAN ENERGY LLC (SUCURSAL ARGENTINA) - YPF S.A.', showIf:{alcance:'asr'}},
      {type:'subtitle', text:'"AGUADA PICHANA ESTE U.T."', showIf:{alcance:'api'}},
      {type:'p', text:'Moreno 877 - Piso 17, 1091 - Bs.As. IVA - C.U.I.T. Nº 30-67856451-2. Responsable Inscripto.', showIf:{alcance:'api'}},
      {type:'title', text:'Recepción de Facturas'},
      {type:'p', text:'Enviar un mail por factura a la siguiente dirección: ep.factura.electronica@mail01.totalenergies.com'},
      {type:'p', text:'Cada factura debe tener asignada una sola Orden de Compra (PO).'},
      {type:'p', text:'Dentro del PDF: en la primera hoja debe figurar la factura, y luego los remitos conformados o documentación complementaria.'},
      {type:'p', text:'Se debe indicar los números de Orden de Compra (PO), sin espacios, puntos, guiones o barras.'},
      {type:'p', text:'Para una correcta aplicación de las retenciones, indicar en qué provincia se brindó efectivamente el servicio.'},
      {type:'p', text:'Una vez enviada la factura a la casilla de email correspondiente, el estatus de esta o cualquier reclamo se debe realizar a través de la página web: http://www.cobranzas.com'},
      {type:'subtitle', text:'Fondo de Garantía:'},
      {type:'p', text:'Las Partes aceptan que la facturación de los Servicios contratados bajo el presente acuerdo, se efectuará de la siguiente forma: del Servicio prestado en el mes de realización, según lo establecido en las Condiciones de "Facturación y Pago" (Sección 2 - Versión Julio \'99); y el saldo restante del Servicio prestado en el mes de realización, (a) a los 60 días de haber finalizado el acuerdo, incluyendo cualquier prórroga o extensión, y después de haber presentado a satisfacción del OFERENTE la documentación probatoria de haber efectuado los pagos correspondientes a las indemnizaciones por despidos, o demostrado concluyentemente la ausencia de cualquier responsabilidad laboral alguna respecto del personal utilizado para la ejecución del servicio o (b) cuando se cumplan 2 años de la fecha en que el empleado del OFERENTE dejó de trabajar para la COMPAÑIA. En ambos casos, lo que ocurra en primer término, y no existiendo la posibilidad, a juicio de la COMPAÑIA, de que hayan otros reclamos laborales respecto de los cuales la COMPAÑIA pueda tener responsabilidad solidaria. El OFERENTE facturará el monto total acumulado en pesos. Si durante la vigencia de la OFERTA la COMPAÑIA reconociera la aplicabilidad de uno o varios reajustes salariales al personal que presta servicio básico, dicho porcentaje de ajuste reconocido por la COMPAÑIA, pasará a integrar y será parte del monto total acumulado en pesos del presente Fondo de Garantía. A los efectos del reconocimiento por parte de la COMPAÑIA del incremento del fondo de garantía, el ajuste anteriormente mencionado con el consiguiente incremento, deberán plasmarse a través de una enmienda a la OFERTA. A los 30 (treinta) días de haber presentado la factura por el monto total acumulado en pesos, y de no existir reclamo alguno relacionado con la misma ni posibilidades a juicio de la COMPAÑIA de que existan reclamos posteriores, la COMPAÑIA precederá a su pago. Si durante el transcurso del acuerdo, la COMPAÑIA demostrase que el porcentaje a facturar al final del acuerdo no alcanzara a cubrir los riesgos por los cuales fue establecido, la COMPAÑIA podrá modificar este porcentaje hasta su real incidencia. La COMPAÑIA tendrá el derecho de retener tales montos por todo el tiempo que entienda subsista una situación de riesgo de juicios o reclamos laborales, y podrá compensar con las sumas así retenidas los montos que se vea obligada a pagar en tales conceptos cuando tales obligaciones se conviertan en líquidas y exigibles. La COMPAÑIA podrá compensar asimismo contra las sumas retenidas todos los gastos incurridos en proceder a su propia defensa en juicio, incluyendo costos de abogados internos y externos. Esta compensación no enervará el derecho de la COMPAÑIA de proceder a reclamar del OFERENTE las sumas faltantes, y los gastos de su defensa en juicio aquí referidos. NOTA: En caso de renovación o prórroga, por licitación o renegociación, este fondo de garantía no se facturará, sino que pasará a adicionarse al fondo de garantía del nuevo OFERTA.', showIf:{fondoGarantia:true}},
      {type:'p', text:'No requiere del Fondo de Garantía.', showIf:{fondoGarantia:false}},
      {type:'p', text:'El pago de las facturas se realizará en Pesos Argentinos. Las facturas correspondiente al Servicio expresadas en moneda extranjera, deberán ser expedidos en dicha moneda y serán pagados por la COMPAÑÍA en Pesos Argentinos al tipo de cambio vendedor (divisa), publicado por el Banco de la Nación Argentina, vigente al cierre de las operaciones del día hábil anterior a la fecha de la factura (que se define como "C" aquí abajo).'},
      {type:'p', text:'A efectos fiscales, el OFERENTE deberá dejar constancia en cada factura presentada el tipo de cambio de emisión de dicha factura.'},
      {type:'p', text:'Si en la fecha de pago de la factura correspondiente, existe una diferencia entre el tipo de cambio del día anterior a la fecha de pago ("B") y el tipo de cambio expresado en la factura ("C"), el OFERENTE emitirá un documento complementario (Nota Débito / Nota de Crédito), por la diferencia de cambio. A tal fin, la diferencia de cambio se calculará conforme a la siguiente fórmula:'},
      {type:'p', text:'Diferencia del tipo de cambio = RC - C. Dónde: RC = (( A * ( B - C ) ) / D ) + C. Siendo: RC = relación de la tasa de cambio; A = El importe de la factura expresado en moneda extranjera sin IVA (Impuesto al Valor Agregado); B = Tipo de cambio vendedor (divisa) del Banco de la Nación Argentina vigente al cierre de operaciones del día hábil anterior al día de pago; C = tipo de cambio vendedor (divisa) del Banco de la Nación Argentina vigente al cierre de las operaciones del día hábil anterior al día factura; D = importe de la factura en moneda extranjera con el IVA incluido.'},
      {type:'p', text:'En caso que corresponda emitir una Nota de Débito deberá ser presentada a la COMPAÑÍA dentro de los treinta (30) días de la fecha de pago de la factura correspondiente y deberá ser pagada por la COMPAÑÍA dentro de los quince (15) días de recepción. Por otra parte, en caso de que corresponda emitir una Nota de Crédito a favor de la COMPAÑÍA y la misma será deducida por la COMPAÑÍA en el pago inmediato posterior.'}
    ]
  },
  c6: {
    title: 'Obligaciones de la Compañía',
    blocks: [
      {type:'p', text:'La COMPAÑÍA se obliga a cumplir exclusivamente con las prestaciones, alcances y responsabilidades detalladas en la Sección 1 ("DESCRIPCIÓN") de la presente OFERTA, las cuales forman parte integrante del presente Contrato y constituyen el límite de sus obligaciones contractuales.'},
      {type:'p', text:'En consecuencia:'},
      {type:'item', text:'Alcance definido: La COMPAÑÍA no asumirá obligaciones adicionales, tácitas o implícitas que no se encuentren expresamente contempladas en la Sección 1, salvo acuerdo escrito y firmado por ambas partes.'},
      {type:'item', text:'Cumplimiento normativo: Todas las actividades se realizarán conforme a la legislación vigente y a las condiciones técnicas y operativas especificadas en la OFERTA.'},
      {type:'item', text:'Exclusión de responsabilidades: La COMPAÑÍA no será responsable por tareas, costos o gestiones ajenas al alcance definido, ni por demoras o incumplimientos derivados de causas imputables al OFERENTE o a terceros.'},
      {type:'item', text:'Modificaciones: Cualquier cambio en las obligaciones deberá formalizarse mediante enmienda contractual debidamente suscripta por ambas partes.'}
    ]
  },
  c7: {
    title: 'Obligaciones del Oferente',
    blocks: [
      {type:'p', text:'El Oferente será responsable de todas las tareas, compromisos y condiciones establecidas en la Descripción del Servicio.'},
      {type:'p', text:'El Oferente deberá garantizar el cumplimiento de los estándares de calidad, normativa vigente y requisitos técnicos aplicables a la prestación del servicio.'},
      {type:'p', text:'Las responsabilidades del Oferente se entienden integradas en la Descripción del Servicio, incluyendo aspectos operativos, administrativos y técnicos.'},
      {type:'title', text:'Seguros / Garantías'},
      {type:'p', text:'El OFERENTE deberá obtener todos los seguros que correspondan para cubrir sus responsabilidades, como por ejemplo los que se detallan a continuación a solo efecto enunciativo pero no limitativo.'},
      {type:'p', text:'Asimismo, el OFERENTE deberá completar el formulario "Situación de los Seguros" del ANEXO 1, al inicio de la contratación, y los mantendrá actualizados durante todo el Período Operacional de la misma.'},
      {type:'item', text:'a) Seguro Obligatorio y/o Autoseguro por la Ley de Riesgos del Trabajo (LRT): De acuerdo con las exigencias de las leyes de la República Argentina aplicables a la LRT Nº 24.557 el OFERENTE está obligado a adoptar las medidas legalmente previstas para prevenir eficazmente los riesgos del trabajo debiendo hallarse afiliado obligatoriamente a una Aseguradora de Riesgos del Trabajo, salvo que se encuentre bajo el régimen del autoseguro en cuyo caso deberá acreditar su inclusión en tal régimen de disposiciones que en el futuro las modifiquen, amplíen o sustituyan.'},
      {type:'p', text:'El OFERENTE tomará un seguro adicional para cubrir los aspectos de su responsabilidad civil hacia sus empleados que eventualmente no estén cubiertos por el sistema de la Ley 24.557 en la medida de su disponibilidad en el mercado asegurador argentino y de común acuerdo con la COMPAÑIA.'},
      {type:'p', text:'En todos los casos el OFERENTE presentará las constancias de afiliación a una ART o autoseguro y sus comprobantes de pago, por el personal asignado al presente Contrato y notificará en forma fehaciente las altas y bajas del mencionado personal, la que deberá contener las siguientes cláusulas:'},
      {type:'p', text:'Cláusula de no repetición: (...ART o empleador auto asegurado) renuncia en forma expresa a iniciar toda acción de repetición o de regreso contra la COMPAÑÍA y/o miembros UT/Consorcio y/o el principal (Nominar a las empresas que forman parte de la UTE/CONSORCIO) sus funcionarios, empleados y/u obreros, y/o contra ---------------- < ART: como se la definió en las Condiciones Particulares > bien sea con fundamentos en el art. 39.5 de la ley 24.557 o en cualquier otra norma jurídica, con motivo de las prestaciones en especie o dinerarias que se vea obligada a otorgar o abonar al personal dependiente o ex-dependiente de ---------------- (OFERENTE), alcanzado por la cobertura de la presente póliza, por accidentes de trabajo o enfermedades profesionales, sufridos o contraídos por el hecho o en ocasión del trabajo o en el trayecto entre el domicilio del trabajador y el lugar del trabajo.'},
      {type:'p', text:'---------------- ART se obliga a comunicar a la COMPAÑIA en forma fehaciente, los incumplimientos a la póliza en que incurra el asegurado y especialmente la falta de pago en término de esta, dentro de los diez días de verificados.'},
      {type:'item', text:'b) Seguro de Responsabilidad Civil contra terceros: Por todo daño que pueda causar la OFERENTE a terceras personas y/o cosas de terceros, incluyendo, pero no limitado a daños por contaminación, gastos de limpieza y descontaminación (súbita, imprevista y accidental) y por el uso de automotores en exceso de las pólizas específicas, sean o no de su propiedad, cuyo límite no será inferior a U$ 1.000.000.'},
      {type:'item', text:'I. En caso de no presentación del seguro de responsabilidad civil en un todo de acuerdo con los requerimientos de la COMPAÑIA, el OFERENTE podrá ser incorporado a la póliza global de responsabilidad civil contratada por la COMPAÑIA para cubrir los daños a terceros y a cosas propiedad de terceros por parte del OFERENTEs y SUBOFERENTES de la COMPAÑIA en la medida que dichos daños sean ocasionados durante y en ocasión de la ejecución de trabajos y/o servicios para la COMPAÑIA.'},
      {type:'item', text:'II. Por la incorporación a dicha póliza se efectuará un descuento del 0,33% al OFERENTE calculado sobre el monto de la OFERTA, efectuándose descuentos adicionales en caso de efectuarse prórrogas o ampliaciones al mismo. El descuento será efectuado en ocasión del pago por parte de la COMPAÑIA de la primera factura que presente el OFERENTE, una vez vencido el plazo establecido en las Condiciones Generales de Contratación.'},
      {type:'item', text:'III. Si con posterioridad a haberse efectuado el descuento mencionado en II, el OFERENTE presentase el seguro de responsabilidad civil en un todo de acuerdo con las exigencias de la COMPAÑIA, el monto descontado le será reintegrado mediante la emisión de una nota de crédito.'},
      {type:'item', text:'IV. FRANQUICIA: Se aplica a cada y toda ocurrencia y debe ser asumida por el OFERENTE. Su valor es de U$S 25.000.'},
      {type:'item', text:'c) Seguro Colectivo de Vida Obligatorio: Antes de iniciar los Servicios y sin requerimiento de la COMPAÑIA, el OFERENTE debe presentar y dar cumplimiento con las pólizas de seguro y comprobantes de pago de estas, de acuerdo con lo estipulado en el decreto Nro. 1576/74.'},
      {type:'item', text:'d) Seguro de Accidentes Personales: Los OFERENTEs y/o SubOFERENTEs que revistan calidad de autónomos contratará un seguro de Accidentes Personales con las siguientes condiciones:'},
      {type:'title', text:'Coberturas'},
      {type:'item', text:'Cobertura en caso de muerte- Invalidez: Recomendable USD 100.000 personal extranjero y local que trabaje en sitio.'},
      {type:'item', text:'Cobertura en caso de muerte- Invalidez: Recomendable USD 30.000 personal local que no trabaje en sitio (Realiza tareas administrativas-capacitaciones).'},
      {type:'item', text:'Contribución en los gastos de asistencia médico-farmacéutica: Recomendable USD 10.000 personal Extranjero y local que trabaje en sitio.'},
      {type:'item', text:'Contribución en los gastos de asistencia médico-farmacéutica: Recomendable USD 3.000 personal local que no trabaje en sitio (Realiza tareas administrativas-capacitaciones).'},
      {type:'item', text:'La extensión de la cobertura debe ser 24 hs. Para casos de trabajo en Yacimiento.'},
      {type:'item', text:'Para todos los demás casos, debe contar con cláusula de cobertura que cubra jornada laboral más in itinere.'},
      {type:'item', text:'Debe incluir como Beneficiario a Total Austral S.A y a la OFERENTE cuando sean SubOFERENTEs.'},
      {type:'item', text:'En caso de corresponder, la Póliza deberá contemplar las especificaciones necesarias inherentes al tipo de trabajo y riesgo al que esté expuesto la persona asegurada.'},
      {type:'p', text:'La Compañía se reserva el derecho de modificar los valores de cobertura a su criterio teniendo en cuenta cada caso en particular.'},
      {type:'item', text:'e) Seguro de Automotores: Todo vehículo deberá contar con un seguro de Responsabilidad Civil, robo, hurto, incendio y destrucción parcial y/o total. Los límites mínimos de coberturas para automotores, camionetas, ómnibus y camiones son los indicados por los topes establecidos para cada uno de estos por la Superintendencia de Seguros de la Nación (SSN: https://www.argentina.gob.ar/superintendencia-de-seguros) a la fecha de cierre de las Condiciones Particulares de Servicios. Durante la vigencia contractual, estos topes deberán actualizarse a los valores que establezca la SSN.'},
      {type:'p', text:'Para el caso que los vehículos transporten carga peligrosa, el seguro de Responsabilidad Civil deberá extenderse a cubrir dicho riesgo a los límites aquí especificados. Para el caso que los vehículos deban ingresar a zonas petrolíferas o aeropuertos, helipuertos u aeródromos, la cobertura de Responsabilidad Civil deberá extenderse a cubrir dichas circunstancias.'},
      {type:'p', text:'Las siguientes cláusulas adicionales indicadas en la Resolución N° 36100 y 36696 de la SSN deberán ser incluidas:'},
      {type:'item', text:'CG-RC 1.1 - Limites de indemnización (Riesgo Cubierto)'},
      {type:'item', text:'CA-RC 2.1 -- Unidades tractoras y/o remolcadas (la responsabilidad asumida por el Asegurador se mantiene cuando el vehículo asegurado, tratándose de una unidad con propulsión propia (tracción) está remolcando algún vehículo sin propulsión propia (acoplado) o tratándose de alguno de estos vehículos, este siendo remolcado, todo ello dentro del territorio de la República Argentina.'},
      {type:'item', text:'CG-RC 4.1 -- Costas y gastos'},
      {type:'item', text:'CA-RC 5.2 -- Limitación de la cobertura de responsabilidad civil hacia terceros transportados y no transportados de vehículos automotores que ingresen a campos petrolíferos, por suma no menor a la que resulte del límite de cobertura definido por la SSN para el seguro voluntario de la primera categoría de vehículos livianos.'},
      {type:'item', text:'CA-CO 13.1 -- Renuncia a la Subrogación: "Cláusula de no-repetición: (nombre de compañía aseguradora o empleador auto asegurado) renuncia en forma expresa a iniciar toda acción de repetición o de regreso contra Total Austral S.A. y/o miembros UTE/Consorcio y/o el principal, (nominar a las empresas que forman parte de la UTE/Consorcio) sus funcionarios, empleados y/u obreros, bien sea con fundamentos en el art. 39.5 de la Ley 24.557 o en cualquier otra norma jurídica, con motivo de las prestaciones en especie o dinerarias que se vea obligada a otorgar o abonar al personal dependiente o ex dependiente de (nombre del OFERENTE), alcanzado por la cobertura de la presente póliza por accidentes de trabajo o enfermedades profesionales, sufridos o contraído por el hecho o en ocasión del trabajo o en el trayecto entre el domicilio del trabajador y el lugar del trabajo.'},
      {type:'item', text:'CA-CO 13.2 -- Asegurados adicionales: Queda entendido y convenido que las personas físicas y/o jurídicas indicadas en el Frente de Póliza, serán consideradas asegurados, por el plazo allí indicado, siempre y cuando el siniestro ocurra con motivo y en ocasión de la prestación de un servicio por parte del asegurado en favor de (COMPAÑIA y UTES).'},
      {type:'item', text:'CA-CO 17.1 -- Notificación previa de la falta de pago del premio: El asegurador se obliga a notificar a la/las persona/s física/s y/o jurídica/s indicada/s en el Frente de Póliza cualquier omisión de pago en que incurriere el tomador y ello con una anticipación mínima de 30 días. La presente póliza no podrá ser modificada ni anulada sin previo aviso a la/las persona/s física/s y/o jurídica/s indicada/s en el Frente de la Póliza (COMPANIA y UTES).'},
      {type:'p', text:'Si transporta cargas peligrosas deberá incluir además las siguientes cláusulas:'},
      {type:'item', text:'CA-RC 3.2 -- Carga notoriamente muy inflamable, explosiva y/o corrosiva (Transporte de carga Peligrosa).'},
      {type:'item', text:'CA-RC 11.1 -- Cobertura de daño ambiental (Transporte de Carga peligrosa).'},
      {type:'item', text:'CA-RC 12.1 -- Cobertura por gastos de remediación ambiental (Transporte de carga Peligrosa).'},
      {type:'p', text:'Si transporta personas en Ambulancias deberá incluir además las siguientes cláusulas:'},
      {type:'item', text:'CA-RC 14.1 - Personas transportadas en ambulancia en calidad de pacientes.'},
      {type:'p', text:'Si el OFERENTE es Transportador Carretero de Viaje Internacional por los países del Cono Sur deberá incluir las siguientes cláusulas:'},
      {type:'item', text:'CO-EX 1.1 - Seguro de Responsabilidad del Transportador Carretero de Viaje Internacional por los Territorios de los Países del Cono Sur'},
      {type:'item', text:'CO-EX 11.1 - Extensión de la Cobertura de Responsabilidad Civil a Países del Cono Sur'},
      {type:'p', text:'El OFERENTE debe presentar esquema de pago y constancia de pago.'},
      {type:'item', text:'f) Seguro Técnico: Todo equipo deberá tener una póliza que cubra los equipos propios o por los cuales sean legalmente responsables a valor de reposición o de mercado.'},
      {type:'p', text:'Tipo de cobertura: daño parcial y/o total por accidente, incendio, robo y hurto del equipo y responsabilidad civil por lesiones y/o muerte Total Austral S.A. y/o miembros UTE/Consorcio y/o el principal, (nominar a las empresas que forman parte de la UTE/Consorcio) no será responsable por los daños sufridos a los equipos.'},
      {type:'p', text:'Suma aseguradas: Responsabilidad civil: límite de indemnización, máximo en conjunto y por acontecimiento, para los riesgos indicados en coberturas por un monto no inferior al valor de reposición o de mercado del equipo asegurado.'},
      {type:'p', text:'Cláusulas específicas: que deberá incluir la póliza (las mismas no poseen codificación), a favor de Total Austral S.A. y/o miembros UTE/Consorcio y/o el principal, (nominar a las empresas que forman parte de la UTE/Consorcio).'},
      {type:'p', text:'(CA.CO 13.1) Cláusula de Subrogación: "Cláusula de no-repetición: (nombre de compañía aseguradora o empleador auto asegurado) renuncia en forma expresa a iniciar toda acción de repetición o de regreso contra Total Austral S.A. y/o miembros UTE/Consorcio y/o el principal, (nominar a las empresas que forman parte de la UTE/Consorcio) sus funcionarios, empleados y/u obreros, bien sea con fundamentos en el art. 39.5 de la Ley 24.557 o en cualquier otra norma jurídica, con motivo de las prestaciones en especie o dinerarias que se vea obligada a otorgar o abonar al personal dependiente o ex dependiente de (nombre del OFERENTE), alcanzado por la cobertura de la presente póliza por accidentes de trabajo o enfermedades profesionales, sufridos o contraído por el hecho o en ocasión del trabajo o en el trayecto entre el domicilio del trabajador y el lugar del trabajo.'},
      {type:'p', text:'CA.CO 13.2 Cláusula de asegurado: En caso de que un tercero reclamare directa o indirectamente a por un siniestro indemnizable por la presente cobertura, Total Austral S.A. y/o miembros UTE/Consorcio y/o el principal, (nominar a las empresas que forman parte de la UTE/Consorcio), será considerado como asegurado para esta póliza.'},
      {type:'p', text:'(CA.CO 17.1) Cláusula de Notificación de la falta de pago del premio: El asegurador se obliga a notificar a la/las persona/s física/s y/o jurídica/s indicada/s en el Frente de Póliza cualquier omisión de pago en que incurriere el tomador y ello con una anticipación mínima de 30 días. La presente póliza no podrá ser modificada ni anulada sin previo aviso a la/las persona/s física/s y/o jurídica/s indicada/s en el Frente de la Póliza (Total Austral S.A. y/o miembros UTE/Consorcio y/o el principal, (nominar a las empresas que forman parte de la UTE/Consorcio).'},
      {type:'p', text:'El OFERENTE debe presentar esquema de pago y constancia de pago.'},
      {type:'item', text:'g) Seguros para Personal Extranjero: Todo personal extranjero que brinde un servicio para Total Austral deberá contar con:'},
      {type:'item', text:'1. Póliza de accidentes Personales de acuerdo con el punto 7.4.'},
      {type:'item', text:'2. Cobertura de asistencia en viaje.'},
      {type:'item', text:'3. En caso de Contar con una ART de acuerdo con la legislación vigente del país de origen, deberá indicar cobertura "Worlwide".'},
      {type:'item', text:'h) Cláusula Generales y Otros: Todas estas pólizas deberán contener una cláusula por la cual, el asegurador se compromete a no rescindir, cancelar, anular o suspender el seguro por ninguna razón, inclusive por la falta o mora en el pago del premio, sin el previo consentimiento de la COMPAÑIA, figure o no como asegurada, co-asegurada o beneficiaria de cesión de derechos.'},
      {type:'p', text:'Otros Seguros: La compañía podrá exigir la contratación de seguros adicionales cuando las características de la prestación de servicios así lo requieran.'},
      {type:'p', text:'El OFERENTE asegurará que cada uno de sus subOFERENTEs esté asegurado de acuerdo con las disposiciones del presente anexo. Cualquier deficiencia en cuanto a las coberturas, montos, límites de póliza u otras disposiciones del seguro de sus subOFERENTEs, será exclusiva responsabilidad del OFERENTE.'},
      {type:'item', text:'i) Renuncia a la subrogación: Todos los seguros de la COMPAÑIA contendrán disposiciones por las que los aseguradores acuerden en renunciar a sus derechos de subrogación contra el OFERENTE.'},
      {type:'p', text:'Nota: Los límites mínimos de coberturas aquí indicados son montos de referencia, el OFERENTE deberá cumplir como mínimo con los topes establecidos para cada uno de los seguros mencionados en el presente conforme a lo indicado por la Superintendencia de Seguros de la Nación (https://www.argentina.gob.ar/superintendencia-de-seguros) a la fecha de cierre de las presentes Condiciones Particulares de Servicios.'},
      {type:'title', text:'7.5 Recursos Informáticos y de Comunicación'},
      {type:'p', text:'El OFERENTE, su personal y SUBCONTRATISTAS si los hubiere, no podrán sin previa autorización escrita de la COMPAÑIA utilizar los recursos informáticos y de comunicación de la COMPAÑIA, a saber: (a) las líneas de comunicación, (b) el equipamiento informatico o de comunicaciones: (c) la red privada, (d) la red pública, siendo la presente enumeración meramente enunciativa y no limitativa.'},
      {type:'p', text:'No se autoriza la conexión de un equipo propiedad del OFERENTE, su personal y SUBCONTRATISTAS si los hubiere, a las redes de comunicación de voz y de datos de la COMPAÑIA, excepto en casos excepcionales para los cuales se necesitará la conformidad del Responsable de Seguridad de Sistema de Información (RSSI) de la COMPAÑIA y el Responsable de la OFERTA de la COMPAÑIA.'},
      {type:'p', text:'El OFERENTE deberá cumplir estrictamente con la Política de Seguridad Informática y el Código de Utilización de Recursos Informáticos y de Comunicaciones del Grupo descriptos en el Artículo 7.9 de este OFERTA.'},
      {type:'p', text:'El OFERENTE será responsable de difundir y hacer cumplir a su personal, SUBCONTRATISTAS, y personal de sus SUBCONTRATISTAS la normativa indicada en al párrafo anterior.'},
      {type:'p', text:'La falta de autorización de uso emitida en legal forma por la COMPAÑIA, así como los incumplimientos que verifique la COMPAÑIA a los Procedimientos de: a) la Política de Seguridad Informática y b) el Código de Utilización de Recursos Informáticos y de Comunicación, serán considerados falta grave del OFERENTE y autorizará a la COMPAÑIA a rescindir el OFERTA por culpa del OFERENTE.'},
      {type:'title', text:'7.6 Confidencialidad - Multa'},
      {type:'p', text:'El OFERENTE deberá mantener en secreto y en forma confidencial toda información y/o conocimiento que pueda obtener en relación con las actividades de la COMPAÑIA o de las empresas que integran los consorcios donde la COMPAÑIA es Operador, o de empresas asociadas o subsidiarias de la COMPAÑIA hasta el momento en que la COMPAÑIA autorice por escrito lo contrario, o hasta que dicha información y/o conocimiento sea de dominio público.'},
      {type:'p', text:'El OFERENTE asume plena responsabilidad por cualquier acto de sus dependientes y/o sub-OFERENTEs que implique violar la confidencialidad antedicha, y/o que signifique copiar, divulgar o utilizar de cualquier modo dicha información y/o conocimientos por parte de tales dependientes o sub-OFERENTEs, y les exigirá por escrito la firma de convenios de confidencialidad aceptables para la COMPAÑIA.'},
      {type:'p', text:'En caso que el OFERENTE, sus dependientes y/o sub-OFERENTEs copien, divulguen o utilicen de cualquier modo la información y/o conocimientos de la COMPAÑIA, el OFERENTE deberá pagar en concepto de cláusula penal la suma de U$ 100.000 (cien mil dólares estadounidenses), más los daños efectivos directos e indirectos ocasionados por tal copia, divulgación o utilización.'},
      {type:'p', text:'El OFERENTE será responsable por las consecuencias derivadas de la violación en materia de patentes, licencias o derechos de autor constituidos por cualquiera de los items que pueda proveer o de las operaciones que pueda desempeñar en virtud del presente.'},
      {type:'p', text:'Esta cláusula de confidencialidad se mantendrá vigente por un período de cinco (5) años a partir de la Fecha de Finalización de la OFERTA.'},
      {type:'p', text:'Durante la vigencia de la OFERTA el OFERENTE cubrirá esta responsabilidad con una garantía a satisfacción de la COMPAÑIA, la que deberá ser presentada previo a la firma de la OFERTA.'},
      {type:'title', text:'7.7 Operadores de Equipos de Izaje'},
      {type:'p', text:'Cuando en las Obras / Servicios a realizar se utilicen equipos de izaje, el OFERENTE deberá prever operadores de los mismos debidamente habilitados por un Organismo de competencia reconocida, aprobado por la COMPAÑIA.'},
      {type:'title', text:'7.8 Cumplimiento de Disposiciones Legales y Laborales'},
      {type:'p', text:'El OFERENTE deberá cumplir con todas las disposiciones legales, incluyendo pero no limitándose a las de seguridad, salubridad, descansos, remuneraciones, indemnizaciones, aportes y contribuciones legales de todo el personal afectado directa o indirectamente a los trabajos que ejecute. El OFERENTE se obliga al cumplimiento de todas las disposiciones legales y convencionales vigentes por todo el plazo de la obra o servicio, inclusive las convenciones colectivas de aplicación, no pudiendo reclamar a la COMPAÑIA modificación del valor contractual por aumento de sus costos que se deriven de lo mencionado anteriormente.'},
      {type:'p', text:'El OFERENTE deberá mantener al día los pagos de las obligaciones consignadas en el párrafo anterior y es obligación del OFERENTE remitir a la COMPAÑIA en forma mensual todos los comprobantes que acrediten dicho cumplimiento. La COMPAÑIA se reserva el derecho de no efectuar pago parcial o total de las facturas presentadas por el OFERENTE en caso de:'},
      {type:'item', text:'a) Incumplimiento en la obligación de remisión de dicha documentación.'},
      {type:'item', text:'b) Registrarse deuda alguna de cualquier obligación mencionada en el punto anterior.'},
      {type:'item', text:'c) Ser la COMPAÑIA notificada de cualquier reclamo judicial y/o extrajudicial en concepto de falta de pago de cualquier obligación mencionada en el punto anterior.'},
      {type:'p', text:'La COMPAÑIA notificará al OFERENTE el ejercicio del derecho que aquí se reserva, para lo cual el OFERENTE podrá dentro de los diez (10) días de notificado acreditar el cumplimiento de todas las obligaciones a su cargo.'},
      {type:'p', text:'Vencido el plazo establecido en el párrafo anterior, la COMPAÑIA podrá cancelar toda obligación pendiente de pago que registrare el OFERENTE y en consecuencia éste confiere poder irrevocable a favor de la COMPAÑIA para que ésta abone por cuenta y orden del OFERENTE los importes firmes y ciertos que en definitiva resulten adeudarse conforme a este artículo, deduciendo el monto adeudado de la facturación retenida. En caso que los importes de la facturación retenida no cubra la suma adeudada, el OFERENTE se compromete a remitir una garantía suficiente y a satisfacción de la COMPAÑIA por la diferencia que resulte.'},
      {type:'p', text:'En caso de existir suma alguna pendiente de pago a favor del OFERENTE, la misma será cancelada una vez que la/s obligación/nes incumplida/s hubiese/n sido cumplida/s o que la COMPAÑIA haya sido debidamente garantizada respecto del/los reclamo/s recibido/s. La COMPAÑIA podrá llevar adelante cualquier auditoría de registros, libros y demás documentación en relación con el presente OFERTA hasta dos (2) años posteriores a su fecha de terminación. Por ello, el OFERENTE deberá mantener en guarda toda documentación relacionada con este OFERTA.'},
      {type:'title', text:'7.9 Política Corporativa'},
      {type:'p', text:'El OFERENTE cumplirá con las Políticas, Normas y Procedimientos de la COMPAÑIA en materia de HSE detallados en el Anexo 1 del Anexo 2.'},
      {type:'p', text:'Asimismo, deberá dar cumplimiento a los siguientes documentos:'},
      {type:'item', text:'Política N° 1-COD-GF-I&T-136 "Código de utilización de recursos informáticos y de comunicación del Grupo Total"'},
      {type:'item', text:'Política N° 1-POL-GF-I&T-010 "Política de Seguridad Informática"'},
      {type:'item', text:'Procedimiento N°101 - PRC GO CC 101 "Control De Contratistas"'},
      {type:'p', text:'Estos procedimientos y cada una de sus posibles revisiones (las cuales serán notificadas al OFERENTE oportunamente) serán de aplicación para el OFERENTE, sus empleados y SubOFERENTEs si los tuviese, sirviendo la firma de esta OFERTA como constancia de recepción y aceptación de los mismos.'},
      {type:'title', text:'7.10 Domicilio del OFERENTE y SUBOFERENTES en la Provincia de Tierra del Fuego - Libro de Inspecciones', showIf:{alcance:'tdf'}},
      {type:'p', text:'De acuerdo a la legislación vigente el OFERENTE y SUBOFERENTES que trabajan en la Provincia de Tierra del Fuego deberán estar radicados en dicha provincia. En el caso que se radiquen en forma transitoria deberán constituir un domicilio según lo dispuesto por el artículo 642.1 del Código de Procedimiento Civil, Comercial, Laboral, Rural y Minero de la Provincia de Tierra del Fuego. Atento ello, el OFERENTE y SUBOFERENTES deberán habilitar un Libro de Inspecciones, foliado y rubricado por la Subsecretaría de Trabajo y Justicia según lo dispuesto por el artículo 21 de la Ley N°90 (Policía del Trabajo) de la Provincia de Tierra del Fuego.', showIf:{alcance:'tdf'}},
      {type:'title', text:'7.10 Domicilio del OFERENTE y SUBOFERENTES en la Provincia del Neuquén', showIf:{alcance:'nqn'}},
      {type:'p', text:'De acuerdo a la legislación vigente el OFERENTE y SUBOFERENTES que trabajan en la Provincia de Neuquén deberán constituir domicilio en dicha provincia según lo dispuesto por el artículo 10 de la ley 1625, modificada por la ley 2203, de la Provincia del Neuquén.', showIf:{alcance:'nqn'}},
      {type:'title', text:'7.11 Compromisos de lucha contra la corrupción'},
      {type:'item', text:'a) El OFERENTE actuará como una persona física o jurídica independiente y ni el OFERENTE ni su PERSONAL serán considerados para cualquier fin como empleado, agente, apoderado, dependiente o representante de la COMPAÑÍA en la prestación de los SERVICIOS y en la utilización de los fondos provistos por la COMPAÑÍA conforme la presente OFERTA.'},
      {type:'item', text:'b) Los términos que se utilizan en el presente Artículo 7.12 en letras mayúsculas tendrán el significado definido a continuación: FUNCIONARIO PUBLICO significa un funcionario, empleado o agente electo o nombrado de cualquier área, sea del estado o gobierno nacional, provincial, regional o local, o cualquier departamento, agencia gubernamental u organismo instrumental de dicho estado o gobierno, o cualquier COMPAÑIA en la que un estado o gobierno es propietario, directo o indirecto, de una participación mayoritaria o de control; un funcionario de un partido político; un candidato a un cargo público, y cualquier funcionario, empleado o agente de cualquier organización pública internacional.'},
      {type:'p', text:'FAMILIAR CERCANO DE UN FUNCIONARIO PÚBLICO significa el cónyuge o pareja, cualquiera de sus hijos, hermanos o padres, el cónyuge o pareja de su (o sus) hijos o hermanos; o cualquier miembro del hogar.'},
      {type:'item', text:'c) En reconocimiento a los principios consagrados en las pertinentes convenciones internacionales y regionales sobre la lucha contra la corrupción y para garantizar el cumplimiento de las leyes anticorrupción aplicables a las actividades previstas en la OFERTA y cualquier otra ley contra la corrupción que fuese aplicable a las PARTES o a su casa matriz, el OFERENTE, en relación con la OFERTA y con los aspectos que son el objeto propio de la misma, garantiza que ni él, ni ninguno de sus socios y/o asociados, ni su personal, ni nadie en su representación, ha efectuado o ha ofrecido, ni tampoco efectuará ni ofrecerá, algún tipo de pago, obsequio o promesa, u otorgado ventaja alguna, sea de modo directo o indirecto o a través de un intermediario o un FAMILIAR CERCANO DE UN FUNCIONARIO PÚBLICO, hacia o para su utilización por parte de un FUNCIONARIO PUBLICO, cuando tal pago, obsequio, promesa o ventaja fuese realizada a fin de: (i) influir sobre cualquier acto o decisión de dicho FUNCIONARIO PUBLICO; (ii) inducir a dicho FUNCIONARIO PUBLICO a realizar o dejar de realizar cualquier acto en violación de sus deberes legales; (iii) asegurar cualquier ventaja indebida; o (iv) inducir al FUNCIONARIO PUBLICO a utilizar su influencia para afectar cualquier acto o decisión de cualquier departamento, agencia u organismo instrumental de cualquier gobierno o empresa pública.'},
      {type:'item', text:'d) El OFERENTE, en relación con la OFERTA y los asuntos que son objeto de la misma, garantiza que no ha hecho ni ha ofrecido, ni hará u ofrecerá ningún tipo de pago, obsequio, promesa o ventaja, ya sea directamente o a través de intermediarios, o para el uso de cualquier persona (que no sea un FUNCIONARIO PUBLICO), cuando tal pago, obsequio, promesa o ventaja fuese realizada a fin de inducir a tal persona a realizar o no realizar un acto violando su deber moral y legal, o para obtener cualquier otra ventaja indebida, o para hacer algo o abstenerse de hacer algo en violación a las leyes aplicables a las actividades previstas en la OFERTA.'},
      {type:'item', text:'e) El OFERENTE hará que su personal y SUBCONTRATISTAS cumplan con las obligaciones establecidas en el presente Artículo 7.12 a fin de garantizar el mismo bajo los términos de sus acuerdos con cualquier SUBCONTRATISTA. En particular, el OFERENTE deberá realizar análisis de riesgo y evaluaciones de cumplimiento de niveles de conformidad ("compliance due diligences") con SUBCONTRATISTAS de envergadura, reservándose la COMPAÑÍA el derecho de solicitar pruebas que así lo acrediten o documentación relacionada con dichos análisis de riesgo y evaluaciones de cumplimiento.'},
      {type:'item', text:'f) Todas las transacciones financieras, facturas e informes presentados a la COMPAÑÍA reflejarán con precisión y con detalle todas las actividades y operaciones que se realicen en la ejecución de la OFERTA. El OFERENTE también deberá mantener controles internos adecuados para asegurar que todos los pagos realizados en ejecución de la OFERTA están autorizados y en cumplimiento de la misma. La COMPAÑÍA se reserva el derecho de realizar por sí misma o mediante un OFERENTE debidamente autorizado, de conformidad con los derechos de auditoría establecidos en la OFERTA, las auditorías en las instalaciones del OFERENTE de todos los pagos realizados por o en nombre del OFERENTE por las obras y/o servicios realizados en virtud de la presente OFERTA. El OFERENTE se compromete a cooperar plenamente con dicha auditoría, poniendo sus libros y registros a disposición de la COMPAÑIA o su OFERENTE debidamente autorizado, y respondiendo a las preguntas que la COMPAÑÍA pueda hacer en relación a la actuación del OFERENTE en virtud de la presente OFERTA.'},
      {type:'item', text:'g) Todos los pagos de la COMPAÑIA al OFERENTE se efectuarán de acuerdo con las condiciones de pago especificadas en la OFERTA. Las indicaciones de pago señaladas en las facturas del OFERENTE se constituirán en una representación y garantía por parte del OFERENTE de que la cuenta bancaria notificada es propiedad exclusiva del OFERENTE y que ninguna otra persona posee la titularidad o interés en dicha cuenta, con excepción del OFERENTE.'},
      {type:'item', text:'h) El OFERENTE manifiesta y garantiza que ningún FUNCIONARIO PUBLICO o un FAMILIAR CERCANO DE UN FUNCIONARIO PUBLICO posee una relación de beneficio, sea de modo directo o indirecto, con el OFERENTE; o es director, directivo, agente o apoderado del OFERENTE, a excepción de cualquier propiedad, participación o cargo que el OFERENTE haya revelado a la COMPAÑIA por escrito; o que tiene la propiedad o posesión, directa o indirecta, de acciones o cualquier otra participación en el OFERENTE (que no sea a través de la propiedad de títulos valores que cotizan en bolsa no suficientes para constituir una participación de control). Las representaciones y garantías precedentes continuarán siempre que la OFERTA continúe vigente. El OFERENTE se compromete a notificar a la COMPAÑIA con prontitud y por escrito cualquier información que pueda o pudiera afectar la exactitud de las representaciones o garantías anteriores. En el caso que un FUNCIONARIO PUBLICO o un FAMILIAR CERCANO DE UN FUNCIONARIO PUBLICO posea una relación de beneficio, directa o indirectamente, con el OFERENTE, y/o posea o adquiera, directa o indirectamente, acciones o cualquier otra participación del OFERENTE, y/o es o se convierte en director, directivo, agente o apoderado del OFERENTE, el OFERENTE tomará todas las medidas apropiadas para asegurarse de que ese FUNCIONARIO PUBLICO o FAMILIAR CERCANO DE UN FUNCIONARIO PUBLICO evite cualquier conflicto de interés, cumpla con la legislación de la República Argentina que prohíbe los conflictos de interés por parte de un FUNCIONARIO PUBLICO y con toda normativa legal complementaria, y cumpla asimismo con cada una de las disposiciones de lucha contra la corrupción establecidas en los Artículos 7.12.c) y 7.12.d) precedentes.'},
      {type:'item', text:'i) Sin perjuicio de lo expuesto precedentemente, las PARTES aceptan y reconocen que en caso que el OFERENTE o sus SUBCONTRATISTAS sean parte de una sociedad o asociación que conforme las leyes aplicables sea integrada por una empresa del estado, o sea de titularidad parcial de cualquier empresa del estado, o pueda, en la actualidad o en el futuro, ser considerada una entidad gubernamental o cuasi-gubernamental conforme las leyes aplicables, es posible que un FUNCIONARIO PUBLICO sea designado director, directivo o empleado del OFERENTE o sus SUBCONTRATISTAS o sus afiliadas. En dicho caso, las PARTES acuerdan que el OFERENTE o SUBCONTRATISTAS se encuentran facultados a tener uno o más directores, directivos, o empleados que califiquen como un FUNCIONARIO PUBLICO, siempre y cuando que: (i) el FUNCIONARIO PUBLICO ocupare dicha posición dentro del OFERENTE o SUBCONTRATISTA en cumplimiento de las leyes aplicables atribuibles a dicha parte y conforme le sea requerido en las mismas; (ii) la designación del FUNCIONARIO PUBLICO como director, directivo o empleado del OFERENTE o SUBCONTRATISTA fuere revisada y aprobada por la empresa estatal; (iii) cualquier pago hecho al FUNCIONARIO PUBLICO o efectuado en virtud de su representación fuere revisado y aprobado por la empresa estatal y no excediere la compensación que sería razonable para una persona cumpliendo dichas funciones dentro del OFERENTE o SUBCONTRATISTA; (iv) dicha compensación fuere enteramente consistente con las leyes aplicables y los aspectos que son el objeto de la presente OFERTA, y no fuere efectuada para influenciar cualquier acto, decisión u omisión oficial de dicho FUNCIONARIO PUBLICO o compensar al FUNCIONARIO PUBLICO respecto de cualquiera de ellos en el pasado.'},
      {type:'item', text:'j) Sin perjuicio de cualquier derecho o recurso que la COMPAÑIA posea en virtud de la OFERTA o conforme las leyes aplicables, incluyendo pero no limitado a los daños y perjuicios por incumplimiento de la OFERTA, si cualquiera de las obligaciones, acciones o requerimientos contemplados en este Artículo 7.12 no se completaren o cumplieren por parte del OFERENTE en cualquier aspecto sustancial, la COMPAÑIA tendrá derecho a: (i) suspender el pago y/o exigir el reembolso de cualquier pago anticipado en virtud de la OFERTA, y/o (ii) suspender y/o rescindir la presente OFERTA por incumplimiento del OFERENTE, con efecto inmediato, de conformidad con el Artículo 12 de las Condiciones Generales de Contratación de Obras y Servicios que forman parte de la OFERTA.'},
      {type:'title', text:'7.12 Convenio de Indemnización y Renuncia entre CONTRATISTA, sus Subcontratistas y otros Contratistas de la COMPAÑIA'},
      {type:'item', text:'a) El CONTRATISTA firmará una contraparte del "Convenio de Indemnización y Renuncia de Recurso" (Versión para Contratistas) adjunto.'},
      {type:'item', text:'b) El CONTRATISTA, a menos que tuviese aprobación específica de la COMPAÑIA, deberá obtener de sus subcontratistas la firma como contrapartes análogas del "Convenio de Indemnización y Renuncia de Recurso" (Versión para subcontratistas del CONTRATISTA) adjunto.'},
      {type:'item', text:'c) La COMPAÑIA hará sus mayores esfuerzos para obtener de sus otros contratistas y de los subcontratistas de éstos la firma de contrapartes análogas a los convenios correspondientes.'},
      {type:'item', text:'d) El CONTRATISTA deberá comunicar obligatoriamente a las contrapartes de la COMPAÑIA el "Convenio de Indemnización y Renuncia de Recurso" firmado por sus subcontratistas y atestiguado por él mismo. Además deberá notificar a la COMPAÑIA acerca de potenciales subcontratistas que se hubieran negado a firmar la contraparte de dicho Convenio.'},
      {type:'title', text:'7.13 Protección de Datos Personales'},
      {type:'p', text:'En caso de que como resultado de la prestación de los servicios bajo el Contrato (en adelante, los "Servicios"), el CONTRATISTA recolecte, almacene y/o procese datos personales, el CONTRATISTA se compromete a cumplir con la Ley N° 25.326 y sus reglamentaciones vigentes en materia de protección de datos personales y, en particular, con las normas sobre medidas de seguridad para el procesamiento de datos personales (en adelante, la "Legislación Aplicable").'},
      {type:'p', text:'Al procesar datos personales en nombre o para beneficio de [la COMPAÑÍA], el CONTRATISTA dará cumplimiento a las siguientes obligaciones:'},
      {type:'item', text:'a) Actuará exclusivamente de acuerdo a las instrucciones documentadas de la COMPAÑÍA, incluida la transmisión de datos a un tercer país. Se entienden por "instrucciones documentadas" las disposiciones del Contrato y la(s) orden(es) que se puedan emitir posteriormente (en adelante la(s) "Orden(es)"), que describan el objeto, duración y finalidad del procesamiento de datos personales, así como el tipo de datos personales y las categorías de sujetos interesados. El CONTRATISTA informará inmediatamente a la COMPAÑÍA si, a su criterio, alguna de dichas instrucciones infringe la Legislación Aplicable;'},
      {type:'item', text:'b) No utilizará dichos datos personales para sí, ni a ningún otro efecto distinto del objeto del Contrato;'},
      {type:'item', text:'c) No comunicará ni transmitirá dichos datos personales a ningún tercero no autorizado;'},
      {type:'item', text:'d) A pedido de la COMPAÑÍA, colaborará estrechamente para la gestión de cualquier trámite, la ejecución de una evaluación de impacto relativa a la protección de datos personales, o la realización de consultas a las autoridades con respecto al procesamiento de datos relacionados con los Servicios, y, en particular, asistirá a la COMPAÑÍA ante cualquier solicitud de información o inspección requerida por las autoridades competentes o por los titulares de los datos personales. Asimismo, el CONTRATISTA notificará a la COMPAÑÍA acerca de cualquier solicitud o inspección llevada a cabo por alguna autoridad a la que esté sujeto, cualquier solicitud o reclamo por parte de terceros y cualquier incidente de seguridad, dentro de los cinco (5) días corridos (a menos que en el presente se disponga un plazo menor);'},
      {type:'item', text:'e) No revelará, en ningún momento, dichos datos personales a ninguna autoridad u organismo público, ni siquiera en virtud de un requisito legal o reglamentario, sin la debida notificación anticipada a la COMPAÑÍA, a menos que lo exija la Legislación Aplicable. El CONTRATISTA comunicará a la COMPAÑÍA dicha exigencia legal antes de revelar dichos datos personales, salvo disposición en contrario de la Legislación Aplicable;'},
      {type:'item', text:'f) Sólo contratará los servicios de un sub-procesador sujeto a las siguientes condiciones: (i) El CONTRATISTA llevará una lista actualizada de todos los sub-procesadores que ejecuten los Servicios. El CONTRATISTA se compromete a suministrar a la COMPAÑÍA la información necesaria relativa a sus sub-procesadores antes de procesar la Orden correspondiente; (ii) Toda modificación efectuada a dicha lista será comunicada a la COMPAÑÍA, como mínimo, tres (3) meses antes de que la modificación entre en vigor; (iii) Dentro de los treinta (30) días desde la fecha de recepción de la notificación de la contratación de un nuevo sub-procesador, la COMPAÑÍA podrá objetar la contratación mediante una notificación cursada por cualquier medio al CONTRATISTA, en cuyo caso, el CONTRATISTA deberá proponer otro sub-procesador o mantener al sub-procesador designado, implementando, según corresponda, las medidas correctivas solicitadas por la COMPAÑÍA. Si ninguna de estas opciones fuera posible, el CONTRATISTA deberá suspender la contratación de dicho sub-procesador; caso contrario, la COMPAÑÍA podrá cancelar total o parcialmente los servicios que constituyen el objeto del contrato a celebrarse con el sub-procesador mencionado; (iv) El CONTRATISTA celebrará un contrato con su sub-procesador en el cual se le impondrán a éste último, como mínimo, obligaciones similares a las que le corresponden al CONTRATISTA en materia de protección de datos personales y, en particular, sobre medidas de seguridad para el procesamiento de datos personales. El CONTRATISTA continuará siendo plenamente responsable frente a la COMPAÑÍA por el cumplimiento de las obligaciones correspondientes a sus sub-procesadores.'},
      {type:'item', text:'g) Colaborará y asistirá a la COMPAÑÍA, implementando las medidas técnicas y organizativas adecuadas a la naturaleza del procesamiento, a los efectos de responder a las solicitudes de los sujetos interesados que tengan por objeto el ejercicio de sus derechos en virtud de la Legislación Aplicable;'},
      {type:'item', text:'h) Suministrará a la COMPAÑÍA toda la información y asistencia requerida para el cumplimiento de sus obligaciones;'},
      {type:'item', text:'i) Implementará todas las medidas técnicas y organizativas necesarias para garantizar: i. la seguridad física y lógica de los datos personales frente a cualquier incumplimiento voluntario o involuntario, en particular, las medidas requeridas por la Legislación Aplicable y las disposiciones del Contrato y, según corresponda, la Orden correspondiente aprobada por la COMPAÑÍA; ii. la confidencialidad de los datos personales, asegurándose de que todas las personas autorizadas a procesar datos se comprometan a respetar sus obligaciones de confidencialidad, sujeto, como mínimo, a las disposiciones del Contrato de modo de garantizar un nivel de seguridad acorde al riesgo, y verificando que dichas personas autorizadas reciban la capacitación necesaria al respecto.'},
      {type:'item', text:'j) Notificará todo incumplimiento a las normas de protección de datos personales a la COMPAÑÍA o su contacto de referencia en forma inmediata o a más tardar dentro de las veinticuatro (24) horas de haber advertido dicho incumplimiento, y tomará las medidas necesarias para corregirlo lo antes posible. A tales efectos, el CONTRATISTA: i. mantendrá informado a la COMPAÑÍA respecto del modo y el momento de aplicación de dichas medidas; ii. se abstendrá de divulgar información sobre el incidente a menos que la COMPAÑÍA se lo solicite; iii. asistirá a la COMPAÑÍA en la implementación de las medidas destinadas a poner fin al incidente, reparar los daños relacionados con el mismo y evitar su recurrencia; iv. suministrará a la COMPAÑÍA la información que le permita cumplir con sus obligaciones de notificación frente a la Autoridad de Aplicación respecto de la protección de datos personales, o cualquier otra autoridad competente en virtud de la Legislación Aplicable; v. a pedido de la COMPAÑÍA, implementará las medidas necesarias para informar y/o comunicar el incidente a los sujetos interesados dentro de un plazo compatible con las obligaciones de la COMPAÑÍA.'},
      {type:'item', text:'k) Una vez finalizado el Contrato o los Servicios relativos al procesamiento, o a instancias de la COMPAÑÍA, lo que decida éste último, devolverá todos los datos personales tratados a la COMPAÑÍA en el medio y formato acordados, o eliminará dichos datos junto con las copias existentes, a menos que la Legislación Aplicable exija su almacenamiento. Esta devolución/destrucción dará lugar a la elaboración de un informe fechado y firmado que será remitido a la COMPAÑÍA;'},
      {type:'item', text:'l) Suministrará a la COMPAÑÍA toda la información necesaria que permita la ejecución de auditorías e inspecciones referidas a datos personales a cargo de la COMPAÑÍA o cualquier otro auditor que éste haya contratado, y colaborar con dichas auditorías.'},
      {type:'item', text:'m) No transmitirá los datos personales a un país que no ofrezca el nivel de "protección adecuado", a menos que haya sido autorizado expresamente por la COMPAÑÍA.'},
      {type:'p', text:'Cualquier modificación que se introduzca a la Legislación Aplicable será implementada de inmediato por el CONTRATISTA.'},
      {type:'title', text:'7.14 Fortalecimiento de Compre Local Neuquino', showIf:{alcance:'nqn'}},
      {type:'p', text:'Conforme a los lineamientos de la Ley Provincial N° 3338 "Fortalecimiento y Desarrollo de la Cadena de Valor Neuquina" y su Decreto Reglamentario Nº 2471/22, la COMPAÑÍA solicitará al OFERENTE que, en caso de obtener el certificado de "Empresa Neuquina", sea presentado al momento de realizar la licitación y/o oferta a la Compañía. Tal certificado deberá estar vigente al momento de presentar la oferta y el OFERENTE deberá gestionar la renovación de dicho certificado durante la vigencia de la OFERTA, en caso que así se requiera.', showIf:{alcance:'nqn'}},
    ]
  },
  c8: {
    title: 'Cesión Contractual / Cambio de Control',
    blocks: [
      {type:'item', text:'1. Cesión Contractual: El presente contrato podrá ser cedido total o parcialmente por la COMPAÑIA a cualquier tercero, sin necesidad de autorización previa del OFERENTE. La cesión surtirá efectos desde el momento en que se notifique fehacientemente al OFERENTE, quien desde entonces reconocerá al cesionario como parte legítima en los derechos y obligaciones derivados del presente contrato. La notificación podrá realizarse por cualquier medio que permita dejar constancia de su recepción.'},
      {type:'item', text:'2. Cambio de Control: El cambio de control societario, ya sea por adquisición, fusión, escisión, transferencia de acciones o cualquier otra forma que implique una modificación en la titularidad o control de la parte de la COMPAÑIA, no requerirá autorización previa del OFERENTE. No obstante, la COMPAÑIA deberá notificar dicho cambio al OFERENTE dentro de los cinco (5) días hábiles siguientes a su ocurrencia, sin que ello afecte la validez, vigencia ni exigibilidad del presente contrato. El OFERENTE reconoce que el contrato permanecerá plenamente vigente y exigible frente a la nueva entidad controlante o titular.'}
    ]
  },
  c9: {
    title: 'Política de Higiene, Seguridad y Preservación del Medio Ambiente',
    blocks: [
      {type:'p', text:'Los artículos que se detallan a continuación, anulan y reemplazan a los artículos 1.3, 1.4 y 1.5 establecidos en las Condiciones Generales de Contratación, Sección 4 "Políticas de Higiene, Seguridad y Preservación del Medio Ambiente".'},
      {type:'title', text:'9.1'},
      {type:'p', text:'El OFERENTE, en general, deberá cumplir con lo estipulado en la ley 19.587 - Decreto 351/79 (modificado por el Decreto 1338/96), y la ley 24557 con sus Decretos reglamentarios.'},
      {type:'p', text:'El OFERENTE dedicado a la industria de la construcción, deberá cumplir además con el Decreto 911/96.'},
      {type:'p', text:'Se entiende como "obra de construcción" a todos los trabajos definidos en el Artículo 2 del Decreto 911/96.'},
      {type:'title', text:'9.2'},
      {type:'p', text:'El Representante del OFERENTE entregará a cada persona presente en el lugar de trabajo y en el momento de su contratación, una copia de las Instrucciones de Seguridad aplicables a la tarea a realizar. Cada persona que reciba dichas instrucciones firmará el formulario de recepción que figura en el Anexo 1 y lo devolverá al Representante del OFERENTE, quien lo archivará.'},
      {type:'title', text:'9.3'},
      {type:'p', text:'El Jefe de Higiene y Seguridad del OFERENTE participará en todas las reuniones convocadas por la COMPAÑIA referentes al tema de Higiene, Seguridad y Preservación del Medio Ambiente.'},
      {type:'title', text:'9.4'},
      {type:'p', text:'Antes de iniciar los trabajos el OFERENTE entregará a la COMPAÑIA una copia certificada de su evaluación realizada por la ART que hubiera contratado con las medidas de mejoras que ésta le hubiera sugerido.'}
    ]
  },
  c10: {
    title: 'Salud, Seguridad, Responsabilidad Social, Seguridad Física y Medio Ambiente',
    blocks: [
      {type:'title', text:'10.1 Definiciones'},
      {type:'p', text:'Para todos los efectos de la presente OFERTA y de todos los anexos que la forman, se aplicarán, salvo indicación en contrario, las siguientes definiciones:'},
      {type:'item', text:'COMUNIDAD(ES) LOCAL(ES) significa aquellos grupos de gente que viven o trabajan lo suficientemente cerca de alguna instalación o área de perforación como para verse afectada por alguna actividad o la ejecución de los SERVICIOS.'},
      {type:'item', text:'DOCUMENTO DE ENLACE DE HSE significa el documento escrito concebido para promover la coherencia del PLAN DE HSE DEL OFERENTE con el Sistema de Gestión (MS) en HSE de la COMPAÑÍA y los requerimientos en HSE de la OFERTA. Dicho documento especificará los métodos y procedimientos en detalle que deberán aplicarse a los efectos de la ejecución de los SERVICIOS, entrecruzando referencias entre el Sistema de Gestión (MS) en HSE de la COMPAÑÍA, los requerimientos de HSE de la OFERTA, el Sistema de Gestión (MS) en HSE del OFERENTE y el PLAN DE HSE DEL OFERENTE. Este documento establecerá también las responsabilidades de la COMPAÑÍA y del OFERENTE con respecto a las cuestiones de HSE que no se hubieran contemplado en otra parte de la OFERTA.'},
      {type:'item', text:'ESTUDIO DE IMPACTO SOCIAL Y AMBIENTAL (EISA) significa el estudio destinado a evaluar los impactos potenciales de cualquier actividad o la ejecución de los SERVICIOS en el medio ambiente y las condiciones socioeconómicas de las COMUNIDADES LOCALES y a establecer las medidas o soluciones técnicas más apropiadas a fin de reducir o prevenir los impactos negativos de los mismos.'},
      {type:'item', text:'ESTUDIO DE LINEA DE BASE SOCIAL Y AMBIENTAL (ESBS, por sus siglas en inglés) se refiere al estudio o relevamiento inicial de la calidad ambiental y entorno social de un área y sus alrededores a través de la recopilación de la información necesaria para establecer la línea de base de las áreas de vulnerabilidad ambiental y las condiciones socioeconómicas de las COMUNIDADES LOCALES.'},
      {type:'item', text:'EVALUACIÓN DE RIESGOS DE HIGIENE INDUSTRIAL significa el proceso destinado a identificar los riesgos sanitarios potenciales en la instalación a fin de evaluar los riesgos inherentes a las tareas (o actividades) específicas, tanto en términos de gravedad como de probabilidad, e implementar las medidas adecuadas para reducir dichos riesgos a un nivel razonablemente practicable.'},
      {type:'item', text:'FUERZAS DE SEGURIDAD PUBLICA significa las fuerzas armadas de cualquier país donde se encuentre la concesión y se ejecuten los SERVICIOS.'},
      {type:'item', text:'PLAN DE CONTINGENCIA ANTE DERRAMES DE PETROLEO (OSCP, por sus siglas en inglés) se refiere al documento operativo de la COMPAÑÍA que forma parte del PLAN DE GESTION AMBIENTAL de la COMPAÑÍA y el PLAN DE RESPUESTA ANTE EMERGENCIAS DE LA COMPAÑÍA e identifica las cuestiones clave a tener en cuenta para enfrentar un derrame sustancial de petróleo y reducir sus consecuencias.'},
      {type:'item', text:'PLAN DE GESTIÓN AMBIENTAL (EMP, por sus siglas en inglés) se refiere a la parte del SISTEMA DE GESTIÓN AMBIENTAL que comprende los procedimientos operativos destinados a garantizar el control de cualquier actividad o la ejecución de los SERVICIOS que presentaran un impacto potencial para el medio ambiente. Incluye el PLAN DE MANEJO DE DESECHOS, PLAN DE MANEJO DE SUSTANCIAS QUÍMICAS, tratamiento de efluentes, reducción de emisiones sonoras y medidas de protección y procedimientos de control.'},
      {type:'item', text:'PLAN DE GESTIÓN SOCIAL DEL OFERENTE (SMP, por sus siglas en inglés) significa el plan que describe los procedimientos y medidas destinadas a gestionar los impactos generados por la ejecución de sus SERVICIOS en las COMUNIDADES LOCALES, incluidas las medidas de mitigación y control adecuadas.'},
      {type:'item', text:'PLAN DE HSE DEL OFERENTE se refiere al plan en el que se detallan los documentos que establecen los procedimientos y medidas destinados a implementar todos los requerimientos de HSE dispuestos en la OFERTA.'},
      {type:'item', text:'PLAN DE MANEJO DE DESECHOS (WMP, por sus siglas en inglés) significa el procedimiento operativo que define los métodos de recolección, clasificación, tratamiento, eliminación y control de desechos durante el desarrollo de cualquier actividad o la ejecución de los SERVICIOS.'},
      {type:'item', text:'PLAN DE MANEJO DE SUSTANCIAS QUÍMICAS (CMP, por sus siglas en inglés) se refiere al plan que describe en detalle los procedimientos operativos que especifican el criterio ambiental adoptado para la selección de sustancias químicas en base a la vulnerabilidad del medio ambiente circundante y que dispone el inventario de las sustancias químicas utilizadas. Consigna la información toxicológica y eco toxicológica detallada en las Planillas de Datos de Seguridad de Materiales (MSDS, por sus siglas en inglés) y establece los procedimientos para su manipulación, almacenamiento y eliminación.'},
      {type:'item', text:'PLAN DE RESPUESTA ANTE EMERGENCIAS DEL OFERENTE significa el plan en el que se detallan los procedimientos o medidas de emergencia dispuestas por el OFERENTE para brindar una respuesta ante las emergencias que surgieran o pudieran surgir durante la ejecución de sus SERVICIOS. Este plan deberá ser compatible con el PLAN DE RESPUESTA ANTE EMERGENCIAS DE LA COMPAÑÍA y podrá ser suplementado por el DOCUMENTO DE ENLACE DE HSE.'},
      {type:'item', text:'PLAN DE RESPUESTA ANTE EMERGENCIAS DE LA COMPAÑÍA significa el plan que establece las medidas de emergencia dispuestas por la COMPAÑÍA, incluidos el Plan de Contingencia de la COMPAÑÍA (es decir, las medidas de emergencia dispuestas en el sitio) y un plan de intervención específico (es decir, las medidas de emergencia dispuestas en respuesta a un determinado tipo de incidente o requerimientos normativos).'},
      {type:'item', text:'PLAN DE SEGURIDAD FISICA DE LA COMPAÑÍA (CSP, por sus siglas en inglés) significa el plan que especifica las políticas, normas, procedimientos y responsabilidades destinados a orientar el proceso de gestión de la seguridad física y definición de los aspectos generales de la seguridad física dentro de un perímetro.'},
      {type:'item', text:'PLAN SANITARIO DE LA COMPAÑÍA significa el documento permanente en el que se establecen la estrategia, medios y condiciones adecuados para brindar asistencia médica y sanitaria durante el desarrollo de las actividades de la COMPAÑÍA. Determina el PERSONAL, los bienes, equipos y procedimientos necesarios para brindar dicha asistencia.'},
      {type:'item', text:'PREVENCIÓN DE PANDEMIAS significa la implementación de una serie de medidas destinadas a minimizar el impacto de una pandemia, incluyendo la preparación médica, información al PERSONAL y un plan de continuidad del negocio.'},
      {type:'item', text:'PROVEEDOR DE SEGURIDAD PRIVADA significa todo proveedor de servicios desplegado principalmente dentro de alguna instalación cuya misión principal consiste en asegurar el acceso, custodiar los activos y proteger algún itinerario cuando fuera necesario.'},
      {type:'item', text:'RESPONSABILIDAD SOCIAL (COMUNIDAD(ES) LOCAL(ES)) significa la parte de las responsabilidades sociales relacionada con la/s COMUNIDAD(ES) LOCAL(ES). SG EN HSE significa uno de los componentes del sistema global de gestión de una PARTE que contribuye a la gestión de los riesgos de HSE inherentes a cualquier actividad o a la ejecución de los SERVICIOS. Comprende la estructura organizacional, las actividades de planeamiento, responsabilidades, prácticas, procedimientos, procesos y recursos (bienes, equipos y PERSONAL) destinados a establecer, implementar, revisar y mantener la política de HSE, así como también mejorar en forma continua el desempeño de HSE.'},
      {type:'item', text:'SISTEMA DE GESTIÓN AMBIENTAL (EMS, por sus siglas en inglés) se refiere a la parte del sistema global de gestión de la COMPAÑÍA que comprende la estructura organizacional, actividades de planeamiento, responsabilidades, prácticas, procedimientos, procesos y recursos destinados al desarrollo, implementación, logro, revisión y mantenimiento de la política ambiental.'},
      {type:'title', text:'10.2 General'},
      {type:'p', text:'A los efectos de la ejecución de los SERVICIOS previstos en la OFERTA, el OFERENTE, bajo su propio costo, tomará y procurará que sus SUBCONTRATISTAS tomen, todas las precauciones y medidas necesarias para proteger la salud de las personas que pudieran resultar afectadas por la ejecución de dichos SERVICIOS. Asimismo, garantizará un alto nivel de seguridad durante dicha ejecución, evitará o mitigará cualquier impacto negativo en el medio ambiente o las COMUNIDADES LOCALES resultante de la provisión de sus SERVICIOS y adoptará todas las medidas tendientes a proteger los bienes, equipos y PERSONAL de la COMPAÑÍA en las instalaciones.'},
      {type:'p', text:'El OFERENTE dispondrá e implementará la organización, planes y procedimientos adecuados a fin de garantizar que el OFERENTE ejecute los SERVICIOS conforme a:'},
      {type:'item', text:'Las leyes aplicables en materia de HSE, obteniendo, bajo su propio costo, los permisos, certificaciones y autorizaciones requeridos previo a la ejecución de la parte pertinente de los SERVICIOS;'},
      {type:'item', text:'Las normas de HSE requeridas por las buenas prácticas en la industria del petróleo y gas;'},
      {type:'item', text:'Los requerimientos de HSE y toda especificación de la COMPAÑÍA dispuesta en el presente Sub-Artículo 10.2 y detallado en el Anexo H3SE;'},
      {type:'item', text:'Todo DOCUMENTO DE ENLACE DE HSE dispuesto por la COMPAÑÍA y el OFERENTE.'},
      {type:'p', text:'En caso de que el OFERENTE identifique alguna discrepancia en o entre los requerimientos de HSE establecidos en las normas, regulaciones y documentos anteriormente mencionados, el OFERENTE deberá notificar dichas discrepancias a la COMPAÑÍA y, a menos que la COMPAÑÍA hubiera dispuesto por escrito lo contrario, aplicará las disposiciones o normas que establecen los requerimientos de HSE más rigurosos.'},
      {type:'title', text:'10.2.1 Extinción de las obligaciones'},
      {type:'p', text:'A menos que se disponga expresamente lo contrario en la OFERTA, no se eximirá al OFERENTE de ninguna responsabilidad u obligación contractual o extracontractual derivada de una auditoría, inspección, análisis, aprobación, autorización, ratificación o similar llevada a cabo por la COMPAÑÍA, las autoridades de control u organismos de certificación.'},
      {type:'title', text:'10.2.2 Recursos'},
      {type:'p', text:'Si el OFERENTE no cumpliera con alguno de los requerimientos de HSE dispuestos en la OFERTA, la COMPAÑÍA podrá, a su criterio, sin que esto represente una limitación a otros recursos contractuales (incluyendo la suspensión de la ejecución de los SERVICIOS y/o la rescisión de la OFERTA en virtud de los Artículos correspondientes en las Condiciones Generales) o extracontractuales, previa notificación al OFERENTE:'},
      {type:'item', text:'i. ejecutar o procurar que un tercero ejecute las acciones necesarias para satisfacer dichos requerimientos, imputando los costos inherentes a ello al OFERENTE; y/o'},
      {type:'item', text:'ii. suspender con efecto inmediato todos los pagos a cargo de la COMPAÑÍA, en virtud de lo dispuesto en las cláusulas correspondientes.'},
      {type:'title', text:'10.3 Responsabilidades de Gestión del OFERENTE'},
      {type:'p', text:'El OFERENTE deberá demostrar que su SG EN HSE, suplementado por el DOCUMENTO DE ENLACE DE HSE, es compatible con el SG EN HSE de la COMPAÑÍA y cumple con todos los requerimientos de HSE de la OFERTA.'},
      {type:'p', text:'El OFERENTE implementará dicho SG EN HSE del OFERENTE, incluyendo todos los procedimientos de HSE necesarios para obtener la aprobación de la COMPAÑÍA, antes de iniciar la ejecución de los SERVICIOS.'},
      {type:'p', text:'El OFERENTE deberá acreditar una organización funcional y los recursos adecuados para la correcta implementación de su SG EN HSE y del DOCUMENTO DE ENLACE DE HSE.'},
      {type:'p', text:'El OFERENTE designará un representante de HSE, cuyas funciones consistirán en:'},
      {type:'item', text:'a) controlar la correcta implementación, actualización y comunicación de los cambios que se efectúen en el SG EN HSE del OFERENTE, y'},
      {type:'item', text:'b) gestionar las interfaces con sus SUBCONTRATISTAS.'},
      {type:'p', text:'El OFERENTE deberá asegurarse de que el personal del OFERENTE involucrado en la ejecución de los SERVICIOS tenga pleno conocimiento de sus funciones y deberes respecto de la política de HSE del OFERENTE, los objetivos de HSE de la OFERTA y los requerimientos del SG EN HSE del OFERENTE.'},
      {type:'p', text:'El OFERENTE deberá, bajo su propio costo y en cualquier instalación, garantizar la salud y la seguridad de cualquier persona involucrada en la ejecución de los SERVICIOS.'},
      {type:'p', text:'A fin de garantizar una correcta comunicación entre el personal del OFERENTE, se utilizará un idioma común para todas las cuestiones de HSE.'},
      {type:'p', text:'El OFERENTE adoptará una actitud constructiva basada en el diálogo abierto con cualquier tercero y prestará especial consideración a la/s COMUNIDAD(ES) LOCAL(ES).'},
      {type:'title', text:'10.4 Responsabilidades Operativas del OFERENTE'},
      {type:'p', text:'El OFERENTE dispondrá e implementará los procedimientos adecuados para garantizar la ejecución de los SERVICIOS de conformidad con el SG EN HSE de la COMPAÑÍA, el DOCUMENTO DE ENLACE DE HSE y los requerimientos de HSE de la OFERTA.'},
      {type:'p', text:'Sin restricción a la generalidad de lo que antecede, las obligaciones del OFERENTE en cualquier instalación comprenderán:'},
      {type:'item', text:'la responsabilidad por la implementación de un sistema de control e informes de HSE;'},
      {type:'item', text:'garantizar que todo el personal del OFERENTE, conforme a su propio nivel, tenga pleno conocimiento y pueda manejar los riesgos inherentes a su actividad específica o la de su equipo;'},
      {type:'item', text:'asegurarse de que el personal clave y el Representante del OFERENTE asistan a los comités de HSE organizados por la COMPAÑÍA; y'},
      {type:'item', text:'acreditar la existencia de un sistema de traspaso de información de seguridad para los cambios de turno y personal, y la responsabilidad por su implementación.'},
      {type:'title', text:'10.5 Evaluación y Gestión de Riesgos'},
      {type:'p', text:'Antes de la fecha de inicio, el OFERENTE, bajo su propio costo, realizará relevamientos en la/s instalación/es a fin de evaluar las condiciones de seguridad e identificar riesgos, problemas sanitarios y vulnerabilidades ambientales y sociales en la/s COMUNIDAD(ES) LOCAL(ES). Los informes de dichos relevamientos serán presentados ante la COMPAÑÍA para su evaluación.'},
      {type:'p', text:'Antes de la fecha de inicio, el OFERENTE elaborará y presentará a la COMPAÑÍA para su aprobación el PLAN DE HSE DEL OFERENTE en el que se expondrán los riesgos específicos asociados a la ejecución de los SERVICIOS.'},
      {type:'p', text:'El OFERENTE tomará todas las medidas necesarias y ejecutará los SERVICIOS objeto de la OFERTA de modo tal de disminuir la probabilidad de riesgos y sus efectos. Si, a criterio de la COMPAÑÍA, el nivel de riesgos fuera inaceptable, la COMPAÑÍA se reserva el derecho de gestionar la respuesta ante emergencias a fin de resolver la situación y utilizar, de ser necesario, los bienes y equipos del OFERENTE a discreción para llevar a cabo acciones de control de emergencias asociadas.'},
      {type:'p', text:'El OFERENTE realizará evaluaciones formales y documentadas de los riesgos inherentes a las tareas antes de iniciar el desarrollo de actividades potencialmente riesgosas.'},
      {type:'p', text:'El OFERENTE implementará oportunamente un plan de acción destinado a corregir todas las deficiencias de HSE identificadas.'},
      {type:'title', text:'10.6 Respeto por el Medio Ambiente'},
      {type:'p', text:'La COMPAÑÍA otorga y exige, del mismo modo, que el OFERENTE otorgue la mayor importancia y prioridad al cuidado del medio ambiente en todos los niveles de su organización durante la ejecución de los SERVICIOS.'},
      {type:'title', text:'10.6.1 Reducir los Impactos Ambientales'},
      {type:'p', text:'Previo a la fecha de inicio, la COMPAÑÍA le proveerá al OFERENTE cualquier información a disposición de la COMPAÑÍA que permita al OFERENTE tener conocimiento de:'},
      {type:'item', text:'las condiciones iniciales en toda instalación de la COMPAÑÍA y sus alrededores, incluyendo la existencia de alguna zona ecológicamente vulnerable y algún deterioro preexistente, y'},
      {type:'item', text:'cualquier impacto y riesgo potencialmente significativo que la ejecución de los SERVICIOS podría causar en el medio ambiente.'},
      {type:'p', text:'El OFERENTE será responsable de la implementación de medidas efectivas, como parte del PLAN DE GESTIÓN AMBIENTAL (EMP) del OFERENTE descripto en el subartículo 10.6.2, y de conformidad con la información que antecede, destinadas a reducir el impacto que la ejecución de los SERVICIOS pudiera generar en el medio ambiente, incluida la biodiversidad.'},
      {type:'p', text:'El OFERENTE identificará y evaluará los impactos potenciales que sus actividades podrían causar en el medio ambiente e implementará las medidas de mitigación necesarias para minimizar dichos impactos.'},
      {type:'p', text:'El OFERENTE deberá considerar los factores de impacto ambiental relevantes, incluyendo las huellas, el consumo de energía, las emisiones a la atmósfera, particularmente las emisiones de gas que contribuyen al efecto invernadero, el uso de recursos naturales, la producción de desechos domésticos e industriales, el uso de sustancias químicas, los vertidos al agua, la contaminación acústica, los olores y las fugas accidentales.'},
      {type:'title', text:'10.6.2 Gestión Ambiental'},
      {type:'p', text:'Previo a la fecha de inicio, el OFERENTE desarrollará e implementará un PLAN DE GESTIÓN AMBIENTAL destinado a gestionar los impactos y riesgos ambientales que incluirá, como mínimo, un PLAN DE MANEJO DE DESECHOS y un plan de respuesta ante derrames, de conformidad con el PLAN DE RESPUESTA ANTE EMERGENCIAS DE LA COMPAÑÍA, a fin de evitar y aportar una respuesta efectiva ante cualquier contaminación accidental causada por la ejecución de los SERVICIOS a cargo del OFERENTE.'},
      {type:'p', text:'El contenido de dichos planes se describe en detalle en el Anexo 2.'},
      {type:'title', text:'10.6.3 Control e Informes'},
      {type:'p', text:'El OFERENTE controlará, registrará e informará regularmente a la COMPAÑÍA acerca de los factores de impacto ambiental de relevancia.'},
      {type:'p', text:'El OFERENTE notificará inmediatamente a la COMPAÑÍA acerca de cualquier fuga accidental contaminante que pudiera afectar al medio ambiente.'},
      {type:'title', text:'10.6.4 Finalización de la ejecución de los SERVICIOS'},
      {type:'p', text:'Una vez finalizada la ejecución de los SERVICIOS, el OFERENTE, previo a la evacuación de la instalación, deberá retirar, en forma inmediata y bajo su propio costo, todo excedente de materiales, los bienes y equipos del OFERENTE, toda instalación temporaria y/o depósito de materiales, y los escombros o desechos generados por la ejecución de los SERVICIOS, y llevar a cabo todas las acciones adicionales acordadas entre las PARTES.'},
      {type:'title', text:'10.7 Respeto por la/s COMUNIDAD(ES) LOCAL(ES)'},
      {type:'p', text:'Antes de la fecha de inicio, la COMPAÑÍA y el OFERENTE intercambiarán toda información de utilidad que tengan en su poder referente al contexto socio-económico, el impacto potencial y la situación inicial de cualquier instalación (incluyendo los ESBS y/o EISA).'},
      {type:'p', text:'El OFERENTE deberá respetar en todo momento el medio ambiente y la cultura de la COMUNIDAD LOCAL.'},
      {type:'p', text:'El OFERENTE tomará todas las medidas necesarias tendientes a limitar el impacto socio-económico que la ejecución de los SERVICIOS pudiera causar en la COMUNIDAD LOCAL y, particularmente:'},
      {type:'item', text:'a) implementará y presentará ante la COMPAÑÍA para su evaluación una organización adecuada (incluyendo los recursos humanos) destinada a prevenir, identificar y controlar cualquier incidente socio-económico relacionado, y'},
      {type:'item', text:'b) desarrollará y presentará ante la COMPAÑÍA para su evaluación los procedimientos de revisión destinados a abordar, como mínimo, las siguientes cuestiones:'},
      {type:'item', text:'establecer y mantener una relación positiva con la COMUNIDAD LOCAL en cualquier instalación donde se ejecuten los SERVICIOS, incluyendo los alrededores de los campamentos;'},
      {type:'item', text:'desarrollar las oportunidades de empleo, contratación, capacitación y construcción de capacidades de la COMUNIDAD LOCAL, garantizando el respeto de las leyes aplicables y los derechos fundamentales en cualquier instalación en la que se ejecuten los SERVICIOS o se realicen las actividades, conforme a la Declaración Universal de los Derechos Humanos de las Naciones Unidas y los principios esenciales de la Organización Mundial del Trabajo que los definen y amparan;'},
      {type:'item', text:'verificar que las normas de seguridad para el transporte que regulan los traslados efectuados por el OFERENTE tengan en cuenta la seguridad de la COMUNIDAD LOCAL que pudiera resultar afectada por dichos traslados;'},
      {type:'item', text:'evitar los impactos sanitarios negativos que las actividades desarrolladas por el OFERENTE pudieran ocasionar a la COMUNIDAD LOCAL;'},
      {type:'item', text:'hacer todos los esfuerzos razonables para evitar y limitar cualquier daño que la infraestructura, los servicios públicos, los recursos naturales, los caminos, las zonas de las trazas y activos similares que benefician a la COMUNIDAD LOCAL pudieran sufrir; y'},
      {type:'item', text:'hacer todos los esfuerzos razonables para evitar y limitar cualquier daño que los sitios culturales y arqueológicos pudieran sufrir a través de la implementación de medidas adecuadas, tales como la realización de campañas de prevención conjuntamente con las autoridades locales competentes o especialistas reconocidos.'},
      {type:'p', text:'A pedido de la COMPAÑÍA, el OFERENTE le informará acerca de la implementación de las acciones mencionadas.'},
      {type:'p', text:'Previo a la fecha de inicio, el OFERENTE y la COMPAÑÍA acordarán el modo de gestionar todo daño previsible, incluyendo las medidas de mitigación y compensación a la COMUNIDAD LOCAL.'},
      {type:'p', text:'El OFERENTE registrará e informará eficaz y oportunamente a la COMPAÑÍA acerca de cualquier queja formulada por la COMUNIDAD LOCAL respecto de algún impacto o incidente ocurrido durante la ejecución de los SERVICIOS. El OFERENTE y la COMPAÑÍA establecerán de común acuerdo las medidas adecuadas para resolver dichas quejas.'},
      {type:'title', text:'10.8 Protección de la Salud'},
      {type:'p', text:'La COMPAÑÍA otorga y exige, del mismo modo, que el OFERENTE otorgue la mayor importancia y prioridad a la salud en todos los niveles de su organización durante la ejecución de los SERVICIOS.'},
      {type:'p', text:'El OFERENTE deberá llevar a cabo sistemáticamente evaluaciones y controles de riesgos a fin de poder implementar las medidas correctivas pertinentes en cualquier instalación.'},
      {type:'title', text:'10.8.1 Aptitud Física'},
      {type:'p', text:'El OFERENTE deberá contar con una política de control de aptitud física y será responsable de su implementación. El OFERENTE pondrá a disposición de la COMPAÑÍA, cuando ésta lo solicite, los certificados de aptitud física correspondientes. El OFERENTE deberá realizar todos los exámenes pertinentes a fin de verificar que el PERSONAL DEL OFERENTE involucrado en la ejecución de los SERVICIOS se encuentre físicamente apto para realizar la tarea que se le asigna.'},
      {type:'title', text:'10.8.2 Asistencia Médica y Comunicación'},
      {type:'p', text:'El OFERENTE deberá garantizar el cumplimiento del PLAN SANITARIO DE LA COMPAÑIA y asegurarse de que el PERSONAL DEL OFERENTE tenga conocimiento de las cuestiones sanitarias y modos de PREVENCION DE PANDEMIAS.'},
      {type:'p', text:'A menos que se establezca lo contrario, el OFERENTE será responsable del suministro de servicios de asistencia médica, instalaciones de primeros auxilios y evacuación médica para todo el PERSONAL DEL OFERENTE durante la ejecución de los SERVICIOS. A pedido de la COMPAÑÍA, el OFERENTE deberá permitir el acceso del PERSONAL DE LA COMPAÑÍA a dichos servicios e instalaciones.'},
      {type:'p', text:'El OFERENTE deberá procurar que se mantenga una relación estrecha entre la organización médica del OFERENTE y el servicio de asistencia médica de la COMPAÑÍA.'},
      {type:'title', text:'10.8.3 Sustancias Tóxicas Peligrosas y/o Materiales Peligrosos'},
      {type:'p', text:'Previo a la fecha de inicio, el OFERENTE presentará por escrito a la COMPAÑÍA para su revisión los procedimientos para la ejecución de cualquier SERVICIO que implique el uso de sustancias tóxicas o materiales peligrosos a los que el OFERENTE pudiera estar expuesto.'},
      {type:'p', text:'El OFERENTE garantizará la correcta implementación de los procedimientos para el inventario, manipulación, almacenamiento, utilización y eliminación final de toda sustancia o material empleado durante la ejecución de los SERVICIOS que fuera considerado tóxico o peligroso para la salud, conforme a las regulaciones pertinentes.'},
      {type:'p', text:'Sin perjuicio de ningún otro derecho o recurso, el incumplimiento de alguno de los requerimientos del presente Sub-Artículo 10.8.3 por parte del OFERENTE facultará a la COMPAÑÍA a rechazar dichas sustancias tóxicas o materiales peligrosos.'},
      {type:'title', text:'10.8.4 Equipos de Protección Personal (EPP)'},
      {type:'p', text:'El OFERENTE implementará un plan de manejo eficaz de EPP dentro de la organización del OFERENTE.'},
      {type:'p', text:'El OFERENTE asignará los EPP adecuados al PERSONAL involucrado en la ejecución de los SERVICIOS en cualquier instalación y exigirá el cumplimiento de las prácticas operativas necesarias para evitar cualquier exposición nociva durante la ejecución de los mismos.'},
      {type:'title', text:'10.8.5 Evaluación de Riesgos de Higiene en el Ámbito de Trabajo'},
      {type:'p', text:'La COMPAÑÍA proveerá al OFERENTE la información referente a la evaluación de riesgos de higiene en cualquier instalación de la COMPAÑÍA, incluyendo el área de perforación (si correspondiere) a la que fuera destinado el PERSONAL DEL OFERENTE.'},
      {type:'p', text:'El OFERENTE llevará a cabo la evaluación de riesgos de higiene que atañen las tareas asignadas al PERSONAL DEL OFERENTE a los efectos de verificar la identificación de los riesgos sanitarios (químicos, físicos, biológicos y ergonómicos) inherentes a las tareas que desempeñan y la implementación de las medidas preventivas correspondientes.'},
      {type:'p', text:'El archivo de la evaluación de riesgos de higiene del OFERENTE o cualquier otra información referente a los riesgos de higiene relacionados con la ejecución de los SERVICIOS a cargo del OFERENTE estará a disposición de la COMPAÑÍA cuando lo solicite.'},
      {type:'title', text:'10.8.6 Jornada Laboral y Condiciones de Trabajo'},
      {type:'p', text:'El OFERENTE deberá garantizar que la jornada laboral, la duración de los períodos de rotación y las condiciones ergonómicas se ajusten a las leyes aplicables y no incrementen los riesgos laborales.'},
      {type:'title', text:'10.8.7 Condiciones Sanitarias, Alojamiento y Catering'},
      {type:'p', text:'El OFERENTE deberá cumplir con la política de la COMPAÑÍA referente a la limpieza, el orden, la higiene y las cuestiones sanitarias mencionadas en el Anexo 2.'},
      {type:'title', text:'10.8.8 Consumo de Alcohol, Drogas y Tabaco'},
      {type:'p', text:'El OFERENTE ha adoptado o adoptará su propia política acerca de la prohibición del consumo de alcohol y drogas, la cual deberá cumplir, como mínimo, con los requerimientos previos establecidos en la política de seguridad de la COMPAÑÍA, que regula el consumo de alcohol y drogas, dispuesta en el Anexo 2. Dicha política del OFERENTE sobre alcohol y drogas deberá ser implementada por todo el grupo del OFERENTE.'},
      {type:'title', text:'10.8.9 Manejo de Vehículos y Transporte'},
      {type:'p', text:'El OFERENTE ha adoptado o adoptará su propia política sobre manejo de vehículos, la cual deberá cumplir, como mínimo, con los requerimientos previos establecidos en la política de seguridad que rige el manejo de vehículos de la COMPAÑÍA dispuesta en el Anexo 2. La política de manejo de vehículos del OFERENTE deberá ser comunicada al PERSONAL DEL OFERENTE.'},
      {type:'title', text:'10.9 SubOFERENTEs'},
      {type:'p', text:'El OFERENTE hará sus mejores esfuerzos por limitar el nivel de subcontratación durante la ejecución de los SERVICIOS.'},
      {type:'p', text:'Al evaluar y seleccionar a sus SUBCONTRATISTAS, el OFERENTE deberá:'},
      {type:'item', text:'considerar la capacidad del potencial SUBCONTRATISTA para cumplir con los requerimientos de HSE de la OFERTA y gestionar los riesgos inherentes a su actividad en cualquier instalación;'},
      {type:'item', text:'cumplir con las LEYES APLICABLES en materia de contrataciones a las que deberá someterse para seleccionar a los proveedores locales y cumplir con todo procedimiento aplicable sobre contratación de proveedores locales descripto en la Parte 7 del Anexo 2.'},
      {type:'p', text:'El OFERENTE deberá asegurarse de que las responsabilidades de HSE de cada miembro del OFERENTE estén claramente incorporadas en las subOFERTAs correspondientes.'},
      {type:'p', text:'El OFERENTE deberá asegurarse de que cada uno de sus miembros cumpla con los requerimientos de HSE dispuestos en la OFERTA y cuente con un eficaz Sistema de Gestión de HSE compatible con el MS de HSE de la COMPAÑÍA, el MS de HSE del OFERENTE y el DOCUMENTO DE ENLACE DE HSE que los complementa.'},
      {type:'p', text:'El OFERENTE será responsable de controlar que sus SUBCONTRATISTAS cumplan con los requerimientos de HSE establecidos en la OFERTA e implementará un sistema de evaluación para verificar que los bienes y equipos del OFERENTE se ajusten a los requerimientos de HSE de la OFERTA.'},
      {type:'p', text:'El OFERENTE deberá desarrollar y mantener vigente un procedimiento sobre contratación y proveedores locales sujeto a las leyes aplicables y los requerimientos de la OFERTA.'},
      {type:'title', text:'10.10 Competencia Profesional y Capacitación'},
      {type:'p', text:'El OFERENTE deberá asegurarse de que su PERSONAL tenga los certificados adecuados que acrediten su capacitación en HSE y posea el dominio y los conocimientos de HSE requeridos.'},
      {type:'p', text:'El OFERENTE capacitará y promoverá la concientización del PERSONAL DEL OFERENTE en materia de HSE y se asegurará de que dicha capacitación se brinde en forma continua y mejorada durante la ejecución de los SERVICIOS. El plan de capacitación deberá estar vigente a la fecha de inicio y se actualizará de acuerdo con el PLAN DE HSE DEL OFERENTE.'},
      {type:'p', text:'El OFERENTE deberá demostrar que el PERSONAL DEL OFERENTE ha recibido la capacitación de HSE requerida para ejecutar los SERVICIOS pertinentes en la instalación correspondiente (por ej.: el curso de supervivencia y evacuación en el mar). El contenido y los certificados correspondientes a la capacitación de HSE deberán presentarse a la COMPAÑÍA cuando lo solicite.'},
      {type:'p', text:'El OFERENTE deberá garantizar que el PERSONAL DEL OFERENTE asignado para ejecutar LOS SERVICIOS esté capacitado acerca del uso de los Equipos de Protección Personal y equipos de emergencia.'},
      {type:'title', text:'10.11 Preparación para Emergencias'},
      {type:'p', text:'El OFERENTE deberá elaborar una serie de PLANES DE RESPUESTA ANTE EMERGENCIAS DEL OFERENTE y presentarlos ante la COMPAÑÍA para su revisión antes de la fecha de inicio. Dichos planes se probarán y actualizarán con regularidad.'},
      {type:'p', text:'El PERSONAL DEL OFERENTE participará en los simulacros de emergencia organizados durante la ejecución de los SERVICIOS en cualquier instalación.'},
      {type:'p', text:'El PERSONAL DEL OFERENTE que pudiera participar en la gestión de una crisis deberá tener pleno conocimiento de su función.'},
      {type:'p', text:'En el caso de un accidente u operaciones de Búsqueda y Rescate (BYR) en las que pudiera estar involucrado el PERSONAL DEL OFERENTE, la COMPAÑÍA hará sus mejores esfuerzos por:'},
      {type:'item', text:'(i) brindar primeros auxilios y asistir a las víctimas en cualquier instalación, conforme a las leyes aplicables en materia de seguridad; y,'},
      {type:'item', text:'(ii) suministrar todos los recursos de comunicación y transporte disponibles para las operaciones de BYR y el traslado de las víctimas desde la instalación hasta el punto de evacuación identificado.'},
      {type:'p', text:'Los costos de dichas operaciones de BYR y traslados provistos por la COMPAÑÍA al OFERENTE serán afrontados por el OFERENTE, a menos que la COMPAÑÍA autorice lo contrario.'},
      {type:'p', text:'Sin perjuicio de lo dispuesto por la CLAUSULA 5, el OFERENTE defenderá, mantendrá indemne y eximirá de responsabilidad a la COMPAÑÍA ante cualquier demanda que pudiera surgir en relación con la provisión, falta de provisión o incapacidad para proveer dicha asistencia y/o ejecutar las operaciones de BYR. El OFERENTE deberá, cuando corresponda, elaborar y mantener vigente su propio plan de evacuación de emergencia.'},
      {type:'p', text:'El Representante del OFERENTE decidirá cuándo evacuar al PERSONAL DEL OFERENTE a causa de una enfermedad, afección o lesión física.'},
      {type:'title', text:'10.12 Análisis de Incidentes'},
      {type:'p', text:'El OFERENTE contará con un sistema de gestión de incidentes destinado a identificar, notificar, analizar y corregir todo acto o condición insegura que se observe en cualquier instalación.'},
      {type:'p', text:'El OFERENTE notificará inmediatamente a la COMPAÑÍA todo incidente o accidente que ocurra durante la ejecución de los SERVICIOS y proveerá e implementará de inmediato los planes de acciones correctivas correspondientes.'},
      {type:'p', text:'El OFERENTE deberá tener en cuenta los resultados del análisis de incidentes y actos/condiciones inseguras durante la preparación para la ejecución de los SERVICIOS subsiguientes.'},
      {type:'title', text:'10.13 Auditorías e Inspecciones de HSE'},
      {type:'p', text:'El OFERENTE analizará periódicamente su política de HSE y la implementación y cumplimiento de su MS de HSE durante las auditorías, inspecciones y evaluaciones internas del OFERENTE.'},
      {type:'p', text:'El OFERENTE verificará que los bienes y equipos del OFERENTE se hayan inspeccionado y certificado conforme a lo requerido por la OFERTA.'},
      {type:'p', text:'El representante de HSE del OFERENTE someterá al PERSONAL, bienes y equipos del OFERENTE a inspecciones y auditorías de HSE periódicas durante la ejecución de los SERVICIOS en cualquier instalación.'},
      {type:'p', text:'El OFERENTE definirá e implementará un plan de acción basado en las conclusiones de cada auditoría.'},
      {type:'p', text:'Sin perjuicio de lo dispuesto en el Sub-Artículo 10.14, la COMPAÑÍA y sus representantes tendrán derecho a inspeccionar cualquiera de las instalaciones del OFERENTE (incluyendo las instalaciones del OFERENTE) cuando lo consideren oportuno y a auditar los registros de los SERVICIOS para verificar el cumplimiento de los requerimientos de HSE establecidos en la OFERTA por parte del OFERENTE. El OFERENTE acuerda cooperar plenamente con dichas auditorías, poniendo a disposición de la COMPAÑÍA o sus representantes todos sus libros y registros, y respondiendo todas las preguntas que la COMPAÑÍA pudiera plantear con respecto al desempeño de sus obligaciones de HSE emergentes de la OFERTA.'},
      {type:'title', text:'10.14 Plan de Mejoras de HSE'},
      {type:'p', text:'El OFERENTE dispondrá de un plan de mejoras de desempeño de HSE de acuerdo con los requerimientos de HSE de la COMPAÑÍA. El OFERENTE será responsable de la implementación de dicho plan por parte del OFERENTE y deberá tener en cuenta los resultados de las auditorías e inspecciones, los análisis de riesgos y los comentarios acerca de los incidentes y anomalías.'},
      {type:'title', text:'10.15 Seguridad'},
      {type:'p', text:'En todo momento durante la ejecución de los SERVICIOS, el OFERENTE deberá tomar todas las medidas necesarias y desarrollar las actividades dispuestas por la OFERTA de modo tal de minimizar los riesgos de pérdida, robo, sabotaje, daño o vandalismo, entre otros, que pudieran sufrir los bienes o equipos.'},
      {type:'p', text:'La COMPAÑÍA y el OFERENTE pretenden implementar en sus respectivas instalaciones medidas de protección frente a posibles amenazas contra el PERSONAL que trabaja en dichas instalaciones y los activos físicos que allí se encuentran. Dichas medidas deberán ser acordes a las circunstancias y congruentes con las leyes aplicables y las siguientes normas internacionales:'},
      {type:'item', text:'(i) La Declaración Universal de Derechos Humanos de las Naciones Unidas (ONU),'},
      {type:'item', text:'(ii) Los Principios Voluntarios de Seguridad y Derechos Humanos,'},
      {type:'item', text:'(iii) El Código de Conducta de la ONU para Funcionarios Encargados de Hacer Cumplir la Ley, y'},
      {type:'item', text:'(iv) Los Principios de la ONU sobre el Empleo de la Fuerza y las Armas de Fuego.'},
      {type:'p', text:'Se provee más información acerca de dichas normas en el Sub-Artículo 15.4 (Principios y Normativa) del Anexo 2 de la OFERTA que acompaña al presente.'},
      {type:'p', text:'Las medidas de protección a ser implementadas por el OFERENTE o la COMPAÑIA se detallan en el Sub-Artículo 15.3.1 (Principios fundamentales) del Anexo 2 de la OFERTA adjunto al presente. El cumplimiento de dichas medidas por parte del OFERENTE no liberará al OFERENTE de su responsabilidad de mantener los niveles de seguridad física adecuados, ni se considerará que pueda limitar su obligación de ejecutar toda acción razonablemente solicitada por la COMPAÑÍA a los efectos de establecer y mantener las condiciones de seguridad patrimonial en las instalaciones del OFERENTE.'},
      {type:'p', text:'El OFERENTE deberá notificar inmediatamente a la COMPAÑÍA respecto de cualquier incidente relacionado con la seguridad patrimonial, incluyendo pérdidas, robos y vandalismo, que ocurra en las instalaciones del OFERENTE.'},
      {type:'title', text:'10.16 Requerimientos específicos en materia de H3SE'},
      {type:'p', text:'Los requerimientos específicos en materia de H3SE aplicables a los SERVICIOS que serán prestados por el OFERENTE se encuentran detallados en el Apéndice Nº 1 del Anexo 2 de la presente OFERTA.'}
    ]
  },
  c11: {
    title: 'Principios Fundamentales de Contratación',
    blocks: [
      {type:'p', text:'La COMPAÑÍA integra todos los aspectos de la sustentabilidad en el centro de su estrategia, proyectos y operaciones, y pretende ser una referencia en cuanto a los compromisos con los Objetivos de Desarrollo Sustentable (ODS). Los Principios Fundamentales de Contratación, derivados del Código de Conducta de la COMPAÑÍA, son la piedra angular de la relación de largo plazo que pretende forjar con los OFERENTES. Por lo tanto, la COMPAÑÍA exige a todos sus OFERENTES del SERVICIO que cumplan con estos principios y garanticen el cumplimiento por parte de sus propios proveedores SUBCONTRATISTAS a su vez.'},
      {type:'p', text:'El OFERENTE está obligado a cumplir y hacer cumplir a sus propios OFERENTES y SUBCONTRATISTAS las LEYES APLICABLES, así como los principios equivalentes a aquellos establecidos en la Declaración Universal de Derechos Humanos, los principales convenios de la Organización Internacional del Trabajo, los Principios Rectores en Negocios y Derechos Humanos de las Naciones Unidas, el Pacto Mundial de las Naciones Unidas, los Principios Voluntarios en Seguridad y Derechos Humanos, y las Líneas Directrices de la OCDE para Empresas Multinacionales.'},
      {type:'p', text:'El OFERENTE deberá aplicar políticas y procedimientos eficaces, en particular con respecto a los principios que se exponen a continuación.'},
      {type:'title', text:'PRINCIPIO 1: Respetar los derechos humanos en el trabajo'},
      {type:'p', text:'Asegurar que las condiciones de trabajo y la remuneración de los trabajadores preserven la dignidad humana y sean consistentes con los principios definidos por la Declaración Universal de los Derechos Humanos y por los Convenios fundamentales de la Organización Internacional del Trabajo.'},
      {type:'subtitle', text:'Prohibición y prevención del trabajo infantil'},
      {type:'item', text:'Prohibir el empleo de trabajadores menores de 18 años para trabajos peligrosos y nocturnos, y prohibir el empleo de trabajadores menores de 15 años, excepto cuando la legislación local prevea una mayor protección para el niño.'},
      {type:'subtitle', text:'Prohibición y prevención del trabajo forzoso'},
      {type:'item', text:'Asegurar que ningún trabajador sea obligado a trabajar en contra de su voluntad mediante el uso de violencia, intimidación, coerción financiera o amenaza de pena o sanción.'},
      {type:'item', text:'Prohibir la confiscación de los documentos de identidad de los trabajadores, contemplando que donde la ley local requiera que dichos documentos sean retenidos, los trabajadores tengan acceso inmediato y automático a los mismos.'},
      {type:'item', text:'Garantizar que no se cobren honorarios de contratación al trabajador.'},
      {type:'subtitle', text:'Condiciones de trabajo, remuneración e indemnización'},
      {type:'item', text:'Establecer un CONTRATO de trabajo.'},
      {type:'item', text:'Proporcionar un salario digno y garantizar el cumplimiento de un número máximo de horas de trabajo, tiempo de descanso adecuado y licencia parental otorgadas por la LEY APLICABLE.'},
      {type:'item', text:'Documentar el cumplimiento de dichos requisitos.'},
      {type:'subtitle', text:'Salud y Seguridad en el trabajo'},
      {type:'item', text:'Proporcionar un lugar de trabajo saludable y seguro donde los trabajadores estén protegidos de accidentes, lesiones y enfermedades causadas por el trabajo.'},
      {type:'item', text:'Cuando el empleador proporcione alojamiento, deberá garantizar que éste sea seguro, limpio y adecuado como espacio habitable.'},
      {type:'subtitle', text:'Prohibición y prevención de la discriminación y el acoso en el lugar de trabajo'},
      {type:'item', text:'Prohibir el acoso y las prácticas que den lugar a un trato discriminatorio de los trabajadores, con especial atención a la contratación, compensación, beneficios o despido.'},
      {type:'subtitle', text:'Libertad de expresión, de asociación y de negociación colectiva, libertad de pensamiento, de conciencia y de religión'},
      {type:'item', text:'Permitir a los trabajadores ser miembros de una organización de negociación colectiva. En los países en los que este derecho está restringido, garantizar que los empleados tengan derecho a participar en un diálogo sobre su situación laboral colectiva.'},
      {type:'subtitle', text:'Quejas y Preocupaciones'},
      {type:'item', text:'Asegurar que los trabajadores puedan expresar sus reclamos y preocupaciones sin temor a represalias.'},
      {type:'title', text:'PRINCIPIO 2: Proteger la salud, la seguridad y la seguridad física/patrimonial'},
      {type:'p', text:'Poner en marcha un sistema adecuado de gestión de la salud, la seguridad y la protección para:'},
      {type:'item', text:'Realizar análisis y evaluaciones de riesgos en estos ámbitos e implementar los medios adecuados para prevenirlos;'},
      {type:'item', text:'Establecer un sistema para monitorear eventos que ocurran en estas áreas.'},
      {type:'item', text:'Implementar planes de respuesta a incidentes y medios de intervención diseñados para enfrentar los diferentes tipos de eventos que pueda enfrentar el OFERENTE.'},
      {type:'item', text:'Llevar a cabo una revisión periódica de las políticas y medidas pertinentes e instituir las medidas de control adecuadas.'},
      {type:'title', text:'PRINCIPIO 3: Actuar a favor del clima'},
      {type:'item', text:'Implementar un sistema de gestión de la eficiencia energética.'},
      {type:'item', text:'Buscar continuamente reducir las emisiones de gases de efecto invernadero de las operaciones, productos y servicios.'},
      {type:'title', text:'PRINCIPIO 4: Preservar el medio ambiente'},
      {type:'subtitle', text:'Protección del ambiente'},
      {type:'item', text:'Limitar el impacto de las actividades industriales en el medio ambiente, incluidos los posibles impactos en la calidad del aire, los recursos hídricos y los suelos.'},
      {type:'item', text:'Implementar un enfoque sistemático para definir objetivos ambientales medibles, lograrlos y demostrar que se han logrado.'},
      {type:'item', text:'Implementar un adecuado sistema de gestión de riesgos ambientales basado en el principio de Evitar-Reducir-Compensar con el fin de identificar y controlar el impacto ambiental de las actividades, productos o servicios.'},
      {type:'item', text:'Implementar las mejoras necesarias para la protección del medio ambiente.'},
      {type:'subtitle', text:'Promoción de la economía circular y el uso responsable de los recursos naturales'},
      {type:'item', text:'Asegurar que los recursos naturales (agua, suelo, bosques...) se utilicen de manera eficiente.'},
      {type:'item', text:'Buscar continuamente minimizar la producción de residuos.'},
      {type:'item', text:'Aplicar los principios de "reducir, reutilizar, reciclar, valorizar".'},
      {type:'subtitle', text:'Protección de la biodiversidad'},
      {type:'item', text:'Garantizar que ningún sitio de producción, que pueda tener un impacto perjudicial sobre el medio ambiente, esté ubicado en áreas naturales protegidas enumeradas en las categorías I a IV por la Unión Internacional para la Conservación de la Naturaleza, en humedales designados en virtud de la Convención Internacional de Ramsar o en sitios inscritos en el inventario de los Sitios Naturales Patrimonio de la Humanidad de la UNESCO.'},
      {type:'item', text:'Buscar continuamente minimizar el impacto en la biodiversidad de las operaciones, productos y servicios aplicando el principio de Evitar-Reducir-Compensar.'},
      {type:'title', text:'PRINCIPIO 5: Prevenir la corrupción, el conflicto de intereses y luchar contra el fraude'},
      {type:'item', text:'Prevenir y prohibir cualquier forma de corrupción: activa o pasiva, privada o pública, directa o indirecta.'},
      {type:'item', text:'Luchar contra el fraude.'},
      {type:'item', text:'Evitar los conflictos de intereses, en particular, cuando los intereses personales puedan influenciar en los intereses profesionales.'},
      {type:'title', text:'PRINCIPIO 6: Respetar la ley de competencia'},
      {type:'item', text:'Cumplir con la legislación en materia de competencia.'},
      {type:'title', text:'PRINCIPIO 7: Promover el desarrollo económico y social'},
      {type:'item', text:'Crear un clima de confianza con las partes interesadas, entablando un diálogo con las comunidades locales.'},
      {type:'item', text:'Promover iniciativas locales de desarrollo sostenible.'},
      {type:'item', text:'Dar a las empresas locales la oportunidad de desarrollar su negocio.'},
      {type:'p', text:'El cumplimiento de estas leyes y principios puede ser auditado. Los OFERENTES deberán cooperar con el proceso de auditoría.'}
    ]
  },
  c12: {
    title: 'Requerimientos de Ciberseguridad',
    blocks: [
      {type:'p', text:'Los requisitos de Ciberseguridad aplicables a esta OFERTA son los siguientes:'},
      {type:'item', text:'Requisitos de OFERTA tipo 3: 1 a 13'},
      {type:'item', text:'Requisitos de OFERTA tipo 2: 1 a 24'},
      {type:'item', text:'Requisitos de OFERTA tipo 1: 1 a 33'},
      {type:'item', text:'Requisitos adicionales de OFERTA tipo 1 con recursos contractuales específicos: 34 a 67'},
      {type:'title', text:'12.1 Preámbulo'},
      {type:'p', text:'Estos requisitos de ciberseguridad establecen el marco mínimo y estándar de las normas que deben ser respetadas por el OFERENTE y sus posibles SUBCONTRATISTAS en el contexto de la ejecución de esta OFERTA.'},
      {type:'p', text:'Estas normas deben especificarse en el PLAN DE GARANTÍA DE SEGURIDAD para las OFERTAS tipo 1 y tipo 2.'},
      {type:'p', text:'Pueden especificarse para OFERTAS tipo 3 en un Plan de Garantía de Seguridad.'},
      {type:'p', text:'Los requisitos de ciberseguridad no prevalecerán ni anularán la aplicación de (i) las leyes y reglamentos aplicables sobre la ciberseguridad de los sistemas y datos, ni de (ii) las normas aplicables más precisas y estrictas sobre la ciberseguridad de los sistemas y datos, como las certificaciones de normas (ISO, ETSI o Ciberseguridad Europea) aplicables al OFERENTE, a sus productos, procedimientos y/o servicios, el reglamento interno y las normas acordadas de otro modo por las partes.'},
      {type:'p', text:'Se recuerda que, debido a su sensibilidad, algunos sistemas informáticos y sus recursos pueden estar sujetos a normas específicas, en particular, en materia de confidencialidad (por ejemplo, secreto de defensa), obligaciones técnicas, humanas y organizativas, control y AUDITORÍA, calificación y acreditación, gestión de alertas y crisis, etc. Las normas internas específicas (incluida la Política de Seguridad de los sistemas informáticos), así como las normas contractuales específicas, también se aplicarán y prevalecerán sobre estos requisitos de ciberseguridad.'},
      {type:'p', text:'Las referencias al OFERENTE deben entenderse como hechas al OFERENTE y a sus SUBCONTRATISTAS, y las obligaciones del OFERENTE se extenderán a los sistemas de información y recursos de sus SUBCONTRATISTAS.'},
      {type:'title', text:'12.2 Requisitos de la OFERTA Tipo 1, 2 y 3'},
      {type:'p', text:'[Tabla de 67 requisitos de ciberseguridad — pendiente de carga estructurada]'}
    ]
  },
  c13: {
    title: 'Valor Económico',
    blocks: [
      {type:'p', text:'La presente PROPUESTA será considerada aceptada por la COMPAÑIA al informar por escrito al OFERENTE el nombre del responsable del servicio en la COMPAÑÍA.'},
      {type:'p', text:'Atentamente,'}
    ]
  }
};

  var TABLE='clause_templates';
  var LS_KEY='clause_templates_v1';
  var state={data:null,loaded:false,sbId:null,currentKey:null,dirty:false};
  var refs={root:null,nav:null,list:null,editor:null,verInfo:null};

  function q(id){return document.getElementById(id);}
  function clear(el){while(el&&el.firstChild)el.removeChild(el.firstChild);}
  function make(tag,cls,txt){var el=document.createElement(tag);if(cls)el.className=cls;if(txt!=null)el.textContent=txt;return el;}
  function nowUser(){try{return (typeof _APP_USER!=='undefined'&&_APP_USER&&_APP_USER.username)||(typeof _APP_ROLE!=='undefined'&&_APP_ROLE)||'—';}catch(e){return '—';}}

  function emptyData(){
    var clauses={};
    CLAUSE_ORDER.forEach(function(k){
      var seed=CLAUSE_SEED[k]||{blocks:[]};
      clauses[k]={title:CLAUSE_TITLES[k],blocks:JSON.parse(JSON.stringify(seed.blocks))};
    });
    return {version:1,updatedAt:new Date().toISOString(),updatedBy:nowUser(),clauses:clauses,history:[]};
  }

  async function reload(){
    state.loaded=false;
    try{
      if(typeof SB_OK!=='undefined'&&SB_OK&&typeof sbFetch==='function'){
        var rows=await sbFetch(TABLE,'GET',null,'?select=id,datos&order=id.desc&limit=1');
        if(rows&&rows.length){
          state.sbId=rows[0].id;
          state.data=JSON.parse(rows[0].datos);
          state.loaded=true;
          return;
        }
        // No hay fila todavía: sembrar con el contenido inicial.
        var seedData=emptyData();
        var res=await sbFetch(TABLE,'POST',{datos:JSON.stringify(seedData)});
        if(res&&res[0])state.sbId=res[0].id;
        state.data=seedData;
        state.loaded=true;
        return;
      }
    }catch(err){
      console.warn('[legales] no se pudo usar Supabase, usando localStorage:',err.message);
    }
    try{
      var raw=localStorage.getItem(LS_KEY);
      state.data=raw?JSON.parse(raw):emptyData();
    }catch(e){
      state.data=emptyData();
    }
    state.loaded=true;
  }

  async function persist(){
    if(typeof localStorage!=='undefined')localStorage.setItem(LS_KEY,JSON.stringify(state.data));
    if(typeof SB_OK!=='undefined'&&SB_OK&&typeof sbFetch==='function'){
      try{
        var payload={datos:JSON.stringify(state.data)};
        if(state.sbId){await sbFetch(TABLE,'PATCH',payload,'?id=eq.'+state.sbId);}
        else{var res=await sbFetch(TABLE,'POST',payload);if(res&&res[0])state.sbId=res[0].id;}
      }catch(err){
        console.warn('[legales] no se pudo guardar en Supabase, quedó solo en localStorage:',err.message);
        if(typeof toast==='function')toast('No se pudo sincronizar con Supabase — se guardó localmente. Avisá a Sistemas para crear la tabla clause_templates.','er');
      }
    }
  }

  function ensureNav(){
    var nav=document.querySelector('.sb-nav');if(!nav)return;
    if(q('navLegalesModule')){refs.nav=q('navLegalesModule');return;}
    var a=make('a','nv');a.id='navLegalesModule';a.href='#';a.setAttribute('data-mod','legales');
    a.appendChild(make('span','ni','⚖️'));a.appendChild(make('span','','Legales'));
    a.addEventListener('click',function(ev){ev.preventDefault();showPage();});
    var usersLink=q('navUsersModule');
    if(usersLink&&usersLink.parentNode===nav){usersLink.insertAdjacentElement('afterend',a);}
    else{var sec=make('div','sb-sec','Administracion');nav.appendChild(sec);nav.appendChild(a);}
    refs.nav=a;
  }

  function ensureView(){
    var ct=document.querySelector('.ct');if(!ct)return;
    if(q('vLegalesModule')){refs.root=q('vLegalesModule');refs.list=q('legalesList');refs.editor=q('legalesEditor');refs.verInfo=q('legalesVerInfo');return;}
    var wrap=make('div','vw');wrap.id='vLegalesModule';
    var card=make('div','card');
    var hdr=make('div','thdr');hdr.appendChild(make('h2','','Legales — Clausulado del Modelo'));
    var info=make('div','info-box blue');info.style.margin='0 0 14px';
    info.innerHTML='Acá se edita el texto real de cada cláusula del modelo de Condiciones Particulares. Los contratos solo completan datos (fechas, montos, alcance); el texto legal se define acá y queda versionado.';
    card.appendChild(hdr);card.appendChild(info);
    var grid=make('div','');grid.style.display='grid';grid.style.gridTemplateColumns='260px 1fr';grid.style.gap='20px';grid.style.alignItems='start';
    var list=make('div','');list.id='legalesList';list.style.display='flex';list.style.flexDirection='column';list.style.gap='4px';
    var editorWrap=make('div','');
    var verInfo=make('div','');verInfo.id='legalesVerInfo';verInfo.style.fontSize='11px';verInfo.style.color='var(--g500)';verInfo.style.marginBottom='10px';
    var editor=make('div','');editor.id='legalesEditor';
    editorWrap.appendChild(verInfo);editorWrap.appendChild(editor);
    grid.appendChild(list);grid.appendChild(editorWrap);
    card.appendChild(grid);
    wrap.appendChild(card);ct.appendChild(wrap);
    refs.root=wrap;refs.list=list;refs.editor=editor;refs.verInfo=verInfo;
  }

  function setHeader(){
    var t=q('pgT'),a=q('pgA');if(!t||!a)return;
    clear(t);t.appendChild(document.createTextNode('⚖️ Legales '));var bc=make('span','bc','Clausulado');t.appendChild(bc);
    clear(a);var rec=make('button','btn btn-s btn-sm','Recargar');rec.type='button';rec.addEventListener('click',async function(){await reload();renderList();renderEditor();});a.appendChild(rec);
  }

  function hideAllViews(){
    ['vList','vForm','vDet','vMe2n','vMe2nDet','vIdx','vUsersModule','vLegalesModule'].forEach(function(id){var el=q(id);if(el)el.classList.remove('on');});
    document.querySelectorAll('.sb-nav .nv').forEach(function(n){n.classList.remove('act');});
  }

  async function showPage(){
    if(typeof canAccess==='function'&&!canAccess('legales')){if(typeof toast==='function')toast('Tu rol no tiene permiso para entrar a este módulo','er');return;}
    ensureNav();ensureView();setHeader();hideAllViews();
    refs.root.classList.add('on');if(refs.nav)refs.nav.classList.add('act');
    if(!state.loaded){if(typeof showLoader==='function')showLoader('Cargando clausulado...');await reload();if(typeof hideLoader==='function')hideLoader();}
    renderList();
    if(!state.currentKey)state.currentKey='c1';
    renderEditor();
  }

  function renderList(){
    if(!refs.list)return;
    clear(refs.list);
    CLAUSE_ORDER.forEach(function(k){
      var btn=make('button','','');
      btn.type='button';
      btn.textContent=CLAUSE_TITLES[k];
      btn.style.textAlign='left';btn.style.padding='9px 12px';btn.style.borderRadius='8px';btn.style.border='1px solid transparent';
      btn.style.background=(state.currentKey===k)?'var(--p50)':'transparent';
      btn.style.color=(state.currentKey===k)?'var(--p700)':'var(--g700)';
      btn.style.fontWeight=(state.currentKey===k)?'700':'500';
      btn.style.fontSize='12.5px';btn.style.cursor='pointer';
      btn.addEventListener('click',function(){state.currentKey=k;renderList();renderEditor();});
      refs.list.appendChild(btn);
    });
  }

  function renderEditor(){
    if(!refs.editor)return;
    clear(refs.editor);
    var key=state.currentKey;
    var clause=state.data.clauses[key];
    if(!clause){refs.editor.appendChild(make('div','empty','Cláusula no encontrada.'));return;}
    refs.verInfo.textContent='Versión '+state.data.version+' · Última edición: '+(state.data.updatedAt?new Date(state.data.updatedAt).toLocaleString('es-AR'):'—')+' por '+(state.data.updatedBy||'—');
    var title=make('div','');title.style.fontWeight='800';title.style.fontSize='15px';title.style.marginBottom='12px';title.textContent=CLAUSE_TITLES[key];
    refs.editor.appendChild(title);
    (clause.blocks||[]).forEach(function(b,i){
      var row=make('div','');row.style.border='1px solid var(--g200)';row.style.borderRadius='8px';row.style.padding='10px 12px';row.style.marginBottom='8px';row.style.background='var(--g50)';
      var top=make('div','');top.style.display='flex';top.style.alignItems='center';top.style.gap='8px';top.style.marginBottom='6px';
      var typeSel=make('select','');['title','subtitle','p','item'].forEach(function(t){var o=make('option','',BLOCK_TYPE_LABEL[t]);o.value=t;if(b.type===t)o.selected=true;typeSel.appendChild(o);});
      typeSel.style.fontSize='11px';typeSel.style.padding='3px 6px';typeSel.style.color=BLOCK_TYPE_COLOR[b.type]||'#333';typeSel.style.fontWeight='700';
      typeSel.addEventListener('change',function(){b.type=typeSel.value;state.dirty=true;});
      top.appendChild(typeSel);
      var showIfLbl=showIfLabel(b.showIf);
      if(showIfLbl){var chip=make('span','','🔀 '+showIfLbl);chip.style.fontSize='10.5px';chip.style.color='var(--p700)';chip.style.background='var(--p50)';chip.style.padding='2px 8px';chip.style.borderRadius='999px';top.appendChild(chip);}
      var delBtn=make('button','btn btn-s btn-sm','✕');delBtn.type='button';delBtn.style.marginLeft='auto';delBtn.style.padding='2px 8px';
      delBtn.addEventListener('click',function(){clause.blocks.splice(i,1);state.dirty=true;renderEditor();});
      top.appendChild(delBtn);
      row.appendChild(top);
      var ta=make('textarea','');ta.value=b.text||'';ta.style.width='100%';ta.style.minHeight=(b.type==='title'||b.type==='subtitle')?'36px':'70px';ta.style.fontSize='12.5px';ta.style.fontFamily='inherit';ta.style.border='1px solid var(--g200)';ta.style.borderRadius='6px';ta.style.padding='6px 8px';
      ta.addEventListener('input',function(){b.text=ta.value;state.dirty=true;});
      row.appendChild(ta);
      refs.editor.appendChild(row);
    });
    var addBtn=make('button','btn btn-s btn-sm','➕ Agregar bloque');addBtn.type='button';addBtn.style.marginBottom='16px';
    addBtn.addEventListener('click',function(){clause.blocks.push({type:'p',text:''});state.dirty=true;renderEditor();});
    refs.editor.appendChild(addBtn);
    var saveBtn=make('button','btn btn-p','💾 Guardar cambios de esta cláusula');saveBtn.type='button';
    saveBtn.addEventListener('click',function(){saveClause(key);});
    refs.editor.appendChild(document.createElement('br'));
    refs.editor.appendChild(saveBtn);
  }

  async function saveClause(key){
    if(typeof showLoader==='function')showLoader('Guardando cláusula...');
    try{
      var snapshot={version:state.data.version,updatedAt:state.data.updatedAt,updatedBy:state.data.updatedBy,clauses:JSON.parse(JSON.stringify(state.data.clauses))};
      state.data.history=state.data.history||[];
      state.data.history.unshift(snapshot);
      if(state.data.history.length>30)state.data.history.length=30;
      state.data.version=(state.data.version||1)+1;
      state.data.updatedAt=new Date().toISOString();
      state.data.updatedBy=nowUser();
      await persist();
      state.dirty=false;
      renderEditor();
      if(typeof toast==='function')toast('Cláusula "'+CLAUSE_TITLES[key]+'" guardada — versión '+state.data.version,'ok');
    }catch(err){
      console.error('[legales] saveClause',err);
      if(typeof toast==='function')toast('No se pudo guardar: '+err.message,'er');
    }finally{
      if(typeof hideLoader==='function')hideLoader();
    }
  }

  var _rawGo=null;
  function installGoHook(){
    if(typeof go!=='function')return;
    _rawGo=go;
    go=function(v){if(v==='legales'){showPage();return;}return _rawGo.apply(this,arguments);};
  }

  function boot(){ensureNav();ensureView();installGoHook();}
  document.addEventListener('DOMContentLoaded',function(){try{LegalesAdmin.boot();}catch(err){console.error('LegalesAdmin boot',err);}});

  // Usado por el generador de Word (11-word-gen.js) para leer el clausulado
  // vigente sin depender de que el usuario haya abierto la pantalla de Legales.
  async function getData(){
    if(!state.loaded)await reload();
    return state.data;
  }

  window.LegalesAdmin={boot:boot,show:showPage,reload:reload,getData:getData,CLAUSE_ORDER:CLAUSE_ORDER,CLAUSE_TITLES:CLAUSE_TITLES};
})();
