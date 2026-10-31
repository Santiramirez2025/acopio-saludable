// Políticas de envío y devolución a nivel Organization (Google Search Central, Organization structured data,
// propiedades hasShippingService y hasMerchantReturnPolicy; doc actualizada el 8/9/2026).
// Tienen que decir lo mismo que /envios y /cambios-y-devoluciones. Reglas:
// - Argentina no admite región ni código postal en DefinedRegion (solo EE. UU., Australia, Japón / Canadá),
//   así que no se puede marcar «sin cargo en Carlos Paz» sin que Google lo lea como «sin cargo en todo el país».
//   Por eso NO va shippingRate: el costo depende de la zona y del correo y se calcula en el carrito.
// - Solo plazos que la web publica: preparación 24 a 48 h hábiles con corte a la hora de config,
//   y entrega de 0 a 7 días hábiles más (reparto propio sale dentro de la preparación; correo 2 a 7).

const DIAS_HABILES = ["https://schema.org/Monday", "https://schema.org/Tuesday", "https://schema.org/Wednesday", "https://schema.org/Thursday", "https://schema.org/Friday"];

export function politicasNegocio(urlBase: string, corteHora: number) {
  const hora = String(Math.min(23, Math.max(0, Math.round(corteHora)))).padStart(2, "0");
  return {
    hasShippingService: {
      "@type": "ShippingService",
      name: "Entrega propia en Villa Carlos Paz y sur de Punilla, y envíos por correo a todo el país",
      description: "Entrega propia en Villa Carlos Paz y el sur de Punilla; Córdoba capital con cargo; resto del país por correo con costo calculado en el carrito.",
      fulfillmentType: "https://schema.org/FulfillmentTypeDelivery",
      handlingTime: {
        "@type": "ServicePeriod",
        cutoffTime: `${hora}:00:00-03:00`,
        businessDays: DIAS_HABILES,
        duration: { "@type": "QuantitativeValue", minValue: 1, maxValue: 2, unitCode: "DAY" },
      },
      shippingConditions: {
        "@type": "ShippingConditions",
        shippingDestination: { "@type": "DefinedRegion", addressCountry: "AR" },
        transitTime: { "@type": "ServicePeriod", businessDays: DIAS_HABILES, duration: { "@type": "QuantitativeValue", minValue: 0, maxValue: 7, unitCode: "DAY" } },
      },
    },
    hasMerchantReturnPolicy: {
      "@type": "MerchantReturnPolicy",
      applicableCountry: "AR",
      returnPolicyCountry: "AR",
      returnPolicyCategory: "https://schema.org/MerchantReturnFiniteReturnWindow",
      merchantReturnDays: 10,
      returnMethod: "https://schema.org/ReturnByMail",
      returnFees: "https://schema.org/FreeReturn",
      refundType: "https://schema.org/FullRefund",
      itemCondition: "https://schema.org/NewCondition",
      merchantReturnLink: `${urlBase}/cambios-y-devoluciones`,
    },
  };
}
