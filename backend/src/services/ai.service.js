const { GoogleGenerativeAI } = require('@google/generative-ai');

/**
 * Generate an Edit Decision List (EDL) using Google Gemini.
 */
const generateEditPlan = async (transcriptText, category, tone) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is missing. Cannot generate AI Edit Plan.");
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash", generationConfig: { responseMimeType: "application/json" } });

  const prompt = `Generate a professional Edit Decision List (EDL) for this video transcript.
Category: ${category}
Tone: ${tone || 'auto'}

Apply the following stylistic rules based on Category:
- motivational: Focus on short, punchy clips (5-15s). Use bold, centered captions ('center'). Include 'zoom' effects to emphasize strong statements. Select 'motivational' music.
- podcast: Focus on longer, continuous thoughtful clips. Use unobtrusive bottom captions ('bottom'). Minimal to no effects. Select 'podcast' music.
- funny: Focus on fast cuts and comedic timing. Short, varied clips. Use top or center captions with bright colors. Frequent zoom effects. Select 'funny' music.
- educational: Clear, structured progression. Center or bottom captions. Use zoom for emphasis. Select 'podcast' music.

Output EXACTLY this JSON schema:
{
  "cuts": [
    { "start": number, "end": number }
  ],
  "captions": [
    {
      "text": string,
      "start": number,
      "end": number,
      "style": {
        "position": "top" | "center" | "bottom",
        "color": string,
        "fontSize": number,
        "bold": boolean
      }
    }
  ],
  "effects": [
    {
      "type": "zoom",
      "start": number,
      "end": number
    }
  ],
  "music": {
    "type": string,
    "volume": number
  }
}

Extract ONLY the most engaging parts of the transcript to create a viral short video (under 60s total).
The 'cuts' array defines the raw video segments to keep.
The 'captions' and 'effects' 'start' and 'end' timestamps must correspond to the original video's timestamps within the cuts.
Ensure no overlapping cuts. Sort cuts sequentially.

Transcript:
${transcriptText.substring(0, 50000)} // safe slice`;

  try {
    const result = await model.generateContent(prompt);
    let textResponse = result.response.text();
    textResponse = textResponse.replace(/^```json/g, '').replace(/```$/g, '').trim();

    const parsed = JSON.parse(textResponse);
    return parsed;
  } catch (error) {
    console.error('Gemini Generate Edit Plan Error:', error.message);
    throw new Error('Failed to generate edit plan from AI: ' + error.message);
  }
};

module.exports = { generateEditPlan };
