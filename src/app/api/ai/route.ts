import { NextResponse } from "next/server";
import { env, features, userFromRequest } from "@/lib/server";

export const dynamic = "force-dynamic";

type Task = "affirmations" | "milestones" | "insights" | "journal";

const SYSTEM = `You are the AI coach inside "Opulent Vision Board", a premium app that connects a person's vision to daily action.
Voice: warm, grounded, luxurious but never fluffy. Never generic: every line must reference the user's real goals, dates, progress or words.
Always reply with a single JSON object and nothing else.`;

function prompt(task: Task, input: unknown): string {
  const data = JSON.stringify(input).slice(0, 12000);
  switch (task) {
    case "affirmations":
      return `Write ${"`count`"} first-person affirmations for this user. Each must name a specific goal, date or obstacle from the data, and be under 25 words. Pair each with one concrete action they can take today (under 12 words). Return {"affirmations":[{"text":string,"goalId":string|null,"action":string}]}.\nDATA: ${data}`;
    case "milestones":
      return `Break this goal into 4 to 6 milestones that lead to it. Early ones are weekly, later ones monthly. Each title is an action under 10 words. dueInDays counts from today and must fit before the deadline if one is given. Return {"milestones":[{"title":string,"cadence":"weekly"|"monthly","dueInDays":number}]}.\nGOAL: ${data}`;
    case "insights":
      return `You are the Vision Alignment Engine. Compare the user's stated vision and goals with their recent behavior. Find up to 3 gaps or wins, each with a specific, kind, actionable next step. Return {"insights":[{"title":string (under 12 words),"body":string (under 40 words),"tone":"gold"|"green"|"muted"}]}. Use "gold" for misalignment, "green" for wins.\nDATA: ${data}`;
    case "journal":
      return `Read these journal entries and moods. Give one insight about the user's emotional patterns and how they connect to their goals, plus one gentle suggestion. Return {"insight":string (under 60 words)}.\nDATA: ${data}`;
  }
}

export async function POST(req: Request) {
  if (!features.ai) return NextResponse.json({ fallback: true });
  if (features.cloud && !(await userFromRequest(req))) {
    return NextResponse.json({ error: "Sign in to use AI features." }, { status: 401 });
  }
  let body: { task?: Task; input?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
  const task = body.task;
  if (!task || !["affirmations", "milestones", "insights", "journal"].includes(task)) {
    return NextResponse.json({ error: "Unknown task" }, { status: 400 });
  }
  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${env.openaiKey}` },
      body: JSON.stringify({
        model: env.openaiModel,
        temperature: 0.8,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: prompt(task, body.input) },
        ],
      }),
      signal: AbortSignal.timeout(25000),
    });
    if (!res.ok) return NextResponse.json({ fallback: true, error: `AI provider returned ${res.status}` });
    const json = await res.json();
    const content = json?.choices?.[0]?.message?.content;
    return NextResponse.json(JSON.parse(content));
  } catch {
    return NextResponse.json({ fallback: true });
  }
}
