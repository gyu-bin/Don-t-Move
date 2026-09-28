// Shared vertical composition: upper-left character / centred lower menu.
export const HOME_COMPOSITION = {
  designWidth: 390,
  playerRight: 204,
  menuLeftPercent: 14,
  menuWidthPercent: 72,
  playerX: -38,
  playerY: 540,
  playerSize: 188,
} as const;

export function homeComposition(width:number,height:number,insets:{top:number;bottom:number;left:number;right:number},fontScale=1) {
  const usableWidth=width-insets.left-insets.right;
  const bottom=Math.max(insets.bottom,20)+12;
  const usableHeight=height-insets.top-bottom;
  const menuHeight=Math.min(204*Math.min(fontScale,1.5),usableHeight*0.44);
  const menuTop=height-bottom-menuHeight;
  const scale=Math.min(usableWidth/390,(menuTop-insets.top-40)/HOME_COMPOSITION.playerSize);
  const size=HOME_COMPOSITION.playerSize*scale;
  // Reserve a separate lower menu band, leaving the illuminated pedestal
  // exposed. The foreground cutout supports, rather than rivals, the diamond.
  const visualHeight=size*0.90;
  const playerTop=Math.min(menuTop-visualHeight-24,insets.top+usableHeight*0.43);
  const menuWidth=Math.min(320,usableWidth*0.70);
  return {
    playerSize: size*390/width,
    playerHeight: size*844/height,
    playerX:(insets.left+HOME_COMPOSITION.playerX*scale)*390/width,
    playerY:playerTop*844/height,
    playerRight:(insets.left+HOME_COMPOSITION.playerRight*scale)*390/width,
    playerBounds:{x:insets.left,y:playerTop,width:HOME_COMPOSITION.playerRight*scale,height:visualHeight},
    menuTop,menuHeight,
    menuLeft:insets.left+(usableWidth-menuWidth)/2,
    menuWidth,
    menuBottom:bottom,
  };
}
