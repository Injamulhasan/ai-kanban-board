import { GoogleGenerativeAI } from "@google/generative-ai";
import pool from "../db/pool.js";
import AppError from "../utils/AppError.js";

let genAI = null;
let model = null;

function getModel() {
  if (!process.env.GEMINI_API_KEY) {
    throw new AppError("Gemini API key not configured. Set GEMINI_API_KEY in .env", 503);
  }
  if (!genAI) {
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const modelName = process.env.GEMINI_MODEL || "gemini-3.5-flash";
    model = genAI.getGenerativeModel({ model: modelName });
  }
  return model;
}

/** Safely calls Gemini API, catching and mapping quota or credential errors to clean AppErrors. Retries on temporary errors (e.g. 503). */
async function safeGenerateContent(m, prompt, retries = 3, delayMs = 1000) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await m.generateContent(prompt);
    } catch (err) {
      console.error(`Gemini API Error (Attempt ${attempt}/${retries}):`, err);
      const msg = err.message || "";
      const isTemporary = 
        err.status === 503 || 
        msg.includes("503") || 
        err.status === 429 || 
        msg.includes("429") || 
        msg.includes("quota") || 
        msg.includes("Quota") || 
        msg.includes("limit") || 
        msg.includes("spikes") || 
        msg.includes("demand") || 
        msg.includes("temporary") ||
        msg.includes("Unavailable");
      
      if (isTemporary && attempt < retries) {
        console.warn(`Temporary Gemini error encountered. Retrying attempt ${attempt + 1} in ${delayMs}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        delayMs *= 2; // exponential backoff
        continue;
      }
      
      // If we exhaust retries or it's not a temporary error, map to user-friendly AppError
      if (err.status === 429 || msg.includes("429") || msg.includes("quota") || msg.includes("Quota") || msg.includes("Requests")) {
        throw new AppError("Gemini AI API quota exceeded or rate-limited. Please configure a valid API key with sufficient quota.", 429);
      }
      if (err.status === 403 || msg.includes("403") || msg.includes("denied") || msg.includes("Forbidden") || msg.includes("API key")) {
        throw new AppError("Gemini AI API access denied. Please verify your API key is correct and authorized.", 403);
      }
      throw new AppError(err.message || "Failed to generate content from Gemini AI.", 502);
    }
  }
}

/** Safely parse JSON from Gemini's response (strips markdown fences if present). */
function parseJSON(text) {
  let cleaned = text.trim();
  // Strip ```json ... ``` fences
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  try {
    return JSON.parse(cleaned);
  } catch {
    throw new AppError("AI returned an unparseable response. Please try again.", 502);
  }
}

/* ---------- Generate Tasks ---------- */

export async function generateTasks(boardId, { goal, count = 6, column_id }) {
  if (!goal?.trim()) throw new AppError("A goal description is required");

  const m = getModel();
  const prompt = `You are a project management AI assistant for a Kanban board app called Kanboard.

A user wants to generate tasks for their board. Their goal is:
"${goal.trim()}"

Generate exactly ${count} tasks as a JSON array. Each task object must have:
- "title": string (concise, actionable task title)
- "description": string (1-2 sentence detail about the task)
- "priority": one of "low", "medium", "high", "urgent"

Return ONLY the JSON array, no markdown fences, no explanation.`;

  const result = await safeGenerateContent(m, prompt);
  const text = result.response.text();
  const taskList = parseJSON(text);

  if (!Array.isArray(taskList)) throw new AppError("AI did not return a valid task list", 502);

  // Determine target column
  let targetColumnId = column_id;
  if (!targetColumnId) {
    const { rows } = await pool.query(
      "SELECT id FROM columns WHERE board_id = $1 ORDER BY position LIMIT 1",
      [boardId]
    );
    targetColumnId = rows[0]?.id;
    if (!targetColumnId) throw new AppError("Board has no columns", 400);
  }

  // Insert tasks into DB
  const created = [];
  for (let i = 0; i < taskList.length; i++) {
    const t = taskList[i];
    const { rows } = await pool.query(
      `INSERT INTO tasks (board_id, column_id, title, description, priority, position, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, NULL) RETURNING *`,
      [
        boardId,
        targetColumnId,
        t.title || "Untitled task",
        t.description || null,
        ["low", "medium", "high", "urgent"].includes(t.priority) ? t.priority : "medium",
        Date.now() + i,
      ]
    );
    created.push({
      ...rows[0],
      assignee_id: null,
      assignee_name: null,
      assignee_email: null,
      assignee_avatar: null,
    });
  }

  await pool.query("UPDATE boards SET updated_at = now() WHERE id = $1", [boardId]);

  return { tasks: created };
}

/* ---------- Breakdown ---------- */

export async function breakdown(boardId, { taskId }) {
  // Fetch the parent task
  let taskTitle = "a task";
  let taskDescription = "";

  if (taskId) {
    const { rows } = await pool.query(
      "SELECT title, description FROM tasks WHERE id = $1 AND board_id = $2",
      [taskId, boardId]
    );
    if (rows.length) {
      taskTitle = rows[0].title;
      taskDescription = rows[0].description || "";
    }
  }

  const m = getModel();
  const prompt = `You are a project management AI assistant for Kanboard.

Break down this task into smaller, actionable subtasks:
Title: "${taskTitle}"
${taskDescription ? `Description: "${taskDescription}"` : ""}

Return a JSON array of 3-6 subtasks. Each object must have:
- "title": string (concise subtask title)
- "description": string (brief detail)
- "priority": one of "low", "medium", "high", "urgent"

Return ONLY the JSON array, no markdown fences, no explanation.`;

  const result = await safeGenerateContent(m, prompt);
  const text = result.response.text();
  const subtasks = parseJSON(text);

  if (!Array.isArray(subtasks)) throw new AppError("AI did not return valid subtasks", 502);

  return subtasks.map((s) => ({
    title: s.title || "Subtask",
    description: s.description || null,
    priority: ["low", "medium", "high", "urgent"].includes(s.priority) ? s.priority : "medium",
  }));
}

/* ---------- Sprint Summary ---------- */

export async function summary(boardId) {
  // Fetch all columns and tasks for the board
  const { rows: columns } = await pool.query(
    "SELECT id, title FROM columns WHERE board_id = $1 ORDER BY position",
    [boardId]
  );
  const { rows: tasks } = await pool.query(
    "SELECT title, priority, column_id FROM tasks WHERE board_id = $1",
    [boardId]
  );

  // Build context for the AI
  const colMap = {};
  columns.forEach((c) => (colMap[c.id] = c.title));
  const grouped = {};
  tasks.forEach((t) => {
    const colName = colMap[t.column_id] || "Unknown";
    (grouped[colName] ||= []).push(`${t.title} [${t.priority}]`);
  });

  const boardSnapshot = Object.entries(grouped)
    .map(([col, items]) => `${col}:\n${items.map((i) => `  - ${i}`).join("\n")}`)
    .join("\n\n");

  const m = getModel();
  const prompt = `You are a project management AI assistant for Kanboard.

Analyze this Kanban board and provide a sprint summary.

Board state:
${boardSnapshot || "(empty board — no tasks yet)"}

Return a JSON object with:
- "headline": string (1-2 sentence overall status)
- "completed": string[] (list of completed/done items)
- "inProgress": string[] (list of in-progress items)
- "risks": string[] (blockers, overdue, or at-risk items)
- "recommendations": string[] (actionable next steps)

Return ONLY the JSON object, no markdown fences, no explanation.`;

  const result = await safeGenerateContent(m, prompt);
  const text = result.response.text();
  const parsed = parseJSON(text);

  return {
    headline: parsed.headline || "Board summary generated.",
    completed: parsed.completed || [],
    inProgress: parsed.inProgress || [],
    risks: parsed.risks || [],
    recommendations: parsed.recommendations || [],
  };
}
