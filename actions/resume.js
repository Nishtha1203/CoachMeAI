/* "use server";

import { db } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { revalidatePath } from "next/cache";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

export async function saveResume(content) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
  });

  if (!user) throw new Error("User not found");

  try {
    const resume = await db.resume.upsert({
      where: {
        userId: user.id,
      },
      update: {
        content,
      },
      create: {
        userId: user.id,
        content,
      },
    });

    revalidatePath("/resume");
    return resume;
  } catch (error) {
    console.error("Error saving resume:", error);
    throw new Error("Failed to save resume");
  }
}

export async function getResume() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
  });

  if (!user) throw new Error("User not found");

  return await db.resume.findUnique({
    where: {
      userId: user.id,
    },
  });
}

export async function improveWithAI({ current, type }) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
    include: {
      industryInsight: true,
    },
  });

  if (!user) throw new Error("User not found");

  const prompt = `
    As an expert resume writer, improve the following ${type} description for a ${user.industry} professional.
    Make it more impactful, quantifiable, and aligned with industry standards.
    Current content: "${current}"

    Requirements:
    1. Use action verbs
    2. Include metrics and results where possible
    3. Highlight relevant technical skills
    4. Keep it concise but detailed
    5. Focus on achievements over responsibilities
    6. Use industry-specific keywords
    
    Format the response as a single paragraph without any additional text or explanations.
  `;

  try {
    const result = await model.generateContent(prompt);
    const response = result.response;
    const improvedContent = response.text().trim();
    return improvedContent;
  } catch (error) {
    console.error("Error improving content:", error);
    throw new Error("Failed to improve content");
  }
} */





"use server";

import { db } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { revalidatePath } from "next/cache";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export async function saveResume(content) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
  });

  if (!user) throw new Error("User not found");

  try {
    const resume = await db.resume.upsert({
      where: {
        userId: user.id,
      },
      update: {
        content,
      },
      create: {
        userId: user.id,
        content,
      },
    });

    revalidatePath("/resume");
    return resume;
  } catch (error) {
    console.error("Error saving resume:", error);
    throw new Error("Failed to save resume");
  }
}

export async function getResume() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
  });

  if (!user) throw new Error("User not found");

  return await db.resume.findUnique({
    where: {
      userId: user.id,
    },
  });
}

export async function improveWithAI({ current, type }) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  if (!process.env.GEMINI_API_KEY) {
    throw new Error("Gemini API key is missing");
  }

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
    include: {
      industryInsight: true,
    },
  });

  if (!user) throw new Error("User not found");

  const prompt = `
As an expert resume writer, improve the following ${type} description for a ${user.industry || "software"} professional.

Make it more impactful, quantifiable, ATS-friendly, and aligned with industry standards.

Current content:
"${current}"

Requirements:
1. Use strong action verbs.
2. Include measurable impact where possible.
3. Highlight relevant technical skills.
4. Keep it concise but detailed.
5. Focus on achievements over responsibilities.
6. Use industry-specific keywords.
7. Do not invent fake company names, fake dates, or fake certifications.

Format the response as a single professional resume bullet/paragraph without any additional explanation.
`;

  const modelNames = [
    "gemini-2.5-flash",
    "gemini-2.5-flash-lite",
  ];

  for (const modelName of modelNames) {
    try {
      const model = genAI.getGenerativeModel({
        model: modelName,
      });

      const result = await model.generateContent(prompt);
      const response = result.response;
      const improvedContent = response.text().trim();

      return improvedContent;
    } catch (error) {
      console.error(`Error improving content with ${modelName}:`, error);

      const errorMessage = error.message || "";

      const isTemporaryError =
        error.status === 503 ||
        errorMessage.includes("503") ||
        errorMessage.includes("high demand") ||
        errorMessage.includes("Service Unavailable");

      const isQuotaError =
        error.status === 429 ||
        errorMessage.includes("429") ||
        errorMessage.includes("quota") ||
        errorMessage.includes("Too Many Requests");

      const isModelError =
        error.status === 404 ||
        errorMessage.includes("404") ||
        errorMessage.includes("not found");

      if (isTemporaryError) {
        continue;
      }

      if (isQuotaError) {
        throw new Error(
          "Gemini API quota exceeded. Please check your Gemini API key, quota, or billing."
        );
      }

      if (isModelError) {
        continue;
      }

      throw new Error("Failed to improve content");
    }
  }

  throw new Error(
    "Gemini models are temporarily unavailable. Please try again after some time."
  );
}