const Anthropic = require('@anthropic-ai/sdk');
const { QUOTE_FN, QUOTE_TOOLS } = require('../../pricing');

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `You are the intake and quoting agent for Southwest Florida Clean & Wash Solutions (SWFL), serving Fort Myers, Cape Coral, Bonita Springs, Estero, Lehigh Acres, Naples and surrounding Lee County FL.
Five divisions: residentialCleaning, commercialCleaning, strTurnover, residentialPW, commercialPW.
Standing business rules: $80 trip charge on every job. 1.5% per month late fee with 7-business-day grace period. $35 returned check fee. Water Usage Authorization is mandatory on every job. STR Turnover is always a complete reset, appliances included.
NEVER compute or guess a price yourself. Always call the matching quote tool (getResidentialCleaningQuote, getCommercialCleaningQuote, getSTRQuote, getResidentialPWQuote, getCommercialPWQuote) with the details the client gave you, and quote only the numbers the tool returns.
If a tool result has requiresAssessment, onSiteQuote, internalAnchorOnly or outOfScope set to true, do NOT give the client a firm number — explain a walkthrough/photos are needed (or, for outOfScope, that the surface type is outside current scope) exactly as the tool's reason/note says.
For residentialPW and commercialPW you must first ask which specific service (driveway, patio, house wash, fence, bundle / flatwork, building exterior, restaurant-grease, dumpster pad) before calling the tool — do not guess the service.
For residential cleaning, note first-time visits are typically Deep Clean tier unless the home is already well maintained. For residential PW, always offer the bundle packages before quoting individual services one at a time, per company policy.
Keep replies under 80 words, warm but efficient. Always state that final pricing is confirmed on-site per policy.
Once you have a firm flat price or low/high range from a tool (not one of the assessment/out-of-scope cases), end your reply with a line formatted exactly as: QUOTE_READY|divisionKey|low|high (for a flat price, repeat it as both low and high).`;

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method not allowed' };
  try {
    const { messages: history = [] } = JSON.parse(event.body || '{}');
    let messages = history.map(m => ({ role: m.role, content: m.content }));
    let finalText = '';

    for (let round = 0; round < 4; round++) {
      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 500,
        system: SYSTEM_PROMPT,
        tools: QUOTE_TOOLS,
        messages
      });

      const toolUses = response.content.filter(b => b.type === 'tool_use');
      const text = response.content.filter(b => b.type === 'text').map(b => b.text).join('\n');

      if (toolUses.length === 0) { finalText = text; break; }

      messages.push({ role: 'assistant', content: response.content });
      const toolResults = toolUses.map(tu => {
        const fn = QUOTE_FN[tu.name];
        const result = fn ? fn(tu.input) : { error: 'unknown tool' };
        return { type: 'tool_result', tool_use_id: tu.id, content: JSON.stringify(result) };
      });
      messages.push({ role: 'user', content: toolResults });

      if (response.stop_reason !== 'tool_use') { finalText = text; break; }
    }

    return { statusCode: 200, body: JSON.stringify({ text: finalText }) };
  } catch (e) {
    console.error(e);
    return { statusCode: 500, body: JSON.stringify({ error: 'chat_failed' }) };
  }
};
