export function detectCapabilities(){
  const canvas=document.createElement('canvas');
  const ctx=canvas.getContext('2d');
  const draw=typeof ctx?.drawElementImage==='function';
  const modern='content' in canvas && typeof canvas.updateElementGeometry==='function';
  const legacy='layoutSubtree' in canvas;
  return {drawElementImage:draw,paint:'onpaint' in canvas,requestPaint:typeof canvas.requestPaint==='function',updateElementGeometry:typeof canvas.updateElementGeometry==='function',contentDrawable:'content' in canvas,layoutSubtree:legacy,generation:modern?'drawable':legacy?'layoutsubtree':'unknown',supported:draw&&(modern||legacy),userAgent:navigator.userAgent,devicePixelRatio:devicePixelRatio,secureContext:isSecureContext};
}
export const API_REFERENCE='https://github.com/WICG/html-in-canvas';
