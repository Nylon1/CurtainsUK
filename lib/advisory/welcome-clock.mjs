// Wall-clock deadline, not a decrementing interval: suspension cannot add delay.
export const welcomeRemaining = (deadline, now) => Math.max(0,Math.min(30,Math.ceil((deadline-now)/1000)));
