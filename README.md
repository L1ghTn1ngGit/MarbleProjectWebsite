# 💰 The Marble Project - NYC Education Budget Dashboard

Interactive, static (no build) dashboard for NYC DOE spending, ready for Vercel or any static host. Data: `nyc-education-data.csv` (43,249 rows, 2023-2025).

## 🚀 Local Preview

```bash
python start_server.py
# opens http://localhost:8000
```

## 🌐 Deploy to Vercel (ready out of the box)

```bash
npm i -g vercel
vercel
```
Or connect the repo in the Vercel UI. `vercel.json` is preconfigured for static hosting.

## 📁 What to ship

- `index.html`, `styles.css`, `app.js`
- `nyc-education-data.csv` (required dataset)
- `vercel.json` (static config)
- `start_server.py` (optional local server helper)
- `archive/` holds raw feeds and older drafts; safe to leave or exclude.

## ✨ Features

- Top-10 department spending chart (Chart.js)
- Dark/light mode toggle
- Filters: year, department, program + search
- Paginated, sortable data table
- Worst offenders slider + automated insights

## 🛠️ Troubleshooting

- **Blank data**: ensure you serve via `python start_server.py` (not `file://`).
- **Port 8000 in use**: stop the other process or change `PORT` in `start_server.py`.
- **CSV not found**: keep `nyc-education-data.csv` in the project root (same level as `index.html`).

## License / Use

Use freely for transparency and analysis. Verify figures against official NYC sources for decisions.
