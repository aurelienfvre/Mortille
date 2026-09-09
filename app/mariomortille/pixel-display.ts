/** Fill the available play area without stretching the 16:9 scene. */
export function pixelDisplay(width: number, height: number, density = 1) {
 const dpr = Math.max(1, density || 1);
 const fit = Math.min(Math.max(1,width)/640,Math.max(1,height)/360);
 const zoom = fit;
 return {zoom,width:640*zoom,height:360*zoom,left:Math.round((width-640*zoom)*dpr/2)/dpr,top:Math.round((height-360*zoom)*dpr/2)/dpr};
}
