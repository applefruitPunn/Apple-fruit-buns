/* ============================================================
   Task Assistant — fully client-side, no API keys, no backend.
   Two layers of "brain":
   1. SKILLS  — regex-matched commands that do real work
               (tasks, calculator, time/date, help, clear)
   2. RULES   — plain keyword -> response lookups loaded from
               rules.json, for anyone to edit without touching JS
   ============================================================ */

const logEl   = document.getElementById('log');
const formEl  = document.getElementById('composer');
const inputEl = document.getElementById('input');
const taskCountEl = document.getElementById('task-count');

const STORAGE_KEY = 'task-ai:tasks';
let rules = [];
let tasks = loadTasks();

/* ---------- storage ---------- */

function loadTasks() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveTasks() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  renderTaskCount();
}

function renderTaskCount() {
  const open = tasks.filter(t => !t.done).length;
  taskCountEl.textContent = open === 0
    ? 'no open tasks'
    : `${open} open task${open === 1 ? '' : 's'}`;
}

/* ---------- transcript UI ---------- */

function addLine(who, text) {
  const line = document.createElement('div');
  line.className = `line line--${who}`;

  const tag = document.createElement('span');
  tag.className = 'line__tag';
  tag.textContent = who === 'user' ? 'you' : 'assistant';

  const body = document.createElement('span');
  body.className = 'line__body';
  body.textContent = text;

  line.appendChild(tag);
  line.appendChild(body);
  logEl.appendChild(line);
  logEl.scrollTop = logEl.scrollHeight;
}

/* ---------- skills (things that DO something) ---------- */

const skills = [
  {
    name: 'help',
    test: t => /^help$|^\?$|what can you do/.test(t),
    run: () => [
      'Commands I understand:',
      '  add <task>          — add a task',
      '  list                — show open tasks',
      '  done <number>       — mark a task complete',
      '  remove <number>     — delete a task',
      '  clear tasks         — remove everything',
      '  calc <expression>   — e.g. calc (4+8)/2',
      '  time / date         — current time or date',
      'Anything else is matched against keyword rules in rules.json.'
    ].join('\n')
  },
  {
    name: 'add-task',
    test: t => /^(add|todo|task)[:\s]+.+/.test(t),
    run: (t, raw) => {
      const text = raw.replace(/^(add|todo|task)[:\s]+/i, '').trim();
      if (!text) return "Tell me what the task is, e.g. \"add buy milk\".";
      tasks.push({ text, done: false });
      saveTasks();
      return `Added: "${text}" (#${tasks.length})`;
    }
  },
  {
    name: 'list-tasks',
    test: t => /^(list|show tasks|my tasks)$/.test(t),
    run: () => {
      if (tasks.length === 0) return "Nothing on the list. Add one with \"add <task>\".";
      return tasks
        .map((task, i) => `${i + 1}. ${task.done ? '[x]' : '[ ]'} ${task.text}`)
        .join('\n');
    }
  },
  {
    name: 'done-task',
    test: t => /^(done|complete|finish)\s+\d+/.test(t),
    run: (t) => {
      const n = parseInt(t.match(/\d+/)[0], 10);
      const task = tasks[n - 1];
      if (!task) return `No task #${n}.`;
      task.done = true;
      saveTasks();
      return `Marked #${n} done: "${task.text}"`;
    }
  },
  {
    name: 'remove-task',
    test: t => /^(remove|delete)\s+\d+/.test(t),
    run: (t) => {
      const n = parseInt(t.match(/\d+/)[0], 10);
      const task = tasks[n - 1];
      if (!task) return `No task #${n}.`;
      tasks.splice(n - 1, 1);
      saveTasks();
      return `Removed: "${task.text}"`;
    }
  },
  {
    name: 'clear-tasks',
    test: t => /^clear tasks$/.test(t),
    run: () => {
      tasks = [];
      saveTasks();
      return 'Task list cleared.';
    }
  },
  {
    name: 'calculator',
    test: t => /^calc(ulate)?\s+/.test(t),
    run: (t, raw) => {
      const expr = raw.replace(/^calc(ulate)?\s+/i, '');
      if (!/^[0-9+\-*/().\s]+$/.test(expr)) {
        return "I can only do plain arithmetic — digits and + - * / ( ).";
      }
      try {
        // eslint-disable-next-line no-new-func
        const result = Function(`"use strict"; return (${expr})`)();
        if (typeof result !== 'number' || !isFinite(result)) throw new Error();
        return `${expr.trim()} = ${result}`;
      } catch {
        return "That didn't parse as a valid expression.";
      }
    }
  },
  {
    name: 'time',
    test: t => /\btime\b/.test(t) && !/task/.test(t),
    run: () => `It's ${new Date().toLocaleTimeString()}.`
  },
  {
    name: 'date',
    test: t => /\bdate\b|today's date/.test(t),
    run: () => `Today is ${new Date().toLocaleDateString(undefined, {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    })}.`
  }
];

/* ---------- keyword rules (things that just RESPOND) ---------- */

function matchRule(t) {
  let best = null;
  let bestScore = 0;

  for (const rule of rules) {
    let score = 0;
    for (const kw of rule.keywords) {
      if (t.includes(kw.toLowerCase())) score += kw.split(' ').length; // longer phrases win ties
    }
    if (score > bestScore) {
      bestScore = score;
      best = rule;
    }
  }
  if (!best) return null;
  const options = best.responses;
  return options[Math.floor(Math.random() * options.length)];
}

const FALLBACKS = [
  "I don't have a rule for that yet — type \"help\" to see what I can do, or add a keyword rule to rules.json.",
  "Not sure how to respond to that. Try \"help\", or teach me by adding it to rules.json."
];

/* ---------- brain: skills first, then rules, then fallback ---------- */

function respondTo(raw) {
  const t = raw.trim().toLowerCase();
  if (!t) return null;

  for (const skill of skills) {
    if (skill.test(t)) return skill.run(t, raw.trim());
  }

  const ruleReply = matchRule(t);
  if (ruleReply) return ruleReply;

  return FALLBACKS[Math.floor(Math.random() * FALLBACKS.length)];
}

/* ---------- wiring ---------- */

formEl.addEventListener('submit', (e) => {
  e.preventDefault();
  const text = inputEl.value;
  if (!text.trim()) return;
  addLine('user', text.trim());
  inputEl.value = '';

  const reply = respondTo(text);
  // tiny delay so it doesn't feel like the same instant echo
  setTimeout(() => addLine('assistant', reply), 150);
});

async function init() {
  try {
    const res = await fetch('rules.json');
    rules = await res.json();
  } catch {
    rules = [];
    addLine('assistant', "Couldn't load rules.json — keyword responses are disabled, but tasks, calc, time, and date still work.");
  }
  renderTaskCount();
  addLine('assistant', 'Ready. Type "help" to see what I can do.');
}

init();
