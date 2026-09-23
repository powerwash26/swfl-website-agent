// Real rate tables from Service Menus v1.3 (Commercial PW), v1.4 (Cleaning), v2.1 (STR), v1.3 (Residential PW)
const RATES = {
  residentialCleaning: {
    minimum: 180,
    standard:  [[0,1000,180,210],[1001,1500,220,260],[1501,2000,260,320],[2001,2500,320,400],[2501,3000,400,480]],
    deep:      [[0,1000,260,320],[1001,1500,320,420],[1501,2000,390,540],[2001,2500,490,690],[2501,3000,600,830]],
    moveInOut: [[0,1000,340,470],[1001,1500,420,580],[1501,2000,520,720],[2001,2500,640,880],[2501,3000,780,1080]],
    postConstruction: { rateLow: 0.30, rateHigh: 0.60, minimum: 450 },
    recurringDiscount: { weekly: 0.15, biweekly: 0.08, monthly: 0.05 },
    overSqftLimit: 3000
  },
  commercialCleaning: {
    minimum: 250,
    table: [
      [0,1000, 250,250, 250,250, 250,250, 250,250],
      [1001,2000, 250,320, 250,300, 250,280, 250,250],
      [2001,3000, 280,450, 250,420, 250,400, 250,360]
    ],
    initialResetRateLow: 0.18, initialResetRateHigh: 0.35,
    overSqftLimit: 3000
  },
  strTurnover: {
    standard: [[0,800,145],[801,1200,175],[1201,1600,205],[1601,2000,235],[2001,2400,270],[2401,2800,315],[2801,3200,360]],
    enhanced: [[0,800,175],[801,1200,210],[1201,1600,245],[1601,2000,285],[2001,2400,325],[2401,2800,375],[2801,3200,430]],
    deepResetMultiplier: 1.75, deepResetMinimum: 295,
    overSqftLimit: 3200,
    minMonthlyTurnovers: { singleProperty: 4, "2to4units": 8, "5plusUnits": 15 }
  },
  residentialPW: {
    minimum: 180,
    driveway: { "1car": 180, "2car": 180, "3car": 240 },
    patio: { small: 195, medium: 240, large: 360, overRateLow: 0.35, overRateHigh: 0.45, overSqftLimit: 1000 },
    houseWash: { "1story": 280, "2story": 420 },
    fencePerLinearFt: { oneSide: 2.25, bothSides: 3.75 },
    bundles: {
      basicCurb: 220,
      exteriorRefresh: 360,
      fullExteriorClean: { "1story": 520, "2story": 620 },
      completeProperty: { "1story": 680, "2story": 780 }
    },
    outOfScope: ["stucco", "eifs"]
  },
  commercialPW: {
    minimum: 300,
    csrDiscretionMin: 250,
    flatwork: { maintenance: 0.12, standard: 0.18, heavyLow: 0.28, heavyHigh: 0.35 },
    buildingExterior: { standard: 0.18, heavyLow: 0.30, heavyHigh: 0.40, internalAnchorOnly: true },
    restaurantGrease: { standardRate: 0.30, heavyLow: 0.40, heavyHigh: 0.55 },
    dumpsterPad: { standardLow: 100, standardHigh: 150, heavyLow: 180, heavyHigh: 300, oversizedRateLow: 0.75, oversizedRateHigh: 1.00 },
    recurringDiscount: { weekly: 0.15, biweekly: 0.10, monthlyLow: 0.05, monthlyHigh: 0.08 },
    afterHoursSurcharge: 0.25, rushSurcharge: 0.20
  }
};

function bracketLookup(brackets, sqft) {
  for (const b of brackets) {
    if (sqft >= b[0] && sqft <= b[1]) return b.length === 4 ? { low: b[2], high: b[3] } : { flat: b[2] };
  }
  return null;
}

const QUOTE_FN = {
  getResidentialCleaningQuote(input) {
    const r = RATES.residentialCleaning;
    const sqft = Number(input.sqft) || 0;
    if (sqft > r.overSqftLimit) return { requiresAssessment: true, reason: "Over 3,000 sq ft requires in-person assessment." };
    const tier = ['standard','deep','moveInOut'].includes(input.tier) ? input.tier : 'standard';
    const b = bracketLookup(r[tier], sqft);
    if (!b) return { error: "no bracket match" };
    return { tier, low: Math.max(b.low, r.minimum), high: b.high, minimum: r.minimum,
      note: tier === 'standard' ? "First-time service is typically Deep unless home is already maintained." : null };
  },
  getCommercialCleaningQuote(input) {
    const r = RATES.commercialCleaning;
    const sqft = Number(input.sqft) || 0;
    if (sqft > r.overSqftLimit) return { requiresAssessment: true, reason: "Over 3,000 sq ft requires separate assessment." };
    const idx = { weekly: 0, twice: 1, thrice: 2, five: 3 }[input.frequency] ?? 0;
    const row = r.table.find(row => sqft >= row[0] && sqft <= row[1]);
    if (!row) return { error: "no bracket match" };
    const low = row[2 + idx * 2], high = row[3 + idx * 2];
    return { low: Math.max(low, r.minimum), high, minimum: r.minimum,
      initialResetNote: `Add 50% to first visit, or quote separately at $${r.initialResetRateLow}-$${r.initialResetRateHigh}/sq ft.` };
  },
  getSTRQuote(input) {
    const r = RATES.strTurnover;
    const sqft = Number(input.sqft) || 0;
    if (sqft > r.overSqftLimit) return { requiresAssessment: true, reason: "Over 3,200 sq ft requires walkthrough/photo assessment." };
    const tier = ['standard','enhanced','deepReset'].includes(input.tier) ? input.tier : 'standard';
    if (tier === 'deepReset') {
      const base = bracketLookup(r.standard, sqft);
      if (!base) return { error: "no bracket match" };
      const flat = Math.max(Math.round(base.flat * r.deepResetMultiplier), r.deepResetMinimum);
      return { tier, flat, minimum: r.deepResetMinimum, note: "Deep Reset = 1.75x Standard rate; reclassification subject to management confirmation." };
    }
    const b = bracketLookup(r[tier], sqft);
    if (!b) return { error: "no bracket match" };
    return { tier, flat: b.flat };
  },
  getResidentialPWQuote(input) {
    const r = RATES.residentialPW;
    const service = input.service;
    if (service === 'driveway') {
      const size = ['1car','2car','3car'].includes(input.size) ? input.size : '2car';
      return { flat: r.driveway[size], minimum: r.minimum };
    }
    if (service === 'patio') {
      const sqft = Number(input.sqft) || 0;
      if (sqft > r.patio.overSqftLimit) return { onSiteQuote: true, rateLow: r.patio.overRateLow, rateHigh: r.patio.overRateHigh };
      const size = sqft <= 300 ? 'small' : sqft <= 600 ? 'medium' : 'large';
      return { flat: r.patio[size], minimum: r.minimum };
    }
    if (service === 'houseWash') {
      if ((input.exterior || '').toLowerCase().match(/stucco|eifs/)) return { outOfScope: true, reason: "Stucco/EIFS exteriors are outside current service scope." };
      const stories = input.stories === 2 ? '2story' : '1story';
      return { flat: r.houseWash[stories], minimum: r.minimum };
    }
    if (service === 'fence') {
      const ft = Number(input.linearFeet) || 0;
      const side = input.bothSides ? 'bothSides' : 'oneSide';
      return { flat: Math.max(Math.round(ft * r.fencePerLinearFt[side]), r.minimum), minimum: r.minimum };
    }
    if (service === 'bundle') {
      const name = input.bundleName;
      if (name === 'basicCurb') return { flat: r.bundles.basicCurb };
      if (name === 'exteriorRefresh') return { flat: r.bundles.exteriorRefresh };
      if (name === 'fullExteriorClean') return { flat: r.bundles.fullExteriorClean[input.stories === 2 ? '2story' : '1story'] };
      if (name === 'completeProperty') return { flat: r.bundles.completeProperty[input.stories === 2 ? '2story' : '1story'] };
    }
    return { error: "unrecognized service/size" };
  },
  getCommercialPWQuote(input) {
    const r = RATES.commercialPW;
    const service = input.service;
    const sqft = Number(input.sqft) || 0;
    const tier = input.tier || 'standard';
    if (service === 'flatwork') {
      const rate = tier === 'maintenance' ? r.flatwork.maintenance : tier === 'heavy' ? (r.flatwork.heavyLow + r.flatwork.heavyHigh) / 2 : r.flatwork.standard;
      return { total: Math.max(Math.round(sqft * rate), r.minimum), minimum: r.minimum, csrNote: "CSR may approve $250-300 at discretion for new recurring accounts." };
    }
    if (service === 'buildingExterior') {
      return { internalAnchorOnly: true, standardRate: r.buildingExterior.standard, heavyRateLow: r.buildingExterior.heavyLow, heavyRateHigh: r.buildingExterior.heavyHigh,
        note: "Do not quote a hard per-sqft number to the client without photos or a walkthrough.", minimum: r.minimum };
    }
    if (service === 'restaurant') {
      const rate = tier === 'heavy' ? (r.restaurantGrease.heavyLow + r.restaurantGrease.heavyHigh) / 2 : r.restaurantGrease.standardRate;
      return { total: Math.max(Math.round(sqft * rate), r.minimum), minimum: r.minimum, note: "Results not guaranteed on old/absorbed grease stains — advise client before booking." };
    }
    if (service === 'dumpsterPad') {
      if (input.oversized) return { rateLow: r.dumpsterPad.oversizedRateLow, rateHigh: r.dumpsterPad.oversizedRateHigh, minimum: r.minimum };
      return tier === 'heavy'
        ? { low: r.dumpsterPad.heavyLow, high: r.dumpsterPad.heavyHigh, minimum: r.minimum }
        : { low: r.dumpsterPad.standardLow, high: r.dumpsterPad.standardHigh, minimum: r.minimum };
    }
    return { error: "unrecognized service" };
  }
};

const REQUIRED_DOCS = {
  default: ["Service Agreement", "Water Usage Authorization (mandatory, all jobs)", "Pre-Existing Condition Form"],
  strTurnover: ["STR Turnover Service Agreement", "Water Usage Authorization (mandatory, all jobs)", "STR Turnover Checklist"],
  residentialPW: ["Service Agreement", "Water Usage Authorization (mandatory, all jobs)", "Pre-Existing Surface Condition Acknowledgment"],
  commercialPW: ["Service Agreement", "Water Usage Authorization (mandatory, all jobs)", "Pre-Existing Surface Condition Acknowledgment"]
};

const QUOTE_TOOLS = [
  { name: 'getResidentialCleaningQuote', description: 'Get a price range for residential cleaning.',
    input_schema: { type: 'object', properties: { sqft: { type: 'number' }, tier: { type: 'string', enum: ['standard','deep','moveInOut'] } }, required: ['sqft','tier'] } },
  { name: 'getCommercialCleaningQuote', description: 'Get a price range for commercial cleaning.',
    input_schema: { type: 'object', properties: { sqft: { type: 'number' }, frequency: { type: 'string', enum: ['weekly','twice','thrice','five'] } }, required: ['sqft','frequency'] } },
  { name: 'getSTRQuote', description: 'Get a flat rate for a short-term rental turnover.',
    input_schema: { type: 'object', properties: { sqft: { type: 'number' }, tier: { type: 'string', enum: ['standard','enhanced','deepReset'] } }, required: ['sqft','tier'] } },
  { name: 'getResidentialPWQuote', description: 'Get a price for a residential pressure washing service or bundle.',
    input_schema: { type: 'object', properties: { service: { type: 'string', enum: ['driveway','patio','houseWash','fence','bundle'] }, size: { type: 'string' }, sqft: { type: 'number' }, stories: { type: 'number' }, linearFeet: { type: 'number' }, bothSides: { type: 'boolean' }, bundleName: { type: 'string', enum: ['basicCurb','exteriorRefresh','fullExteriorClean','completeProperty'] }, exterior: { type: 'string' } }, required: ['service'] } },
  { name: 'getCommercialPWQuote', description: 'Get a price for a commercial pressure washing service.',
    input_schema: { type: 'object', properties: { service: { type: 'string', enum: ['flatwork','buildingExterior','restaurant','dumpsterPad'] }, sqft: { type: 'number' }, tier: { type: 'string', enum: ['maintenance','standard','heavy'] }, oversized: { type: 'boolean' } }, required: ['service'] } }
];

module.exports = { RATES, QUOTE_FN, REQUIRED_DOCS, QUOTE_TOOLS };
