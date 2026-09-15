# Task Assistant

A small task-helper "AI" that runs entirely in the browser — no API keys,
no backend, no external services. It's two things stacked together:

1. **Skills** (`script.js`) — real commands that do work: a task list,
   a calculator, time/date. These are matched with regex.
2. **Rules** (`rules.json`) — plain keyword → response lookups for
   everything conversational. Edit this file to teach the assistant new
   things without touching any code.

## Files

```
index.html   page markup
style.css    styling
script.js    the logic: skills engine + rule matcher
rules.json   your editable keyword → response rules
```

## Commands it understands out of the box

```
add <task>          add a task
list                show open tasks
done <number>       mark a task complete
remove <number>     delete a task
clear tasks         remove everything
calc <expression>   e.g. calc (4+8)/2
time / date         current time or date
help                show this list
```

Anything else gets matched against `rules.json`.

## Editing the rules

Open `rules.json`. Each entry looks like this:

```json
{
  "id": "greeting",
  "keywords": ["hello", "hi", "hey"],
  "responses": [
    "Hey. What are we getting done today?",
    "Hi there — tell me what you're working on."
  ]
}
```

- `keywords` — any of these appearing in the user's message counts toward
  a match. Longer phrases (more words) are weighted higher than single
  words, so more specific keywords win over generic ones.
- `responses` — one is picked at random when this rule wins.

Add as many rule objects as you like to the array. No build step is
needed — just save the file.

## Running it locally

Because `script.js` loads `rules.json` with `fetch`, opening `index.html`
directly as a `file://` URL will fail in some browsers (CORS on local
files). Serve the folder instead, e.g.:

```
python3 -m http.server 8000
```

then visit `http://localhost:8000`.

## Deploying to GitHub Pages

1. Create a new GitHub repository (or use an existing one).
2. Add these four files (`index.html`, `style.css`, `script.js`,
   `rules.json`) to the repo root and push to the `main` branch.
3. On GitHub, go to **Settings → Pages**.
4. Under **Build and deployment**, set **Source** to "Deploy from a
   branch", branch `main`, folder `/ (root)`. Save.
5. GitHub will give you a URL like
   `https://<your-username>.github.io/<repo-name>/` within a minute or
   two — that's your live page.

Every task is saved in the visitor's own browser (`localStorage`), so
it's private per-device and persists across visits — there's no server
storing anything.

## Extending it

- Want a new command that *does* something (not just replies)? Add an
  object to the `skills` array in `script.js` with a `test` regex and a
  `run` function.
- Want the assistant to just *say* something new? Add a rule to
  `rules.json` — no JS required.
