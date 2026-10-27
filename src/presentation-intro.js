import './style.css';
import './refinement.css';
import './presentation-intro.css';
import {setupBudgetSlideshow,setupVideoControls} from './modules/slideshow.js';
setupBudgetSlideshow();setupVideoControls();
let frame;
function reportSize(){cancelAnimationFrame(frame);frame=requestAnimationFrame(()=>parent.postMessage({type:'marble:intro-height',height:Math.ceil(document.body.getBoundingClientRect().height)},location.origin));}
new ResizeObserver(reportSize).observe(document.body);
reportSize();
window.addEventListener('message',event=>{if(event.origin!==location.origin||event.source!==parent)return;if(event.data?.type==='marble:pause'){document.getAnimations().forEach(a=>event.data.paused?a.pause():a.play());const pause=document.getElementById('slidePause');if(event.data.paused&&pause?.dataset.state==='playing')pause.click();document.querySelectorAll('video').forEach(v=>{if(event.data.paused)v.pause();});}});

new MutationObserver(()=>parent.postMessage({type:"marble:slide-change"},location.origin)).observe(document.querySelector(".slideshow-container"),{subtree:true,attributes:true,attributeFilter:["aria-hidden"]});
