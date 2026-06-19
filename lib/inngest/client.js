import { Inngest } from "inngest";

export const inngest = new Inngest({
  id: "CoachMe.AI", 
  name: "CoachMe.AI",
  credentials: {
    gemini: {
      apiKey: process.env.GEMINI_API_KEY,
    },
  },
});