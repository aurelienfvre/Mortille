import {cartridgeEase} from './cartridge-sequence';
import {returnMechanismProgress,RETURN_DURATION} from './return-motion';
export const CASE_OPEN=.12,CASE_UNCLIP=.8,CASE_TRAVEL_CLOSE=1.45,CASE_TRAVEL_CLOSED=1.9;
export function caseOpenAmount(t:number){
 return cartridgeEase((t-CASE_OPEN)/(CASE_UNCLIP-CASE_OPEN))*(1-cartridgeEase((t-CASE_TRAVEL_CLOSE)/(CASE_TRAVEL_CLOSED-CASE_TRAVEL_CLOSE)));
}
// Convert a mechanical keyframe into elapsed time on the reversed ejection animation.
export function caseReturnTime(stageTime:number){let lo=0,hi=RETURN_DURATION;for(let i=0;i<36;i++){const m=(lo+hi)/2;if(7.6*(1-returnMechanismProgress(m))>stageTime)lo=m;else hi=m;}return (lo+hi)/2;}
export const CASE_RETURN={appear:caseReturnTime(CASE_TRAVEL_CLOSED),hingeOpen:caseReturnTime(1.82),clip:caseReturnTime(CASE_UNCLIP),hingeClose:caseReturnTime(.72),closed:caseReturnTime(CASE_OPEN)};
