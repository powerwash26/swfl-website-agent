const { QUOTE_FN } = require('../../pricing');

const DIVISION_FN = {
  residentialCleaning: QUOTE_FN.getResidentialCleaningQuote,
  commercialCleaning: QUOTE_FN.getCommercialCleaningQuote,
  strTurnover: QUOTE_FN.getSTRQuote,
  residentialPW: QUOTE_FN.getResidentialPWQuote,
  commercialPW: QUOTE_FN.getCommercialPWQuote
};

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method not allowed' };
  try {
    const { division, ...params } = JSON.parse(event.body || '{}');
    const fn = DIVISION_FN[division];
    if (!fn) return { statusCode: 400, body: JSON.stringify({ error: 'unknown_division' }) };

    const result = fn(params);
    return { statusCode: 200, body: JSON.stringify({ division, result }) };
  } catch (e) {
    console.error(e);
    return { statusCode: 500, body: JSON.stringify({ error: 'quote_failed' }) };
  }
};
