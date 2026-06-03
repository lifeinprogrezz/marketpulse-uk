/**
 * Translation strings for the cockpit. Every user-facing UI string in
 * the dashboard reads from here. Pattern: client components receive
 * `lang: Lang` and call `messagesFor(lang)` internally; server
 * components do the same.
 *
 * Data values (brand names, mechanic codes, customer labels, source
 * URLs) are NOT translated — they're data, not UI.
 */

export type Lang = 'en' | 'es';

const MONTH_NAMES_EN = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

const MONTH_NAMES_ES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
] as const;

const MONTH_NAMES_SHORT_EN = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
] as const;

const MONTH_NAMES_SHORT_ES = [
  'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
  'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic',
] as const;

/** Format a "YYYY-MM" string as a human month label in the active language. */
export function humanMonthIn(month: string, lang: Lang): string {
  if (!month) return '';
  const [year, m] = month.split('-');
  const idx = parseInt(m, 10) - 1;
  const names = lang === 'es' ? MONTH_NAMES_ES : MONTH_NAMES_EN;
  return `${names[idx] ?? m} ${year}`;
}

/** Compact axis label: "2025-03" → "Mar 25", "2025-03 W1" → "Mar 25". */
export function formatAxisMonth(label: string, lang: Lang): string {
  if (!label) return '';
  const [ym] = label.split(' ');
  const [year, m] = ym.split('-');
  const idx = parseInt(m, 10) - 1;
  const names = lang === 'es' ? MONTH_NAMES_SHORT_ES : MONTH_NAMES_SHORT_EN;
  const yy = year.slice(-2);
  return `${names[idx] ?? m} ${yy}`;
}

export type InputCredibility = 'strong' | 'weak' | 'noise' | 'untested';
export type InputOrigin = 'internal' | 'external';

export interface InputCard {
  /** Stable key — same across languages. */
  id: string;
  /** Display name in the active language. */
  name: string;
  /** Internal data vs external public source. */
  origin: InputOrigin;
  /** Whether the input is currently feeding the forecast. */
  wired: boolean;
  /** Color-coded judgment: strong / weak / noise / untested. */
  credibility: InputCredibility;
  /** Source label (e.g. "NASA POWER"). */
  source: string;
  /** Optional public URL for the source pill — clickable in the UI. */
  sourceUrl?: string;
  /** Long-form description shown when the card is expanded. Any ρ / R² numbers live here. */
  description: string;
}

interface Messages {
  header: {
    tagline: string;
    dataThrough: (month: string) => string;
    showVolumesIn: string;
    showLanguageIn: string;
  };
  unitToggle: {
    hectoliters: string;
    liters: string;
  };
  langToggle: {
    english: string;
    spanish: string;
  };
  granularityToggle: {
    monthly: string;
    weekly: string;
  };
  tabs: {
    forecast: string;
    playbook: string;
  };
  kpi: {
    yourBudget: (month: string) => string;
    forecastFor: (month: string) => string;
    vsYourBudget: string;
    edit: string;
    save: string;
    cancel: string;
    reset: string;
    setTargetCta: string;
    defaultCaption: string;
    overriddenCaption: string;
    resetLink: string;
  };
  chart: {
    title: (unit: string) => string;
    legendActual: (period: string) => string;
    legendProjection: string;
    legendSameLastYear: string;
    periodMonths: string;
    periodWeeks: string;
    seriesActual: string;
    seriesProjection: string;
    seriesConfidence: string;
    seriesSameLastYear: string;
    tempInputs: string;
    tempBeta: (beta: string) => string;
    tempBasis: (r2: string, months: number) => string;
    tempAnomalyNote: string;
  };
  matrix: {
    title: string;
    tabChannel: string;
    tabBrand: string;
    tabTopCustomers: string;
    xAxisLabel: string;
    yAxisLabel: string;
    quadrantWinning: string;
    quadrantMarginDefence: string;
    quadrantVolumePush: string;
    quadrantUnderperforming: string;
    tooltipVolumeChange: string;
    tooltipMarginChange: string;
    tooltipShare: string;
    summaryAllGained: (n: number, top: string) => string;
    summaryAllLost: (n: number, worst: string) => string;
    summaryMixed: (winning: number, total: number, worst: string) => string;
    summaryEmpty: string;
  };
  simulator: {
    title: string;
    subtitle: string;
    brandLabel: string;
    brandPlaceholder: string;
    scenarioPickerLabel: string;
    chipPromoCount: (n: number) => string;
    outputAddTitle: string;
    outputCutTitle: string;
    outputVolumeChange: string;
    outputMarginChange: string;
    outputNewForecast: string;
    interpretAddCostsMargin: (vol: string, margin: string) => string;
    interpretAddGainsBoth: (vol: string, margin: string) => string;
    interpretSkipSavesMargin: (vol: string, margin: string) => string;
    interpretSkipCostsBoth: (vol: string, margin: string) => string;
    confidenceHigh: (n: number) => string;
    confidenceMedium: (n: number) => string;
    confidenceLow: (n: number) => string;
    confidenceNone: string;
    lowConfidenceBanner: (n: number) => string;
    handoffButton: string;
    handoffPromptTemplate: (args: {
      brand: string;
      mechanic: string;
      depthPct: string;
      addVolHl: string;
      addMarginGbp: string;
      cutVolHl: string;
      cutMarginGbp: string;
      n: number;
      confidenceTier: 'low' | 'medium' | 'high';
    }) => string;
  };
  modelInputs: {
    title: string;
    wiredColumnTitle: string;
    notWiredColumnTitle: string;
    badgeInternal: string;
    badgeExternal: string;
    credibilityStrong: string;
    credibilityWeak: string;
    credibilityNoise: string;
    credibilityUntested: string;
    sourceLabel: string;
    liveLabel: string;
    bedfordShiftNote: (args: {
      anomalyC: string;
      basisMonths: number;
      betaHlPerC: string;
      perMonthShiftHl: string;
    }) => string;
    cards: readonly InputCard[];
  };
  ai: {
    name: string;
    poweredBy: string;
    subtitle: string;
    newChat: string;
    askPlaceholder: string;
    sending: string;
    send: string;
    errorHeading: string;
    dismissError: string;
    rolePillUser: string;
    rolePillAssistant: string;
  };
  upload: {
    button: string;
    demoTooltip: string;
  };
}

const CARDS_EN: readonly InputCard[] = [
  // WIRED
  {
    id: 'monthly_sales',
    name: 'Monthly sales',
    origin: 'internal',
    wired: true,
    credibility: 'strong',
    source: 'Damm UK workbook',
    description:
      'Closed monthly volumes, gross margin, and marketing fund per brand × channel × customer. This is the foundation of the forecast.',
  },
  {
    id: 'promo_plan',
    name: 'Promotion plan',
    origin: 'internal',
    wired: true,
    credibility: 'strong',
    source: 'Damm UK workbook',
    description:
      "Trade-plan workbook with depth %, mechanic, and date window per planned promotion. Feeds the simulator's historical lift coefficients.",
  },
  {
    id: 'bedford_temp',
    name: 'Bedford mean temperature',
    origin: 'external',
    wired: true,
    credibility: 'weak',
    source: 'NASA POWER',
    sourceUrl: 'https://power.larc.nasa.gov/',
    description:
      'Monthly mean temperature for Bedford as a proxy for UK climate. Wired in as a deviation-from-seasonal-norm regressor — the correlation is very weak (ρ ≈ +0.03), so it nudges rather than drives the forecast.',
  },
  // NOT WIRED — tested, weak signal
  {
    id: 'warm_days',
    name: 'Bedford · days ≥ 20°C',
    origin: 'external',
    wired: false,
    credibility: 'weak',
    source: 'NASA POWER',
    sourceUrl: 'https://power.larc.nasa.gov/',
    description:
      'Count of warm days per month. Correlates with sales (ρ = +0.320) but collinear with mean temperature — we use the cleaner signal instead.',
  },
  {
    id: 'month_cos',
    name: 'Month-of-year cosine',
    origin: 'external',
    wired: false,
    credibility: 'weak',
    source: 'derived',
    description:
      'Cosine of month index, encoding seasonal periodicity. Strong raw correlation (ρ = -0.581) but redundant — the YoY baseline already captures this shape.',
  },
  // NOT WIRED — tested, noise
  {
    id: 'easter_flag',
    name: 'Easter month flag',
    origin: 'external',
    wired: false,
    credibility: 'noise',
    source: 'gov.uk/bank-holidays.json',
    sourceUrl: 'https://www.gov.uk/bank-holidays.json',
    description:
      'Binary indicator of Easter falling in a month. The correlation is small (ρ = +0.129) — not strong enough to wire in as a separate signal.',
  },
  {
    id: 'bank_holidays',
    name: 'UK bank holidays / month',
    origin: 'external',
    wired: false,
    credibility: 'noise',
    source: 'gov.uk/bank-holidays.json',
    sourceUrl: 'https://www.gov.uk/bank-holidays.json',
    description:
      'Tested as a calendar regressor. The YoY baseline already absorbs the structural year shape (ρ ≈ 0), so this adds nothing on top.',
  },
  // NOT WIRED — untested candidates
  {
    id: 'gbp_eur',
    name: 'GBP / EUR exchange rate',
    origin: 'external',
    wired: false,
    credibility: 'untested',
    source: 'ECB SDMX API',
    sourceUrl: 'https://data.ecb.europa.eu/',
    description:
      'Damm UK is a Spanish-owned brewer; FX moves wholesale pricing power and import costs. Would be a leading indicator for margin compression.',
  },
  {
    id: 'ons_retail',
    name: 'ONS UK retail sales index',
    origin: 'external',
    wired: false,
    credibility: 'untested',
    source: 'ONS API',
    sourceUrl: 'https://www.ons.gov.uk/',
    description:
      'Macro retail health. Separates a soft UK month (industry-wide) from a soft Damm month (brand-specific).',
  },
  {
    id: 'gfk_confidence',
    name: 'UK consumer confidence (GfK)',
    origin: 'external',
    wired: false,
    credibility: 'untested',
    source: 'GfK monthly survey',
    sourceUrl: 'https://www.gfk.com/',
    description:
      'Discretionary-spend driver. Alcohol is sensitive to confidence shifts; would help anticipate softness before it shows in retail data.',
  },
  {
    id: 'premier_league',
    name: 'Premier League fixture density',
    origin: 'external',
    wired: false,
    credibility: 'untested',
    source: 'football-data.org',
    sourceUrl: 'https://www.football-data.org/',
    description:
      'On-trade demand spikes around big match weeks and home internationals. Per-month fixture count would proxy that effect.',
  },
  {
    id: 'google_trends',
    name: 'Google Trends — beer / BBQ / pub',
    origin: 'external',
    wired: false,
    credibility: 'untested',
    source: 'pytrends',
    sourceUrl: 'https://trends.google.com/',
    description:
      'Search-interest signal that typically leads sales by 2–4 weeks. Cheap to integrate via pytrends.',
  },
];

const CARDS_ES: readonly InputCard[] = [
  // WIRED
  {
    id: 'monthly_sales',
    name: 'Ventas mensuales',
    origin: 'internal',
    wired: true,
    credibility: 'strong',
    source: 'Libro Damm UK',
    description:
      'Volúmenes mensuales cerrados, margen bruto y fondo de marketing por marca × canal × cliente. Es la base de la previsión.',
  },
  {
    id: 'promo_plan',
    name: 'Plan promocional',
    origin: 'internal',
    wired: true,
    credibility: 'strong',
    source: 'Libro Damm UK',
    description:
      'Libro de trade plan con profundidad %, mecánica y ventana de fechas por promoción. Alimenta los coeficientes de lift históricos del simulador.',
  },
  {
    id: 'bedford_temp',
    name: 'Temperatura media en Bedford',
    origin: 'external',
    wired: true,
    credibility: 'weak',
    source: 'NASA POWER',
    sourceUrl: 'https://power.larc.nasa.gov/',
    description:
      'Temperatura media mensual en Bedford como proxy del clima UK. Cableada como regresor de desviación sobre la norma estacional — la correlación es muy débil (ρ ≈ +0.03), así que sólo empuja ligeramente la previsión.',
  },
  // NOT WIRED — tested, weak signal
  {
    id: 'warm_days',
    name: 'Bedford · días ≥ 20°C',
    origin: 'external',
    wired: false,
    credibility: 'weak',
    source: 'NASA POWER',
    sourceUrl: 'https://power.larc.nasa.gov/',
    description:
      'Recuento mensual de días cálidos. Correlaciona con ventas (ρ = +0.320) pero es colineal con la temperatura media — usamos la señal más limpia.',
  },
  {
    id: 'month_cos',
    name: 'Coseno del mes del año',
    origin: 'external',
    wired: false,
    credibility: 'weak',
    source: 'derivado',
    description:
      'Coseno del índice de mes, codifica la periodicidad estacional. Fuerte correlación bruta (ρ = -0.581) pero redundante — la base interanual ya captura esa forma.',
  },
  // NOT WIRED — tested, noise
  {
    id: 'easter_flag',
    name: 'Indicador de mes de Semana Santa',
    origin: 'external',
    wired: false,
    credibility: 'noise',
    source: 'gov.uk/bank-holidays.json',
    sourceUrl: 'https://www.gov.uk/bank-holidays.json',
    description:
      'Indicador binario de que Semana Santa cae en un mes. La correlación es pequeña (ρ = +0.129) — no es lo bastante fuerte para cablearla.',
  },
  {
    id: 'bank_holidays',
    name: 'Festivos UK / mes',
    origin: 'external',
    wired: false,
    credibility: 'noise',
    source: 'gov.uk/bank-holidays.json',
    sourceUrl: 'https://www.gov.uk/bank-holidays.json',
    description:
      'Probado como regresor de calendario. La base interanual ya absorbe la forma estructural del año (ρ ≈ 0), así que no añade nada.',
  },
  // NOT WIRED — untested candidates
  {
    id: 'gbp_eur',
    name: 'Tipo de cambio GBP / EUR',
    origin: 'external',
    wired: false,
    credibility: 'untested',
    source: 'ECB SDMX API',
    sourceUrl: 'https://data.ecb.europa.eu/',
    description:
      'Damm UK es una cervecera de capital español; el tipo de cambio afecta al poder de precio mayorista y al coste de importación. Sería un indicador adelantado de compresión de margen.',
  },
  {
    id: 'ons_retail',
    name: 'Índice de ventas minoristas ONS UK',
    origin: 'external',
    wired: false,
    credibility: 'untested',
    source: 'ONS API',
    sourceUrl: 'https://www.ons.gov.uk/',
    description:
      'Salud minorista macro. Separa un mes flojo del UK (general) de un mes flojo de Damm (específico de marca).',
  },
  {
    id: 'gfk_confidence',
    name: 'Confianza del consumidor UK (GfK)',
    origin: 'external',
    wired: false,
    credibility: 'untested',
    source: 'Encuesta mensual GfK',
    sourceUrl: 'https://www.gfk.com/',
    description:
      'Driver de gasto discrecional. El alcohol es sensible a cambios de confianza; ayudaría a anticipar caídas antes de que aparezcan en datos minoristas.',
  },
  {
    id: 'premier_league',
    name: 'Densidad de partidos Premier League',
    origin: 'external',
    wired: false,
    credibility: 'untested',
    source: 'football-data.org',
    sourceUrl: 'https://www.football-data.org/',
    description:
      'La demanda en hostelería se dispara en semanas de grandes partidos y de selecciones en casa. El conteo mensual de partidos lo aproxima.',
  },
  {
    id: 'google_trends',
    name: 'Google Trends — beer / BBQ / pub',
    origin: 'external',
    wired: false,
    credibility: 'untested',
    source: 'pytrends',
    sourceUrl: 'https://trends.google.com/',
    description:
      'Señal de interés de búsqueda que suele anticipar ventas en 2–4 semanas. Económica de integrar vía pytrends.',
  },
];

export const MESSAGES_EN: Messages = {
  header: {
    tagline:
      'Will UK close above budget next month — and if not, what should we change?',
    dataThrough: (month) => `Data through ${month}`,
    showVolumesIn: 'Show volumes in:',
    showLanguageIn: 'Language:',
  },
  unitToggle: {
    hectoliters: 'Hectoliters (Hl)',
    liters: 'Liters (L)',
  },
  langToggle: {
    english: 'English',
    spanish: 'Español',
  },
  granularityToggle: {
    monthly: 'Monthly',
    weekly: 'Weekly',
  },
  tabs: {
    forecast: 'Forecast',
    playbook: 'Playbook',
  },
  kpi: {
    yourBudget: (month) => `Your estimated sales · ${month}`,
    forecastFor: (month) => `Forecasted sales · ${month}`,
    vsYourBudget: 'vs your sales target',
    edit: '✎ Edit',
    save: 'Save',
    cancel: 'Cancel',
    reset: 'Reset',
    setTargetCta: '+ Enter your target',
    defaultCaption:
      'Enter your sales target to compare it against the forecast.',
    overriddenCaption: 'Your target.',
    resetLink: 'Clear',
  },
  chart: {
    title: () => `Where are we headed?`,
    legendActual: (period) => `last 12 ${period}`,
    legendProjection: 'next 3 months from the forecast engine',
    legendSameLastYear: 'reference line',
    periodMonths: 'months',
    periodWeeks: 'weeks',
    seriesActual: 'Actual',
    seriesProjection: 'Projection',
    seriesConfidence: 'Confidence band',
    seriesSameLastYear: 'Same period last year',
    tempInputs: 'Inputs ·',
    tempBeta: (beta) => `Bedford temperature regressor: β = ${beta} above the seasonal norm`,
    tempBasis: (r2, months) => `(R² = ${r2}, fit on ${months} months).`,
    tempAnomalyNote: 'The projection assumes zero anomaly by default.',
  },
  matrix: {
    title: 'What moved and where',
    tabChannel: 'By channel',
    tabBrand: 'By brand',
    tabTopCustomers: 'By customer',
    xAxisLabel: 'Volume vs last year',
    yAxisLabel: 'Margin vs last year',
    quadrantWinning: 'Winning both',
    quadrantMarginDefence: 'Margin defence',
    quadrantVolumePush: 'Volume push',
    quadrantUnderperforming: 'Underperforming',
    tooltipVolumeChange: 'Volume Δ',
    tooltipMarginChange: 'Margin Δ',
    tooltipShare: 'Share of last month',
    summaryAllGained: (n, top) =>
      `All ${n} grew vs same month last year — top performer ${top}.`,
    summaryAllLost: (n, worst) =>
      `All ${n} declined vs same month last year — biggest hit ${worst}.`,
    summaryMixed: (winning, total, worst) =>
      `${winning} of ${total} gained both volume and margin vs same month last year — biggest drag ${worst}.`,
    summaryEmpty:
      'Not enough prior-year data to compute changes for this dimension.',
  },
  simulator: {
    title: 'Simulator',
    subtitle:
      "What if our promo activity on this brand differs from typical? Pick a brand and a past promotion scenario to see the volume/margin trade-off and where it leaves next month's forecast. Brand-level only.",
    brandLabel: 'Brand',
    brandPlaceholder: 'Pick a brand',
    scenarioPickerLabel: 'Past promotion scenarios',
    chipPromoCount: (n) => `${n} ${n === 1 ? 'promo' : 'promos'}`,
    outputAddTitle: 'Adding this promo',
    outputCutTitle: 'Skipping this promo',
    outputVolumeChange: 'Volume change',
    outputMarginChange: 'Margin change',
    outputNewForecast: 'Forecast with this change',
    interpretAddCostsMargin: (vol, margin) =>
      `You'd gain ${vol} in volume, but it costs ${margin} in margin.`,
    interpretAddGainsBoth: (vol, margin) =>
      `You'd gain ${vol} in volume AND ${margin} in margin — clear win.`,
    interpretSkipSavesMargin: (vol, margin) =>
      `You'd save ${margin} in margin, but lose ${vol} in volume.`,
    interpretSkipCostsBoth: (vol, margin) =>
      `You'd lose ${vol} in volume AND ${margin} in margin — skipping hurts twice.`,
    confidenceHigh: (n) => `based on ${n} past promotions · high confidence`,
    confidenceMedium: (n) => `based on ${n} past promotions · medium confidence`,
    confidenceLow: (n) =>
      `based on ${n} past promotion${n === 1 ? '' : 's'} · low confidence`,
    confidenceNone: 'no historical promotions',
    lowConfidenceBanner: (n) =>
      `⚠ Based on only ${n} past promotion${n === 1 ? '' : 's'} — read as directional only.`,
    handoffButton: 'Ask the analyst about this scenario',
    handoffPromptTemplate: ({ brand, mechanic, depthPct, addVolHl, addMarginGbp, cutVolHl, cutMarginGbp, n, confidenceTier }) =>
      `I'm considering a **${mechanic}** promotion at **${depthPct}% off** on **${brand}** next month.

Historical evidence for this combination (${n} past promotion${n === 1 ? '' : 's'} · ${confidenceTier} confidence):

Adding this promo:
- Volume change: ${addVolHl}
- Margin change: ${addMarginGbp}

Skipping this promo:
- Volume change: ${cutVolHl}
- Margin change: ${cutMarginGbp}

Pull the relevant internal context before answering — last closed month, the gap to next-month budget, and which channels and brands are driving it (use get_last_closed_month_summary, compare_yoy, get_decomposition).

Then tell me: should I run this promotion next month? Structure the answer around the four levers — brand, channel, promotion, commercial effort — and be specific about which to prioritise given what the numbers show.`,
  },
  modelInputs: {
    title: 'Inputs we use to forecast sales',
    wiredColumnTitle: 'Wired into the forecast',
    notWiredColumnTitle: 'Not wired',
    badgeInternal: 'Internal',
    badgeExternal: 'External',
    credibilityStrong: 'Strong',
    credibilityWeak: 'Weak',
    credibilityNoise: 'Noise',
    credibilityUntested: 'Untested',
    sourceLabel: 'Source',
    liveLabel: 'Live impact on the forecast',
    bedfordShiftNote: ({
      anomalyC,
      basisMonths,
      betaHlPerC,
      perMonthShiftHl,
    }) =>
      `The last ${basisMonths} months have been ${anomalyC}°C vs the seasonal norm in Bedford. Carrying that anomaly forward and applying β = ${betaHlPerC} Hl/°C shifts each projected month by ${perMonthShiftHl} Hl.`,
    cards: CARDS_EN,
  },
  ai: {
    name: 'AI Analyst',
    poweredBy: 'powered by Cala',
    subtitle: 'Ask anything about your data and the market around it.',
    newChat: 'New chat',
    askPlaceholder: 'Ask the analyst…',
    sending: 'Thinking…',
    send: 'Send',
    errorHeading: "The analyst couldn't answer.",
    dismissError: 'Dismiss error',
    rolePillUser: 'You',
    rolePillAssistant: 'Analyst',
  },
  upload: {
    button: 'Upload files',
    demoTooltip: 'Demo only — upload pipeline coming next iteration',
  },
};

export const MESSAGES_ES: Messages = {
  header: {
    tagline:
      '¿Cerrará UK por encima del presupuesto el próximo mes — y si no, qué deberíamos cambiar?',
    dataThrough: (month) => `Datos hasta ${month}`,
    showVolumesIn: 'Mostrar volúmenes en:',
    showLanguageIn: 'Idioma:',
  },
  unitToggle: {
    hectoliters: 'Hectolitros (Hl)',
    liters: 'Litros (L)',
  },
  langToggle: {
    english: 'English',
    spanish: 'Español',
  },
  granularityToggle: {
    monthly: 'Mensual',
    weekly: 'Semanal',
  },
  tabs: {
    forecast: 'Previsión',
    playbook: 'Tácticas',
  },
  kpi: {
    yourBudget: (month) => `Tus ventas estimadas · ${month}`,
    forecastFor: (month) => `Ventas previstas · ${month}`,
    vsYourBudget: 'vs tu objetivo de ventas',
    edit: '✎ Editar',
    save: 'Guardar',
    cancel: 'Cancelar',
    reset: 'Restablecer',
    setTargetCta: '+ Introduce tu objetivo',
    defaultCaption:
      'Introduce tu objetivo de ventas para compararlo con la previsión.',
    overriddenCaption: 'Tu objetivo.',
    resetLink: 'Borrar',
  },
  chart: {
    title: () => `¿Hacia dónde vamos?`,
    legendActual: (period) => `últimos 12 ${period}`,
    legendProjection: 'próximos 3 meses del motor de previsión',
    legendSameLastYear: 'línea de referencia',
    periodMonths: 'meses',
    periodWeeks: 'semanas',
    seriesActual: 'Real',
    seriesProjection: 'Previsión',
    seriesConfidence: 'Banda de confianza',
    seriesSameLastYear: 'Mismo periodo del año anterior',
    tempInputs: 'Entradas ·',
    tempBeta: (beta) => `Regresor de temperatura en Bedford: β = ${beta} sobre la norma estacional`,
    tempBasis: (r2, months) => `(R² = ${r2}, ajustado sobre ${months} meses).`,
    tempAnomalyNote: 'La previsión asume anomalía cero por defecto.',
  },
  matrix: {
    title: 'Qué se movió y dónde',
    tabChannel: 'Por canal',
    tabBrand: 'Por marca',
    tabTopCustomers: 'Por cliente',
    xAxisLabel: 'Volumen vs año anterior',
    yAxisLabel: 'Margen vs año anterior',
    quadrantWinning: 'Ganando en ambos',
    quadrantMarginDefence: 'Defendiendo margen',
    quadrantVolumePush: 'Empuje de volumen',
    quadrantUnderperforming: 'Bajando',
    tooltipVolumeChange: 'Δ volumen',
    tooltipMarginChange: 'Δ margen',
    tooltipShare: 'Cuota del mes pasado',
    summaryAllGained: (n, top) =>
      `Los ${n} crecieron vs el mismo mes del año anterior — destaca ${top}.`,
    summaryAllLost: (n, worst) =>
      `Los ${n} cayeron vs el mismo mes del año anterior — el peor ${worst}.`,
    summaryMixed: (winning, total, worst) =>
      `${winning} de ${total} crecieron en volumen y margen vs el mismo mes del año anterior — la mayor caída ${worst}.`,
    summaryEmpty:
      'No hay suficientes datos del año anterior para calcular variaciones en esta dimensión.',
  },
  simulator: {
    title: 'Simulador',
    subtitle:
      '¿Y si nuestra actividad promocional en esta marca difiere de lo habitual? Elige una marca y un escenario promocional pasado para ver el trade-off volumen/margen y dónde queda la previsión del próximo mes. Solo a nivel de marca.',
    brandLabel: 'Marca',
    brandPlaceholder: 'Elige una marca',
    scenarioPickerLabel: 'Escenarios promocionales pasados',
    chipPromoCount: (n) => `${n} ${n === 1 ? 'promo' : 'promos'}`,
    outputAddTitle: 'Añadiendo esta promoción',
    outputCutTitle: 'Saltando esta promoción',
    outputVolumeChange: 'Cambio en volumen',
    outputMarginChange: 'Cambio en margen',
    outputNewForecast: 'Previsión con este cambio',
    interpretAddCostsMargin: (vol, margin) =>
      `Ganarías ${vol} en volumen, pero te cuesta ${margin} en margen.`,
    interpretAddGainsBoth: (vol, margin) =>
      `Ganarías ${vol} en volumen Y ${margin} en margen — claro ganador.`,
    interpretSkipSavesMargin: (vol, margin) =>
      `Ahorrarías ${margin} en margen, pero pierdes ${vol} en volumen.`,
    interpretSkipCostsBoth: (vol, margin) =>
      `Perderías ${vol} en volumen Y ${margin} en margen — saltarla duele doble.`,
    confidenceHigh: (n) => `basado en ${n} promociones pasadas · confianza alta`,
    confidenceMedium: (n) => `basado en ${n} promociones pasadas · confianza media`,
    confidenceLow: (n) =>
      `basado en ${n} promoción${n === 1 ? '' : 'es'} pasada${n === 1 ? '' : 's'} · confianza baja`,
    confidenceNone: 'sin promociones históricas',
    lowConfidenceBanner: (n) =>
      `⚠ Basado en sólo ${n} promoción${n === 1 ? '' : 'es'} pasada${n === 1 ? '' : 's'} — interpretar como direccional.`,
    handoffButton: 'Pregunta al analista sobre este escenario',
    handoffPromptTemplate: ({ brand, mechanic, depthPct, addVolHl, addMarginGbp, cutVolHl, cutMarginGbp, n, confidenceTier }) =>
      `Estoy considerando una promoción **${mechanic}** al **${depthPct}% de descuento** sobre **${brand}** el próximo mes.

Evidencia histórica para esta combinación (${n} promoción${n === 1 ? '' : 'es'} pasada${n === 1 ? '' : 's'} · confianza ${confidenceTier === 'low' ? 'baja' : confidenceTier === 'medium' ? 'media' : 'alta'}):

Añadiendo esta promoción:
- Cambio en volumen: ${addVolHl}
- Cambio en margen: ${addMarginGbp}

Saltando esta promoción:
- Cambio en volumen: ${cutVolHl}
- Cambio en margen: ${cutMarginGbp}

Antes de responder, consulta el contexto interno relevante — último mes cerrado, gap respecto al presupuesto del próximo mes, y qué canales y marcas lo están moviendo (usa get_last_closed_month_summary, compare_yoy, get_decomposition).

Después dime: ¿debería lanzar esta promoción el próximo mes? Estructura la respuesta en torno a las cuatro palancas — marca, canal, promoción, esfuerzo comercial — y sé específico sobre cuál priorizar según los datos.`,
  },
  modelInputs: {
    title: 'Entradas que usamos para prever las ventas',
    wiredColumnTitle: 'Cableado en la previsión',
    notWiredColumnTitle: 'No cableado',
    badgeInternal: 'Interna',
    badgeExternal: 'Externa',
    credibilityStrong: 'Fuerte',
    credibilityWeak: 'Débil',
    credibilityNoise: 'Ruido',
    credibilityUntested: 'Sin probar',
    sourceLabel: 'Fuente',
    liveLabel: 'Impacto actual en la previsión',
    bedfordShiftNote: ({
      anomalyC,
      basisMonths,
      betaHlPerC,
      perMonthShiftHl,
    }) =>
      `Los últimos ${basisMonths} meses han estado a ${anomalyC}°C respecto a la norma estacional en Bedford. Manteniendo esa anomalía hacia delante y aplicando β = ${betaHlPerC} Hl/°C, cada mes proyectado se desplaza ${perMonthShiftHl} Hl.`,
    cards: CARDS_ES,
  },
  ai: {
    name: 'Analista IA',
    poweredBy: 'potenciado por Cala',
    subtitle: 'Pregunta cualquier cosa sobre tus datos y el mercado alrededor.',
    newChat: 'Nuevo chat',
    askPlaceholder: 'Pregunta al analista…',
    sending: 'Pensando…',
    send: 'Enviar',
    errorHeading: 'El analista no pudo responder.',
    dismissError: 'Cerrar error',
    rolePillUser: 'Tú',
    rolePillAssistant: 'Analista',
  },
  upload: {
    button: 'Subir archivos',
    demoTooltip: 'Solo demo — pipeline de carga en la próxima iteración',
  },
};

export function messagesFor(lang: Lang): Messages {
  return lang === 'es' ? MESSAGES_ES : MESSAGES_EN;
}
