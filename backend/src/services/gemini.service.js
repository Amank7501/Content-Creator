const { GoogleGenerativeAI } = require('@google/generative-ai');

/**
 * Identify highly engaging clips from the transcript using Google Gemini (Free Tier).
 */
const detectClips = async (transcriptText) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn("No GEMINI_API_KEY found, falling back to rule-based detection.");
    return fallbackRuleBasedDetection(transcriptText);
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  // Mapped out explicitly available generic endpoints for your specific API key
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  const prompt = `Return ONLY valid JSON.
Find engaging, viral-worthy segments from the transcript.

Rules:
- Clip duration: 10-60 seconds
- Focus on:
  - emotional intensity
  - strong opinions
  - surprising insights
  - hooks/questions

Format:
[
  {
    "start": number,
    "end": number,
    "title": "short engaging title",
    "reason": "why this segment is engaging"
  }
]

Transcript:
${transcriptText}`;

  try {
    const result = await model.generateContent(prompt);
    const textResponse = result.response.text();
    
    // Parse strictly, strip Markdown block quotes if they exist (e.g. ```json ... ```)
    const jsonStr = textResponse.replace(/^```json/g, '').replace(/```$/g, '').trim();
    
    const parsed = JSON.parse(jsonStr);
    
    // Ensure we actually got an array back
    if (!Array.isArray(parsed)) {
      throw new Error("Gemini did not return a JSON array");
    }
    
    return parsed;
  } catch (error) {
    console.error('Gemini Clip Detection Error:', error.message);
    console.log("Falling back to rule-based clip detection due to Gemini failure.");
    return fallbackRuleBasedDetection(transcriptText);
  }
};

/**
 * Fallback detection logic relying purely on naive structural slicing.
 * Slices up roughly 3 clips from start to finish dynamically.
 */
function fallbackRuleBasedDetection(transcriptText) {
  // A naive rule engine. 
  // Whisper JSON typically has segments. We just return arbitrary intervals.
  // We'll estimate typical 30 second blocks if we only received flat transcript text.
  
  // Provide 2 dummy intervals
  return [
    {
      start: 0.0,
      end: 30.0,
      title: "Introduction",
      reason: "Start of the video establishing context (Rule-based Fallback)"
    },
    {
      start: 30.0,
      end: 60.0,
      title: "Core Topic",
      reason: "First primary segment analysis (Rule-based Fallback)"
    }
  ];
}

module.exports = { detectClips, fallbackRuleBasedDetection };
