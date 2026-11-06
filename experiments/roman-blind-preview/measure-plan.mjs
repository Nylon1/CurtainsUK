export const fields = {
 inside: ['top', 'middle', 'bottom', 'leftDrop', 'centreDrop', 'rightDrop'],
 outside: ['opening', 'leftOverlap', 'rightOverlap', 'finishedDrop'],
};
export function validMeasurement(value, allowZero = false) {
 if (value === '' || value === null || value === undefined) return false;
 const number = Number(value);
 return Number.isFinite(number) && number >= (allowZero ? 0 : 0.1) && number <= 1000 && Math.abs(number * 10 - Math.round(number * 10)) < 1e-7;
}
export function measurementPlan(fit, values) {
 const valid = key => validMeasurement(values[key], key.endsWith('Overlap'));
 const widthKeys = fit === 'inside' ? fields.inside.slice(0, 3) : fields.outside.slice(0, 3);
 const dropKeys = fit === 'inside' ? fields.inside.slice(3) : ['finishedDrop'];
 const width = widthKeys.every(valid) ? (fit === 'inside' ? Math.min(...widthKeys.map(key => Number(values[key]))) : Math.round(widthKeys.reduce((sum,key) => sum + Number(values[key]), 0) * 10) / 10) : null;
 const drop = dropKeys.every(valid) ? Math.min(...dropKeys.map(key => Number(values[key]))) : null;
 return {width, drop, complete: width !== null && drop !== null, missing: fields[fit].filter(key => !valid(key))};
}
