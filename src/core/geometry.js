export function compareBounds(visual, dom, tolerance = 2) {
  if (!visual || !dom) return {status:'UNSUPPORTED', reason:'Both independently measured bounds are required.'};
  const delta = Object.fromEntries(['x','y','width','height'].map(k=>[k,Math.abs(visual[k]-dom[k])]));
  const maxDelta = Math.max(...Object.values(delta));
  return {status:maxDelta <= tolerance?'PASS':'FAIL',delta,maxDelta,tolerance};
}
// Scan real raster alpha. The fixture has one opaque border box, no shadow or outline.
export function alphaBounds(data,width,height,threshold=32) {
  let left=width,top=height,right=-1,bottom=-1;
  for(let y=0;y<height;y++) for(let x=0;x<width;x++) if(data[(y*width+x)*4+3]>threshold){left=Math.min(left,x);top=Math.min(top,y);right=Math.max(right,x);bottom=Math.max(bottom,y);}
  return right<0?null:{x:left,y:top,width:right-left+1,height:bottom-top+1};
}
export function toViewport(bounds,canvasRect,width,height) {
  if(!bounds)return null;
  return {x:canvasRect.x+bounds.x*canvasRect.width/width,y:canvasRect.y+bounds.y*canvasRect.height/height,width:bounds.width*canvasRect.width/width,height:bounds.height*canvasRect.height/height};
}
export const rectJSON = r => ({x:r.x,y:r.y,width:r.width,height:r.height});
