import{i as e,n as t,o as n,s as r}from"./ui/assets/platforms-CO2-rQIZ.js";import{i,n as a,r as o,t as s}from"./ui/assets/jsxRuntime.module-BqQ1X0-A.js";var c=[`[class*="grid"]`,`[class*="list"]`,`[class*="row"]`,`[data-testid*="card"]`],l=[{pattern:/netflix\.com\/browse/i,hint:`high`},{pattern:/letterboxd\.com/i,hint:`medium`},{pattern:/imdb\.com\/chart/i,hint:`high`},{pattern:/primevideo\.com/i,hint:`medium`}],u=60,d=4,f=.55,p=.78;function m(e){let t=e.getBoundingClientRect();return{width:t.width||e.width||parseInt(e.getAttribute(`width`)||`0`,10)||0,height:t.height||e.height||parseInt(e.getAttribute(`height`)||`0`,10)||0}}function h(e){if(!e.src||e.src.startsWith(`data:`)||e.src.startsWith(`blob:`))return!1;let{width:t,height:n}=m(e);if(t<u||n<=0)return!1;let r=t/n;return r>=f&&r<=p}function g(e){let t=0;for(let n of e.querySelectorAll(`img`))h(n)&&t++;return t}function _(){let e=typeof window<`u`?window.location.href:``;for(let{pattern:t,hint:n}of l)if(t.test(e))return n;return null}function v(e,t){return e<d?null:t===`high`&&e>=d||e>=6?`high`:e>=d&&(t===`medium`||t===`high`)||e>=d?`medium`:null}function ee(e){let t=new Set,n=[];for(let r of c)for(let i of e.querySelectorAll(r))t.has(i)||(t.add(i),n.push(i));return n}function te(e){let t=new Set,n=Array.from(e.querySelectorAll(`img`)).filter(h);for(let r of n){let n=r.parentElement,i=0;for(;n&&n!==e&&i<12;)g(n)>=d&&t.add(n),n=n.parentElement,i++}return Array.from(t)}function y(e){return e.filter(t=>!e.some(e=>e.element!==t.element&&t.element.contains(e.element)&&e.posterCount>=t.posterCount*.75))}function b(e){let t=_(),n=new Set([...ee(e),...te(e)]),r=[];for(let e of n){let n=g(e),i=v(n,t);i&&r.push({element:e,confidence:i,posterCount:n})}return y(r).sort((e,t)=>e.confidence===t.confidence?t.posterCount-e.posterCount:e.confidence===`high`?-1:1)}var x=`data-subsume-id`,S=[{re:/^(.{3,60})\s*\((\d{4})\)$/,titleIdx:1,yearIdx:2},{re:/^(.{3,60})\s*[-–—]\s*(\d{4})$/,titleIdx:1,yearIdx:2},{re:/^(.{3,60})\s*:\s*(\d{4})$/,titleIdx:1,yearIdx:2},{re:/^(.{3,60})\s*\((\d{4})\)\s*[—–-]\s*.+$/,titleIdx:1,yearIdx:2},{re:/^(.{3,60})\s*\([^)]*(?:TV Series|TV Mini Series|TV Movie)\s*(\d{4}).*\)$/i,titleIdx:1,yearIdx:2},{re:/^(.{3,60})\s*\((\d{4})\s+(?:TV series|TV show|Movie|Film).*\)$/i,titleIdx:1,yearIdx:2}],ne=[`netflix`,`prime video`,`amazon prime`,`disney+`,`hulu`,`hbo`,`apple tv`,`hotstar`,`paramount+`,`peacock`],C=[`movie`,`film`,`series`,`tv show`,`television`,`season`,`episode`,`imdb`,`rotten tomatoes`],w=new Set([`SCRIPT`,`STYLE`,`NOSCRIPT`,`IFRAME`,`SVG`,`NAV`,`FOOTER`,`HEADER`,`ASIDE`,`INPUT`,`TEXTAREA`,`SELECT`,`BUTTON`,`CODE`,`PRE`]),T=`nav, footer, header, aside, [role="navigation"], [role="banner"], .nav, .footer, .header, .sidebar, #nav, #footer, #header`;function E(){return`sub-${crypto.randomUUID()}`}function D(e){let t=e.getBoundingClientRect();return t.width>0&&t.height>0}function O(e){return e.closest(T)!==null}function k(e){for(let t of S){let n=e.match(t.re);if(n&&n[t.titleIdx].length>=3)return{title:n[t.titleIdx].trim(),yearGuess:parseInt(n[t.yearIdx],10)}}return null}function A(e){let t=[],n=e.querySelectorAll(`img[alt], img[title]`);for(let e of n){if(e.hasAttribute(x)||!D(e)||O(e))continue;let n=k((e.alt||e.title||``).trim());if(n){let r=E();e.setAttribute(x,r),t.push({element:e,id:r,title:n.title,yearGuess:n.yearGuess})}}return t}function j(e){let t=[],n=e.querySelectorAll(`a`);for(let e of n){if(e.hasAttribute(x)||!D(e)||O(e))continue;let n=(e.textContent||``).trim();if(n.length<3||n.length>80)continue;let r=e.href.toLowerCase(),i=ne.some(e=>r.includes(e)),a=/imdb\.com\/title\//i.test(r);if(i||a){let r=k(n),i=E();e.setAttribute(x,i),t.push({element:e,id:i,title:r?r.title:n,yearGuess:r?r.yearGuess:void 0});continue}let o=(e.parentElement?.textContent||``).toLowerCase();if(C.some(e=>o.includes(e))){let r=k(n);if(r){let n=E();e.setAttribute(x,n),t.push({element:e,id:n,title:r.title,yearGuess:r.yearGuess})}}}return t}function M(e){let t=[],n=e.querySelectorAll(`h1, h2, h3, h4`);for(let e of n){if(e.hasAttribute(x)||!D(e)||O(e))continue;let n=k((e.textContent||``).trim());if(n){let r=(e.parentElement?.textContent||``).toLowerCase();if(C.some(e=>r.includes(e))){let r=E();e.setAttribute(x,r),t.push({element:e,id:r,title:n.title,yearGuess:n.yearGuess})}}}return t}function N(e=document.body){let t=[];return t.push(...A(e)),t.push(...j(e)),t.push(...M(e)),t}var P=null,F=[],I=null;function re(e){let t=new Set(e);return e.filter(e=>{let n=e.parentElement;for(;n;){if(t.has(n))return!1;n=n.parentElement}return!0})}function L(e){if(F.length===0)return;let t=F.filter(e=>document.body.contains(e));if(t=re(t),F=[],I=null,t.length===0)return;let n=[];for(let e of t)n.push(...N(e));n.length>0&&e(n)}var R=`image.tmdb.org/t/p/`,z=[`image.tmdb.org`,`m.media-amazon.com/images`,`static.tvmaze.com/uploads`,`artworks.thetvdb.com`];function B(e,t){if(!e.includes(R))return null;let n=e.split(`/`),r=n[n.length-1];if(!r)return null;let i=r.split(`.`)[0];if(!i||isNaN(parseInt(i,10)))return null;let a=`movie`;if(t){let e=t.closest(`a`);if(e){let t=e.href.toLowerCase();t.includes(`/movie/`)?a=`movie`:t.includes(`/tv/`)&&(a=`tv`)}}return{tmdbId:i,mediaType:a}}function V(e,t=!1){if(!e.src||e.src.startsWith(`data:`)||e.src.startsWith(`blob:`)||w.has(e.tagName)||O(e)||e.hasAttribute(`data-subsume-poster-scanned`))return!1;if(t&&h(e)||z.some(t=>e.src.includes(t)))return!0;let n=(e.alt||``).trim(),r=n.split(/\s+/).filter(Boolean);if(r.length>=3&&/^.+\(\d{4}\)$/.test(n))return!0;if(r.length>=2){let t=e.parentElement,r=0;for(;t&&r<2;){if(t.textContent&&t.textContent.includes(n))return!0;t=t.parentElement,r++}}let i=e.getBoundingClientRect(),a=i.width||e.width,o=i.height||e.height;return a>=80&&o>=100&&n.length>=4}async function H(e,t,i=document.body,a={}){let o=a.catalogMode??!1,s=Array.from(i.querySelectorAll(`img`));i instanceof HTMLImageElement&&s.unshift(i);let c=s.filter(e=>V(e,o));if(c.length!==0)for(let i=0;i<c.length;i+=5){let a=c.slice(i,i+5);await Promise.all(a.map(async i=>{i.setAttribute(`data-subsume-poster-scanned`,`pending`);let a=i.src.includes(R),s=(i.alt||``).trim(),c=/^.+\(\d{4}\)$/.test(s),l=null;if(a?l=`tmdb-cdn`:o&&s?l=`alt-text`:o?l=`ancestor-text`:e===`medium`&&c?l=`alt-text`:e===`high`&&(l=s?`alt-text`:`ancestor-text`),!l){i.setAttribute(`data-subsume-poster-scanned`,`skip`);return}try{let e=null;if(l===`tmdb-cdn`){let t=B(i.src,i);if(!t){i.setAttribute(`data-subsume-poster-scanned`,`skip`);return}e=await n(r.RESOLVE_POSTER,{strategy:`tmdb-cdn`,tmdbId:t.tmdbId,mediaType:t.mediaType})}else if(l===`alt-text`)e=await n(r.RESOLVE_POSTER,{strategy:`alt-text`,query:s});else if(l===`ancestor-text`){let t=i.parentElement,a=0,o=``;for(;t&&a<2;){let e=(t.textContent||``).trim();e&&(!o||e.length<o.length)&&(o=e),t=t.parentElement,a++}let s=o.slice(0,60).trim(),c=s.split(/\s+/).filter(e=>e.length>1).length;if(!s||c<2){i.setAttribute(`data-subsume-poster-scanned`,`skip`);return}e=await n(r.RESOLVE_POSTER,{strategy:`ancestor-text`,query:s})}e&&e.success&&e.data&&e.data.match?(i.setAttribute(`data-subsume-poster-scanned`,`matched`),i.setAttribute(`data-subsume-poster-id`,e.data.match.tmdbId),t(i,e.data.match)):i.setAttribute(`data-subsume-poster-scanned`,`skip`)}catch(e){console.error(`[Subsume] Failed to resolve poster image:`,e),i.setAttribute(`data-subsume-poster-scanned`,`skip`)}})),i+5<c.length&&await new Promise(e=>setTimeout(e,50))}}var U=null,W=`medium`,G=!1,K=null;function q(e,t,n=!1){W=e,U=t,G=n}function J(e){P||(P=new MutationObserver(t=>{let n=!1;for(let e of t)for(let t of e.addedNodes)t instanceof Element&&!w.has(t.tagName)&&(F.push(t),n=!0);n&&(I&&clearTimeout(I),I=setTimeout(()=>{L(e)},150));let r=[];for(let e of t)for(let t of e.addedNodes)(t.nodeName===`IMG`&&t instanceof HTMLImageElement||t instanceof Element&&t.querySelector(`img`))&&r.push(t);r.length>0&&U&&(K&&clearTimeout(K),K=setTimeout(()=>{Promise.all(r.map(e=>H(W,U,e,{catalogMode:G}).catch(e=>{console.error(`[Subsume] Debounced scanImages failed:`,e)})))},500))}),P.observe(document.body,{childList:!0,subtree:!0}))}function Y(e){let t=e.getBoundingClientRect(),n=t.bottom+12+window.scrollY,r=t.left+window.scrollX;return r+340>window.innerWidth&&(r=window.innerWidth-340-16),r<8&&(r=8),t.bottom+12+380>window.innerHeight&&(n=t.top-380-12+window.scrollY),{top:n,left:r}}function X({mediaItem:e,loading:n,position:r,visible:a,inLibrary:o,libraryItem:c,onAdd:l,onRemove:u,onMouseEnter:d,onMouseLeave:f}){if(!a)return null;let p=e?.ratings.find(e=>e.provider===`imdb`),m=e?.ratings.find(e=>e.provider===`rt`);return s(`div`,{className:`subsume-hover-card ${a?`subsume-visible`:``}`,style:{top:`${r.top}px`,left:`${r.left}px`},onMouseEnter:d,onMouseLeave:f,children:n?s(`div`,{className:`subsume-loading`,children:[s(`div`,{className:`subsume-spinner`}),s(`span`,{children:`Loading details…`})]}):e?s(i,{children:[s(`div`,{className:`subsume-card-header`,children:[s(`div`,{className:`subsume-poster`,children:e.posterUrl?s(`img`,{src:e.posterUrl,alt:e.canonicalTitle}):s(`div`,{className:`subsume-poster-placeholder`,children:s(`svg`,{width:`32`,height:`32`,viewBox:`0 0 24 24`,fill:`none`,stroke:`currentColor`,"stroke-width":`1.5`,children:[s(`rect`,{x:`2`,y:`3`,width:`20`,height:`18`,rx:`2`}),s(`path`,{d:`M7 3v18M17 3v18M2 9h5M17 9h5M2 15h5M17 15h5`})]})})}),s(`div`,{className:`subsume-card-info`,children:[s(`h3`,{className:`subsume-title`,children:e.canonicalTitle}),s(`div`,{className:`subsume-meta`,children:[s(`span`,{className:`subsume-year`,children:e.year}),e.runtimeMinutes&&s(`span`,{className:`subsume-runtime`,children:[e.runtimeMinutes,` min`]}),s(`span`,{className:`subsume-type-badge`,children:e.type===`tv`?`TV Show`:`Movie`})]})]})]}),s(`div`,{className:`subsume-ratings`,children:[p&&s(`div`,{className:`subsume-rating-chip subsume-imdb`,children:[s(`span`,{className:`subsume-rating-icon`,children:`⭐`}),s(`span`,{className:`subsume-rating-label`,children:`IMDb`}),s(`span`,{className:`subsume-rating-value`,children:[p.score,`/10`]})]}),m&&s(`div`,{className:`subsume-rating-chip subsume-rt`,children:[s(`span`,{className:`subsume-rating-icon`,children:`🍅`}),s(`span`,{className:`subsume-rating-label`,children:`RT`}),s(`span`,{className:`subsume-rating-value`,children:[m.score,`%`]})]})]}),e.streamingAvailability&&e.streamingAvailability.length>0&&s(`div`,{className:`subsume-platforms`,children:e.streamingAvailability.slice(0,3).map((e,n)=>s(`span`,{className:`subsume-platform-tag`,children:t(e.platform)},`${e.platform}-${n}`))}),s(`div`,{className:`subsume-genres`,children:e.genres.map(e=>s(`span`,{className:`subsume-genre-tag`,children:e},e))}),e.overview&&s(`p`,{className:`subsume-overview`,children:e.overview}),o&&c&&s(`div`,{className:`subsume-library-status-bar`,children:[s(`div`,{className:`subsume-library-status-left`,children:[s(`span`,{className:`subsume-library-label`,children:`Status`}),s(`span`,{className:`subsume-status-badge status-${c.status}`,children:c.status===`to-watch`?`To Watch`:c.status===`watching`?`Watching`:c.status===`watched`?`Watched`:`Abandoned`})]}),c.userRating!==void 0&&s(`div`,{className:`subsume-library-status-right`,children:[s(`span`,{className:`subsume-library-label`,children:`My Rating`}),s(`span`,{className:`subsume-user-rating-badge`,children:[s(`span`,{className:`subsume-star`,children:`★`}),` `,c.userRating,`/10`]})]})]}),s(`div`,{className:`subsume-actions`,children:o?s(`button`,{className:`subsume-btn subsume-btn-danger`,onClick:u,children:[s(`svg`,{width:`14`,height:`14`,viewBox:`0 0 24 24`,fill:`none`,stroke:`currentColor`,"stroke-width":`2`,children:[s(`polyline`,{points:`3 6 5 6 21 6`}),s(`path`,{d:`M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2`})]}),`Remove`]}):s(i,{children:[s(`button`,{className:`subsume-btn subsume-btn-primary`,onClick:()=>l(`movie`),children:[s(`svg`,{width:`14`,height:`14`,viewBox:`0 0 24 24`,fill:`none`,stroke:`currentColor`,"stroke-width":`2`,children:[s(`line`,{x1:`12`,y1:`5`,x2:`12`,y2:`19`}),s(`line`,{x1:`5`,y1:`12`,x2:`19`,y2:`12`})]}),`Add to Movies`]}),s(`button`,{className:`subsume-btn subsume-btn-secondary`,onClick:()=>l(`tv`),children:[s(`svg`,{width:`14`,height:`14`,viewBox:`0 0 24 24`,fill:`none`,stroke:`currentColor`,"stroke-width":`2`,children:[s(`line`,{x1:`12`,y1:`5`,x2:`12`,y2:`19`}),s(`line`,{x1:`5`,y1:`12`,x2:`19`,y2:`12`})]}),`Add to TV Shows`]})]})})]}):s(`div`,{className:`subsume-error`,children:`Could not load details`})})}var ie=class{container;shadowRoot;currentTarget=null;showTimeout=null;hideTimeout=null;isCardHovered=!1;libraryItems=new Map;constructor(){this.container=document.createElement(`div`),this.container.id=`subsume-hover-root`,this.shadowRoot=this.container.attachShadow({mode:`open`});let e=document.createElement(`style`);e.textContent=ae,this.shadowRoot.appendChild(e);let t=document.createElement(`div`);t.id=`subsume-mount`,this.shadowRoot.appendChild(t),document.body.appendChild(this.container),this.setupSyncListener()}libraryCacheInitialized=!1;async initLibraryCache(){try{let e=await n(r.GET_LIBRARY,{});e.success&&e.data&&(this.libraryItems=new Map(e.data.map(e=>[e.library.mediaId,e.library])))}catch(e){console.error(`[Subsume] Failed to initialize library cache:`,e)}}setupSyncListener(){chrome.runtime.onMessage.addListener((e,t)=>{if(t.id===chrome.runtime.id&&e&&e.type===`LIBRARY_UPDATED`){let t=e.libraryItem,n=e.mediaId||t?.mediaId;if(!n)return;e.action===`add`&&t||e.action===`update`&&t?this.libraryItems.set(n,t):e.action===`remove`&&this.libraryItems.delete(n)}})}attachToElement(e,t,n){this.libraryCacheInitialized||(this.libraryCacheInitialized=!0,this.initLibraryCache()),e.addEventListener(`mouseenter`,()=>{this.scheduleShow(e,t,n)}),e.addEventListener(`mouseleave`,()=>{this.scheduleHide()})}scheduleShow(e,t,n){this.cancelHide(),this.showTimeout=setTimeout(()=>{this.currentTarget=e,this.showCard(e,t,n)},300)}scheduleHide(){this.cancelShow(),this.hideTimeout=setTimeout(()=>{this.isCardHovered||this.hideCard()},200)}cancelShow(){this.showTimeout&&=(clearTimeout(this.showTimeout),null)}cancelHide(){this.hideTimeout&&=(clearTimeout(this.hideTimeout),null)}async showCard(e,t,i){let o=this.shadowRoot.getElementById(`subsume-mount`);if(!o)return;let c=Y(e);a(s(X,{mediaItem:null,loading:!0,position:c,visible:!0,inLibrary:!1,libraryItem:null,onAdd:()=>{},onRemove:()=>{},onMouseEnter:()=>{this.isCardHovered=!0,this.cancelHide()},onMouseLeave:()=>{this.isCardHovered=!1,this.scheduleHide()}}),o);try{let l=await n(r.GET_TITLE_DETAILS,{title:t,yearGuess:i});if(this.currentTarget!==e)return;let u=l.success?l.data??null:null,d=u&&this.libraryItems.get(u.id)||null;a(s(X,{mediaItem:u,loading:!1,position:c,visible:!0,inLibrary:d!==null,libraryItem:d,onAdd:e=>this.handleAdd(u,e),onRemove:()=>this.handleRemove(u),onMouseEnter:()=>{this.isCardHovered=!0,this.cancelHide()},onMouseLeave:()=>{this.isCardHovered=!1,this.scheduleHide()}}),o)}catch(t){console.error(`[Subsume] Failed to fetch title details:`,t),a(s(X,{mediaItem:null,loading:!1,position:Y(e),visible:!0,inLibrary:!1,libraryItem:null,onAdd:()=>{},onRemove:()=>{},onMouseEnter:()=>{this.isCardHovered=!0,this.cancelHide()},onMouseLeave:()=>{this.isCardHovered=!1,this.scheduleHide()}}),o)}}hideCard(){let e=this.shadowRoot.getElementById(`subsume-mount`);e&&a(s(X,{mediaItem:null,loading:!1,position:{top:0,left:0},visible:!1,inLibrary:!1,libraryItem:null,onAdd:()=>{},onRemove:()=>{},onMouseEnter:()=>{},onMouseLeave:()=>{}}),e),this.currentTarget=null}async handleAdd(e,t){try{await n(r.ADD_TO_LIST,{mediaItem:{...e,type:t},type:t});let i=this.shadowRoot.getElementById(`subsume-mount`);i&&(a(s(`div`,{className:`subsume-hover-card subsume-visible subsume-added`,children:s(`div`,{className:`subsume-added-msg`,children:[s(`svg`,{width:`24`,height:`24`,viewBox:`0 0 24 24`,fill:`none`,stroke:`currentColor`,"stroke-width":`2`,children:s(`path`,{d:`M20 6L9 17l-5-5`})}),s(`span`,{children:[`Added to `,t===`movie`?`Movies`:`TV Shows`,`!`]})]})}),i),setTimeout(()=>this.hideCard(),1200))}catch(e){console.error(`[Subsume] Failed to add to list:`,e)}}async handleRemove(e){try{await n(r.REMOVE_FROM_LIBRARY,{mediaId:e.id});let t=this.shadowRoot.getElementById(`subsume-mount`);t&&(a(s(`div`,{className:`subsume-hover-card subsume-visible subsume-added`,children:s(`div`,{className:`subsume-added-msg`,children:[s(`svg`,{width:`24`,height:`24`,viewBox:`0 0 24 24`,fill:`none`,stroke:`currentColor`,"stroke-width":`2`,children:s(`path`,{d:`M20 6L9 17l-5-5`})}),s(`span`,{children:`Removed from library!`})]})}),t),setTimeout(()=>this.hideCard(),1200))}catch(e){console.error(`[Subsume] Failed to remove from library:`,e)}}},ae=`
  :host {
    all: initial;
  }

  .subsume-hover-card {
    position: absolute;
    z-index: 2147483647;
    width: 340px;
    padding: 16px;
    background: linear-gradient(135deg, rgba(10, 10, 11, 0.98), rgba(26, 26, 28, 0.98));
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border: 1px solid rgba(201, 168, 76, 0.15);
    border-radius: 16px;
    box-shadow:
      0 8px 32px rgba(0, 0, 0, 0.6),
      0 0 0 1px rgba(255, 255, 255, 0.03) inset;
    font-family: 'Geist', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    color: #e8e6e1;
    opacity: 0;
    transform: translateY(8px) scale(0.96);
    transition: opacity 0.25s cubic-bezier(0.16, 1, 0.3, 1), transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    pointer-events: none;
  }

  .subsume-hover-card.subsume-visible {
    opacity: 1;
    transform: translateY(0) scale(1);
    pointer-events: auto;
  }

  /* Loading */
  .subsume-loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
    padding: 32px 0;
    color: rgba(232, 230, 225, 0.45);
    font-size: 13px;
  }

  .subsume-spinner {
    width: 24px;
    height: 24px;
    border: 2px solid rgba(201, 168, 76, 0.1);
    border-top-color: #c9a84c;
    border-radius: 50%;
    animation: subsume-spin 0.8s linear infinite;
  }

  @keyframes subsume-spin {
    to { transform: rotate(360deg); }
  }

  /* Header */
  .subsume-card-header {
    display: flex;
    gap: 14px;
    margin-bottom: 12px;
  }

  .subsume-poster {
    flex-shrink: 0;
    width: 72px;
    height: 108px;
    border-radius: 10px;
    overflow: hidden;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.05);
  }

  .subsume-poster img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .subsume-poster-placeholder {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: rgba(232, 230, 225, 0.15);
  }

  .subsume-card-info {
    flex: 1;
    min-width: 0;
  }

  .subsume-title {
    margin: 0 0 6px;
    font-size: 16px;
    font-weight: 700;
    color: #fff;
    line-height: 1.3;
    overflow: hidden;
    text-overflow: ellipsis;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
  }

  .subsume-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    font-size: 12px;
    color: rgba(232, 230, 225, 0.45);
  }

  .subsume-type-badge {
    background: rgba(201, 168, 76, 0.12);
    color: #c9a84c;
    padding: 1px 8px;
    border-radius: 4px;
    font-weight: 600;
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  /* Ratings */
  .subsume-ratings {
    display: flex;
    gap: 10px;
    margin-bottom: 10px;
  }

  .subsume-rating-chip {
    display: flex;
    align-items: center;
    gap: 5px;
    padding: 5px 10px;
    border-radius: 8px;
    font-size: 12px;
    font-weight: 600;
  }

  .subsume-imdb {
    background: rgba(245, 197, 24, 0.08);
    border: 1px solid rgba(245, 197, 24, 0.15);
  }

  .subsume-rt {
    background: rgba(250, 50, 10, 0.08);
    border: 1px solid rgba(250, 50, 10, 0.15);
  }

  .subsume-rating-icon {
    font-size: 13px;
  }

  .subsume-rating-label {
    color: rgba(232, 230, 225, 0.4);
    font-weight: 500;
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .subsume-rating-value {
    color: #fff;
  }

  /* Streaming platforms */
  .subsume-platforms {
    display: flex;
    flex-wrap: wrap;
    gap: 5px;
    margin-bottom: 10px;
  }

  .subsume-platform-tag {
    padding: 3px 8px;
    background: rgba(201, 168, 76, 0.1);
    border: 1px solid rgba(201, 168, 76, 0.2);
    border-radius: 8px;
    font-size: 10px;
    font-weight: 600;
    color: #c9a84c;
  }

  /* Genres */
  .subsume-genres {
    display: flex;
    flex-wrap: wrap;
    gap: 5px;
    margin-bottom: 12px;
  }

  .subsume-genre-tag {
    padding: 3px 10px;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 12px;
    font-size: 11px;
    color: rgba(232, 230, 225, 0.55);
    font-weight: 500;
  }

  /* Overview */
  .subsume-overview {
    margin: 0 0 12px;
    font-size: 12px;
    line-height: 1.5;
    color: rgba(232, 230, 225, 0.5);
    overflow: hidden;
    text-overflow: ellipsis;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
  }

  /* Library Status Bar */
  .subsume-library-status-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 12px;
    background: rgba(201, 168, 76, 0.05);
    border: 1px solid rgba(201, 168, 76, 0.12);
    border-radius: 12px;
    margin-bottom: 14px;
  }

  .subsume-library-status-left,
  .subsume-library-status-right {
    display: flex;
    flex-direction: column;
    gap: 3px;
  }

  .subsume-library-label {
    font-size: 9px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: rgba(232, 230, 225, 0.4);
    font-weight: 600;
  }

  .subsume-status-badge {
    font-size: 12px;
    font-weight: 600;
  }

  .subsume-status-badge.status-to-watch {
    color: #9e9a90;
  }

  .subsume-status-badge.status-watching {
    color: #c9a84c;
  }

  .subsume-status-badge.status-watched {
    color: #34d399;
  }

  .subsume-status-badge.status-abandoned {
    color: #fca5a5;
  }

  .subsume-user-rating-badge {
    font-size: 12px;
    font-weight: 700;
    color: #c9a84c;
    display: flex;
    align-items: center;
    gap: 3px;
  }

  .subsume-star {
    color: #c9a84c;
  }

  /* Actions */
  .subsume-actions {
    display: flex;
    gap: 8px;
  }

  .subsume-btn {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 8px 12px;
    border: none;
    border-radius: 10px;
    font-size: 12px;
    font-weight: 600;
    font-family: inherit;
    cursor: pointer;
    transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  }

  .subsume-btn:active {
    transform: scale(0.97);
  }

  .subsume-btn-primary {
    background: linear-gradient(135deg, #c9a84c, #d4b860);
    color: #0a0a0b;
    box-shadow: 0 4px 12px rgba(201, 168, 76, 0.15);
  }

  .subsume-btn-primary:hover {
    background: linear-gradient(135deg, #d4b860, #e2cb7c);
    transform: translateY(-1px);
    box-shadow: 0 6px 18px rgba(201, 168, 76, 0.3);
  }

  .subsume-btn-secondary {
    background: rgba(255, 255, 255, 0.04);
    color: rgba(232, 230, 225, 0.8);
    border: 1px solid rgba(255, 255, 255, 0.08);
  }

  .subsume-btn-secondary:hover {
    background: rgba(255, 255, 255, 0.08);
    border-color: rgba(201, 168, 76, 0.25);
    color: #fff;
    transform: translateY(-1px);
  }

  .subsume-btn-danger {
    flex: 1;
    background: rgba(239, 68, 68, 0.1);
    color: #fca5a5;
    border: 1px solid rgba(239, 68, 68, 0.2);
  }

  .subsume-btn-danger:hover {
    background: rgba(239, 68, 68, 0.18);
    transform: translateY(-1px);
    border-color: rgba(239, 68, 68, 0.3);
  }

  /* Added confirmation */
  .subsume-added {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 80px;
  }

  .subsume-added-msg {
    display: flex;
    align-items: center;
    gap: 10px;
    color: #34d399;
    font-size: 15px;
    font-weight: 600;
  }

  /* Error */
  .subsume-error {
    text-align: center;
    padding: 24px;
    color: rgba(232, 230, 225, 0.35);
    font-size: 13px;
  }

  @media (prefers-reduced-motion: reduce) {
    .subsume-hover-card {
      transition: none;
    }
    .subsume-spinner {
      animation: none;
      border-top-color: #c9a84c;
    }
    .subsume-btn,
    .subsume-btn-primary,
    .subsume-btn-secondary {
      transition: none;
    }
    .subsume-btn:active,
    .subsume-btn-primary:hover,
    .subsume-btn-secondary:hover {
      transform: none;
    }
  }
`,Z=`data-subsume-badge`,Q=`subsume-poster-wrap`,oe=[`imdb`,`tmdb`,`rt`];function se(e){if(!e||!Array.isArray(e))return null;for(let t of oe){let n=e.find(e=>e.provider===t);if(n&&typeof n.score==`number`&&n.score>0)return{provider:t,score:n.score>10?n.score/10:n.score}}return null}function ce(e){let t=e.parentElement;if(t?.classList.contains(Q))return t;let n=document.createElement(`span`);return n.className=Q,n.style.cssText=`position:relative;display:inline-block;line-height:0;vertical-align:top;`,e.parentNode?.insertBefore(n,e),n.appendChild(e),n}function le({match:e,onReflect:t}){let n=se(e.ratings),r=`8.4`;return n&&n.score>0&&(r=n.score.toFixed(1)),o(`div`,{className:`subsume-plaque-root`},o(`div`,{className:`museum-plaque`,onClick:e=>{e.preventDefault(),e.stopPropagation(),t()},title:`Reflect on this title`},[o(`span`,{className:`plaque-score`},`★ ${r}`),o(`span`,{className:`plaque-reveal`},[o(`span`,{className:`plaque-separator`},`│`),o(`span`,{className:`plaque-action`},`Reflect`)])]))}var ue=`
  :host {
    all: initial;
    position: absolute;
    inset: 0;
    pointer-events: none;
    z-index: 2147483646;
    --bg-plaque: hsla(240, 15%, 11%, 0.85);
    --text-artwork: hsl(0, 0%, 82%);
    --border-restraint: hsla(0, 0%, 100%, 0.08);
    --font-editorial: 'Newsreader', 'Cormorant Garamond', Georgia, serif;
    --font-ui: 'Outfit', 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    font-family: var(--font-ui);
  }

  .subsume-plaque-root {
    position: absolute;
    inset: 0;
    pointer-events: none;
  }

  .museum-plaque {
    position: absolute;
    bottom: 8px;
    right: 8px;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    border-radius: 8px;
    background: var(--bg-plaque);
    color: var(--text-artwork);
    border: 1px solid var(--border-restraint);
    backdrop-filter: blur(8px);
    box-shadow: 0 4px 14px rgba(0, 0, 0, 0.45);
    font-family: var(--font-ui);
    font-size: 12px;
    font-weight: 500;
    line-height: 1;
    letter-spacing: 0.02em;
    cursor: pointer;
    pointer-events: auto;
    transition: all 450ms cubic-bezier(0.16, 1, 0.3, 1);
    overflow: hidden;
    white-space: nowrap;
  }

  .museum-plaque:hover {
    background: hsla(240, 15%, 16%, 0.95);
    color: hsl(0, 0%, 96%);
    border-color: hsla(0, 0%, 100%, 0.2);
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.55);
    transform: translateY(-1px);
  }

  .plaque-score {
    display: inline-block;
    color: hsl(0, 0%, 96%);
    font-weight: 600;
  }

  .plaque-reveal {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    max-width: 0;
    opacity: 0;
    transition: all 450ms cubic-bezier(0.16, 1, 0.3, 1);
    overflow: hidden;
  }

  .museum-plaque:hover .plaque-reveal {
    max-width: 120px;
    opacity: 1;
  }

  .plaque-separator {
    opacity: 0.4;
  }

  .plaque-action {
    font-family: var(--font-editorial);
    font-size: 13px;
    font-weight: 600;
    color: hsl(0, 0%, 96%);
  }

  @media (prefers-reduced-motion: reduce) {
    .museum-plaque, .plaque-reveal {
      transition: none;
    }
    .museum-plaque:hover {
      transform: none;
    }
  }
`,de=class{badges=new Map;libraryIds=new Set;syncListener=null;constructor(){this.setupSyncListener()}setupSyncListener(){typeof chrome>`u`||!chrome.runtime?.onMessage||(this.syncListener=(e,t)=>{if(t.id!==chrome.runtime.id||!e||typeof e!=`object`||!(`type`in e)||e.type!==`LIBRARY_UPDATED`)return;let n=e,r=typeof n.mediaId==`string`?n.mediaId:typeof n.libraryItem?.mediaId==`string`?n.libraryItem.mediaId:void 0;if(r){n.action===`add`||n.action===`update`?this.libraryIds.add(r):n.action===`remove`&&this.libraryIds.delete(r);for(let e of this.badges.values())e.mediaId===r&&(e.inLibrary=n.action!==`remove`,this.renderBadge(e))}},chrome.runtime.onMessage.addListener(this.syncListener))}destroy(){this.syncListener&&typeof chrome<`u`&&chrome.runtime?.onMessage&&(chrome.runtime.onMessage.removeListener(this.syncListener),this.syncListener=null);for(let[e,t]of this.badges.entries())a(null,t.mount),t.host.remove(),e.removeAttribute(Z);this.badges.clear(),this.libraryIds.clear()}async initLibraryCache(){try{let e=await n(r.GET_LIBRARY,{});if(e.success&&e.data){this.libraryIds=new Set(e.data.map(e=>e.library.mediaId));for(let e of this.badges.values())e.inLibrary=this.libraryIds.has(e.mediaId),this.renderBadge(e)}}catch(t){e.warn(`[Subsume] Failed to load library cache for museum plaques:`,t)}}attachBadge(e,t){if(e.hasAttribute(Z))return;let n=`tmdb_${t.type}_${t.tmdbId}`,r=ce(e),i=document.createElement(`div`);i.setAttribute(Z,`true`),i.style.cssText=`position:absolute;inset:0;pointer-events:none;`,r.appendChild(i);let a=i.attachShadow({mode:`open`}),o=document.createElement(`style`);o.textContent=ue,a.appendChild(o);let s=document.createElement(`div`);a.appendChild(s);let c={match:t,inLibrary:t.inLibrary||this.libraryIds.has(n),host:i,shadowRoot:a,mount:s,mediaId:n};e.setAttribute(Z,`true`),this.badges.set(e,c),this.renderBadge(c)}renderBadge(e){a(o(le,{match:e.match,inLibrary:e.inLibrary,onReflect:()=>this.handleReflect(e)}),e.mount)}handleReflect(t){window.dispatchEvent(new CustomEvent(`OPEN_CAPTURE_CANVAS`,{detail:{mediaId:t.mediaId,match:t.match}})),n(r.OPEN_CAPTURE_CANVAS,{mediaId:t.mediaId,match:t.match}).catch(t=>{e.warn(`[Subsume] OPEN_CAPTURE_CANVAS message dispatch:`,t)})}},fe=`data-subsume-dock`,pe=`
  :host {
    all: initial;
    position: fixed;
    bottom: 24px;
    right: 24px;
    z-index: 2147483647;
    --bg-dock: hsl(220, 15%, 10%);
    --border-gold: hsla(43, 45%, 55%, 0.35);
    --border-gold-hover: hsla(43, 45%, 55%, 0.65);
    --text-primary: hsl(0, 0%, 94%);
    --text-muted: hsl(0, 0%, 65%);
    --font-editorial: 'Newsreader', Georgia, serif;
    --font-ui: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  }

  .dock-container {
    font-family: var(--font-ui);
  }

  .dock-toggle-btn {
    background: var(--bg-dock);
    color: var(--text-primary);
    border: 1px solid var(--border-gold);
    padding: 10px 18px;
    border-radius: 20px;
    font-family: var(--font-editorial);
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.45);
    transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .dock-toggle-btn:hover {
    border-color: var(--border-gold-hover);
    transform: translateY(-1px);
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.55);
  }

  .dock-card {
    background: var(--bg-dock);
    border: 1px solid var(--border-gold);
    border-radius: 12px;
    width: 320px;
    padding: 16px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .dock-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .dock-title {
    font-family: var(--font-editorial);
    font-size: 16px;
    font-weight: 600;
    color: var(--text-primary);
  }

  .dock-collapse-btn {
    background: none;
    border: none;
    color: var(--text-muted);
    cursor: pointer;
    font-size: 14px;
    padding: 4px;
  }

  .dock-collapse-btn:hover {
    color: var(--text-primary);
  }

  .dock-subtitle {
    font-size: 12px;
    color: var(--text-muted);
    line-height: 1.4;
  }

  .dock-textarea {
    width: 100%;
    height: 120px;
    background: hsla(220, 15%, 7%, 0.8);
    border: 1px solid hsla(43, 45%, 55%, 0.2);
    border-radius: 8px;
    padding: 10px;
    color: var(--text-primary);
    font-family: var(--font-editorial);
    font-size: 14px;
    resize: vertical;
    box-sizing: border-box;
  }

  .dock-textarea:focus {
    outline: none;
    border-color: var(--border-gold-hover);
  }

  .dock-footer {
    display: flex;
    justify-content: flex-end;
  }

  .dock-save-btn {
    background: hsla(43, 45%, 55%, 0.15);
    color: var(--text-primary);
    border: 1px solid var(--border-gold);
    padding: 6px 14px;
    border-radius: 6px;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .dock-save-btn:hover {
    background: hsla(43, 45%, 55%, 0.25);
    border-color: var(--border-gold-hover);
  }
`,me=class{container=null;shadowRoot=null;mountPoint=null;isExpandedState=!1;boundOnToggle;boundOnSave;constructor(){this.boundOnToggle=e=>{e.preventDefault(),e.stopPropagation(),this.toggle()},this.boundOnSave=e=>{e.preventDefault(),e.stopPropagation(),this.saveNotes()}}buildCard(){let e=document.createElement(`div`);e.className=`dock-card`;let t=document.createElement(`div`);t.className=`dock-header`;let n=document.createElement(`span`);n.className=`dock-title`,n.textContent=`Auteur Reflection Dock`;let r=document.createElement(`button`);r.className=`dock-collapse-btn`,r.textContent=`✕`,r.addEventListener(`click`,this.boundOnToggle),t.appendChild(n),t.appendChild(r);let i=document.createElement(`div`);i.className=`dock-subtitle`,i.textContent=`Poetic sanctuary reflection notes for this page`;let a=document.createElement(`textarea`);a.className=`dock-textarea`,a.placeholder=`Record your reflections...`;let o=document.createElement(`div`);o.className=`dock-footer`;let s=document.createElement(`button`);return s.className=`dock-save-btn`,s.textContent=`Save`,s.addEventListener(`click`,this.boundOnSave),o.appendChild(s),e.appendChild(t),e.appendChild(i),e.appendChild(a),e.appendChild(o),e}get isExpanded(){return this.isExpandedState}get shadow(){return this.shadowRoot}get host(){return this.container}mount(){if(this.container)return;this.container=document.createElement(`div`),this.container.setAttribute(fe,`true`),this.container.style.cssText=`position:fixed;bottom:24px;right:24px;z-index:2147483647;`,document.body.appendChild(this.container),this.shadowRoot=this.container.attachShadow({mode:`open`});let t=document.createElement(`style`);t.textContent=pe,this.shadowRoot.appendChild(t),this.mountPoint=document.createElement(`div`),this.mountPoint.className=`dock-container`,this.shadowRoot.appendChild(this.mountPoint),this.render(),e.log(`[Subsume] Mounted Auteur Screenplay Dock.`)}destroy(){this.mountPoint&&=(this.mountPoint.innerHTML=``,null),this.container&&=(this.container.remove(),null),this.shadowRoot=null,this.isExpandedState=!1,this.boundOnToggle=null,this.boundOnSave=null,e.log(`[Subsume] Destroyed Auteur Screenplay Dock.`)}toggle(){this.isExpandedState=!this.isExpandedState,this.render()}render(){if(this.mountPoint)if(this.mountPoint.innerHTML=``,this.isExpandedState)this.mountPoint.appendChild(this.buildCard());else{let e=document.createElement(`button`);e.className=`dock-toggle-btn`,e.textContent=`✦ Reflection Dock`,e.addEventListener(`click`,this.boundOnToggle),this.mountPoint.appendChild(e)}}saveNotes(){if(!this.shadowRoot)return;let t=this.shadowRoot.querySelector(`textarea`);if(!t)return;let i=t.value,a=`page_`+window.location.hostname;n(r.SET_USER_NOTES,{mediaId:a,notes:i}).then(t=>{t.success?(e.log(`[Subsume] Successfully saved auteur reflection notes.`),this.toggle()):e.warn(`[Subsume] Failed to save reflection notes:`,t.error)}).catch(t=>{e.error(`[Subsume] Error sending SET_USER_NOTES message:`,t)})}};async function $(){e.log(`[Subsume] Content script loaded.`);let t=window.location.hostname,i=await n(r.GET_CONTENT_PREFS,{hostname:t}),a=i.success?i.data:null,o=a?.hoverCardsEnabled??!0,s=a?.posterOverlaysEnabled??!0,c=a?.screenplayDockEnabled??!0,l=a?.detectionSensitivity||`medium`;if(a?.domainDisabled){e.log(`[Subsume] Domain ${t} is blacklisted. Exiting.`);return}if(!o&&!s&&!c){e.log(`[Subsume] Page scanning and dock disabled in preferences. Exiting.`);return}let u=null,d=null,f=null;c&&(f=new me,f.mount());let p=b(document.body).filter(e=>e.confidence===`high`),m=p.length>0;if(s){d=new de,d.initLibraryCache();let t=(e,t)=>{d?.attachBadge(e,t)};q(l,t,m),(async()=>{if(m){e.log(`[Subsume] Catalog page detected (${p.length} region(s)); prioritizing poster scan.`);for(let e of p)await H(l,t,e.element,{catalogMode:!0})}await H(l,t,document.body,{catalogMode:m})})().catch(t=>{e.error(`[Subsume] Initial poster scan failed:`,t)})}if(o){u=new ie;let t=e=>{for(let t of e)u.attachToElement(t.element,t.title,t.yearGuess)},n=N();n.length>0&&(e.log(`[Subsume] Found ${n.length} title(s) on page.`),t(n)),J(n=>{e.log(`[Subsume] Found ${n.length} new title(s) via mutation.`),t(n)})}else s&&J(()=>{})}document.readyState===`loading`?document.addEventListener(`DOMContentLoaded`,$):$();