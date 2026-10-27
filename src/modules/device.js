// rough guess at how much the device can handle, from what the browser tells us
const nav = navigator;
const cores = nav.hardwareConcurrency || 8;
const memory = nav.deviceMemory || 8;
const saveData = Boolean(nav.connection?.saveData);
const slowNet = /(^|-)2g$/.test(nav.connection?.effectiveType || "");

export const tier = saveData || slowNet || cores <= 2 || memory <= 2 ? "low" : cores <= 4 || memory <= 4 ? "mid" : "high";
