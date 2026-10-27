// rough guess at how much the device can handle, from what the browser tells us
const nav = navigator;
const cores = nav.hardwareConcurrency || 8;
const memory = nav.deviceMemory || 8;
const saveData = Boolean(nav.connection?.saveData);
const slowNet = /(^|-)2g$/.test(nav.connection?.effectiveType || "");

// some browsers fake low core counts for privacy, so cores alone never makes a device "low"
export const tier = saveData || slowNet || memory <= 2 || (cores <= 2 && memory <= 4) ? "low" : cores <= 4 || memory <= 4 ? "mid" : "high";
