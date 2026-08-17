// Generates today.json — a public, read-only feed of *curriculum content only*
// (no personal checkboxes/streak, which live in each device's local storage).
// Re-run by the GitHub Actions workflow once a day so the feed always matches "today".
"use strict";
const fs = require("fs");
const path = require("path");

// Must match the app's own startDate (see index.html) so day/week numbering lines up
// with what the app itself shows. This is a Monday.
const START_DATE = "2026-08-17";

const CHINESE_TITLES = [
  "Greetings & Self-Introduction","Numbers & Age","Family","Country & Nationality","Jobs & Occupations",
  "Week 1 Review","Mini Test","Dates & Days","Time","Daily Routine","Food & Drinks","Likes & Hobbies",
  "Week 2 Review","Mini Test","Places","Location","Transportation","Weather","Describing People",
  "Week 3 Review","Mini Test","Question Words","Common Verbs","Basic Sentence Patterns",
  "Listening & Reading Focus","Speaking Focus","Full HSK1 Review","HSK1 Mini Mock"
];

const ENGLISH_DAYS = [
  { title:"Self Introduction", primary:"Tell me about yourself." },
  { title:"Education", primary:"Why did you choose your field of study?" },
  { title:"Strengths", primary:"What are your strengths?" },
  { title:"Weaknesses", primary:"What is your greatest weakness?" },
  { title:"Career Goals", primary:"Where do you see yourself in five years?" },
  { title:"Challenge", primary:"Tell me about a challenge you faced." },
  { title:"Mock Interview", note:"Randomly select 1 general + 1 behavioral + 1 career-specific question." },
  { title:"Work Experience", primary:"Tell me about your work experience." },
  { title:"Teamwork", primary:"Tell me about a time you worked in a team." },
  { title:"Mistakes", primary:"Tell me about a mistake you made." },
  { title:"Conflict", primary:"Tell me about a conflict you experienced." },
  { title:"Learning", primary:"Tell me about something you had to learn quickly." },
  { title:"Prioritization", primary:"How do you handle multiple tasks at the same time?" },
  { title:"Behavioral Mock", note:"Randomly select from: Challenge, Teamwork, Mistake, Conflict, Learning." },
  { title:"Pressure", primary:"How do you handle pressure?" },
  { title:"Serious Mistake", primary:"What would you do if you made a serious mistake?" },
  { title:"Unclear Instructions", primary:"What would you do if you received unclear instructions?" },
  { title:"Angry Customer", primary:"How would you handle an angry customer?" },
  { title:"Multiple Urgent Problems", primary:"What would you do if several urgent problems happened at once?" },
  { title:"Difficult Decision", primary:"Describe a difficult decision." },
  { title:"Situational Mock", note:"Full situational interview mock, unscripted." },
  { title:"IT", primary:"Describe a technical problem you had to solve.", career:"IT" },
  { title:"Passenger Service", primary:"How would you handle a passenger who is angry about a situation you cannot change?", career:"Passenger Service" },
  { title:"Cabin Crew", primary:"Why do you want to become a cabin crew member?", career:"Cabin Crew" },
  { title:"ATC", primary:"Why are you interested in becoming an air traffic controller?", career:"ATC" },
  { title:"Random Career Question", note:"Randomly select a career: IT, Passenger Service, Cabin Crew, ATC." },
  { title:"Deep Interview Day", note:"Randomly select previous questions. Answer without preparation." },
  { title:"Full Mock Interview", note:"Introduction, Behavioral, Situational, Career-specific, Deep follow-up." }
];

const MATH_TITLES = [
  "Number Sense & Basic Calculation","Fractions","Fraction Operations","Decimals & Percentages",
  "Ratio","Proportion","Algebra Basics","Linear Equations",
  "Word Problems","Rate, Distance & Time","Averages","Graphs & Data",
  "Powers & Roots","Functions","Coordinate Geometry","Probability",
  "Mental Math","Numerical Reasoning","Pattern Recognition","Mixed Problem Solving"
];

const PHYSICS_TITLES = [
  "Units & Measurement","Distance, Displacement & Speed","Velocity & Acceleration","Motion Graphs",
  "Force","Newton's First Law","Newton's Second Law","Newton's Third Law",
  "Work","Energy","Power","Conservation of Energy",
  "Momentum","Collisions","Waves","Sound",
  "Electric Charge","Current","Voltage & Resistance","Circuits"
];

const ATC_SKILLS = {
  1: "Mental Math", 2: "Memory", 3: "Logic & Patterns", 4: "Spatial Awareness", 5: "Attention & Prioritization"
};

const THREED_LEARN = [
  "Interface, Navigation, Object Mode, Move, Rotate, Scale","Edit Mode, Vertex, Edge, Face, Extrude, Inset",
  "Loop Cut, Bevel, Mirror Modifier","Array Modifier, Subdivision Surface, Scene organization",
  "Hard surface basics","Furniture techniques","Props","Scene assembly",
  "UV basics — seams, unwrap","UV practice — islands, packing","Materials — color, roughness, metallic, normal maps","Full pipeline review",
  "Head proportions","Face","Body proportions","Combine head + body",
  "Hair","Clothes","Accessories","Final detailing",
  "Armature","Weight painting","Basic poses","Idle animation basics"
];

const DOW_NAMES = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];

function fmt(d) {
  const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, "0"), day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function parseD(s) { const p = s.split("-").map(Number); return new Date(p[0], p[1] - 1, p[2]); }
function addDays(d, n) { const r = new Date(d); r.setDate(r.getDate() + n); return r; }

function weekNumberFor(dateStr, startStr) {
  const diffDays = Math.round((parseD(dateStr) - parseD(startStr)) / 86400000);
  const wn = Math.floor(diffDays / 7) + 1;
  return wn < 1 ? 1 : wn;
}
function weekdayIndexFor(dateStr, startStr) {
  const start = parseD(startStr), d = parseD(dateStr);
  if (d < start) return 1;
  let count = 0, cur = new Date(start);
  while (cur <= d) {
    const dow = cur.getDay();
    if (dow >= 1 && dow <= 5) count++;
    cur = addDays(cur, 1);
  }
  return count < 1 ? 1 : count;
}
function cyclePos(idx, len) {
  const zero = idx - 1;
  return { pos: zero % len, cycle: Math.floor(zero / len) + 1 };
}

const today = new Date();
const todayStr = fmt(today);
const dow = today.getDay();
const wn = weekNumberFor(todayStr, START_DATE);

const out = {
  generatedAt: new Date().toISOString(),
  date: todayStr,
  dayOfWeek: DOW_NAMES[dow],
  weekNumber: wn
};

if (dow >= 1 && dow <= 5) {
  const wi = weekdayIndexFor(todayStr, START_DATE);
  const cnCp = cyclePos(wi, CHINESE_TITLES.length);
  const enCp = cyclePos(wi, ENGLISH_DAYS.length);
  const en = ENGLISH_DAYS[enCp.pos];
  const mCp = cyclePos(wn, MATH_TITLES.length);
  const pCp = cyclePos(wn, PHYSICS_TITLES.length);

  out.chinese = { day: cnCp.pos + 1, cycle: cnCp.cycle, title: CHINESE_TITLES[cnCp.pos] };
  out.english = { day: enCp.pos + 1, cycle: enCp.cycle, title: en.title, primary: en.primary || null, note: en.note || null, career: en.career || null };
  out.optionalMath = { week: mCp.pos + 1, title: MATH_TITLES[mCp.pos] };
  out.optionalPhysics = { week: pCp.pos + 1, title: PHYSICS_TITLES[pCp.pos] };
  out.atc = { skill: ATC_SKILLS[dow] || null };
} else if (dow === 6) {
  const mCp = cyclePos(wn, MATH_TITLES.length);
  const tCp = cyclePos(wn, THREED_LEARN.length);
  out.math = { week: mCp.pos + 1, cycle: mCp.cycle, title: MATH_TITLES[mCp.pos] };
  out.threed = { week: tCp.pos + 1, cycle: tCp.cycle, learn: THREED_LEARN[tCp.pos], phase: "Saturday: learn" };
} else {
  const pCp = cyclePos(wn, PHYSICS_TITLES.length);
  const tCp = cyclePos(wn, THREED_LEARN.length);
  out.physics = { week: pCp.pos + 1, cycle: pCp.cycle, title: PHYSICS_TITLES[pCp.pos] };
  out.threed = { week: tCp.pos + 1, cycle: tCp.cycle, learn: THREED_LEARN[tCp.pos], phase: "Sunday: apply/project" };
}

const outPath = path.join(__dirname, "..", "today.json");
fs.writeFileSync(outPath, JSON.stringify(out, null, 2) + "\n");
console.log("Wrote", outPath);
console.log(JSON.stringify(out, null, 2));
