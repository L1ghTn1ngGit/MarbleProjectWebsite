// Single place to choose where budget data comes from. See API_MIGRATION_PLAN.md.
export const DATA_CONFIG = {
  // 'csv'      : the bundled public/nyc-education-data.csv (current default)
  // 'snapshot' : JSON written by scripts/sync-checkbook.mjs into public/data/
  source: "csv",

  csvUrl: "/nyc-education-data.csv",
  snapshotManifestUrl: "/data/manifest.json",

  // The CSV also contains ~3,600 lines from other agencies (CUNY, Police, Parks, Pensions...).
  // The site describes Department of Education spending, so only DOE lines are analyzed.
  // Set to null to analyze every agency in the file.
  agency: "Department of Education",

  sourceLabel: "Checkbook NYC (NYC Comptroller), Budget data",
  sourceUrl: "https://www.checkbooknyc.com/",
};
