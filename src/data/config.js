export const DATA_CONFIG = {

  sources: ["api", "snapshot", "csv"],

  apiUrl: "/api/budget",

  apiYears: [2023, 2024, 2025],

  timeoutMs: { api: 20000, snapshot: 12000, csv: 30000 },

  csvUrl: "/nyc-education-data.csv",
  snapshotManifestUrl: "/data/manifest.json",


  agency: "Department of Education",

  sourceLabel: "Checkbook NYC (NYC Comptroller), Budget data",
  sourceUrl: "https://www.checkbooknyc.com/",
};
