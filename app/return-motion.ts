export const RETURN_DURATION=5.3;
const smoother=(x:number)=>{const t=Math.max(0,Math.min(1,x));return Math.max(0,Math.min(1,t*t*t*(t*(t*6-15)+10)));};
// Pull back, briefly overshoot, then settle at zero velocity.
export const returnCameraProgress=(seconds:number)=>seconds<4.1?1.035*smoother(seconds/4.1):1+.035*(1-smoother((seconds-4.1)/1.2));
export const returnMechanismProgress=(seconds:number)=>smoother(seconds/RETURN_DURATION);
