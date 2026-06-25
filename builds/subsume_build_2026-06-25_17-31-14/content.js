import{a as e,n as t,o as n}from"./ui/assets/platforms-BfO_ht8x.js";import{t as r}from"./ui/assets/logger-Bc2W-BQq.js";import{n as i,r as a,t as o}from"./ui/assets/jsxRuntime.module-BfNLb6HB.js";var s=[`[class*="grid"]`,`[class*="list"]`,`[class*="row"]`,`[data-testid*="card"]`],c=[{pattern:/netflix\.com\/browse/i,hint:`high`},{pattern:/letterboxd\.com/i,hint:`medium`},{pattern:/imdb\.com\/chart/i,hint:`high`},{pattern:/primevideo\.com/i,hint:`medium`}],l=60,u=4,d=.55,f=.78;function p(e){let t=e.getBoundingClientRect();return{width:t.width||e.width||parseInt(e.getAttribute(`width`)||`0`,10)||0,height:t.height||e.height||parseInt(e.getAttribute(`height`)||`0`,10)||0}}function m(e){if(!e.src||e.src.startsWith(`data:`)||e.src.startsWith(`blob:`))return!1;let{width:t,height:n}=p(e);if(t<l||n<=0)return!1;let r=t/n;return r>=d&&r<=f}function h(e){let t=0;for(let n of e.querySelectorAll(`img`))m(n)&&t++;return t}function g(){let e=typeof window<`u`?window.location.href:``;for(let{pattern:t,hint:n}of c)if(t.test(e))return n;return null}function ee(e,t){return e<u?null:t===`high`&&e>=u||e>=6?`high`:e>=u&&(t===`medium`||t===`high`)||e>=u?`medium`:null}function te(e){let t=new Set,n=[];for(let r of s)for(let i of e.querySelectorAll(r))t.has(i)||(t.add(i),n.push(i));return n}function _(e){let t=new Set,n=Array.from(e.querySelectorAll(`img`)).filter(m);for(let r of n){let n=r.parentElement,i=0;for(;n&&n!==e&&i<12;)h(n)>=u&&t.add(n),n=n.parentElement,i++}return Array.from(t)}function v(e){return e.filter(t=>!e.some(e=>e.element!==t.element&&t.element.contains(e.element)&&e.posterCount>=t.posterCount*.75))}function y(e){let t=g(),n=new Set([...te(e),..._(e)]),r=[];for(let e of n){let n=h(e),i=ee(n,t);i&&r.push({element:e,confidence:i,posterCount:n})}return v(r).sort((e,t)=>e.confidence===t.confidence?t.posterCount-e.posterCount:e.confidence===`high`?-1:1)}var b=`data-subsume-id`,x=[{re:/^(.{3,60})\s*\((\d{4})\)$/,titleIdx:1,yearIdx:2},{re:/^(.{3,60})\s*[-–—]\s*(\d{4})$/,titleIdx:1,yearIdx:2},{re:/^(.{3,60})\s*:\s*(\d{4})$/,titleIdx:1,yearIdx:2},{re:/^(.{3,60})\s*\((\d{4})\)\s*[—–-]\s*.+$/,titleIdx:1,yearIdx:2},{re:/^(.{3,60})\s*\([^)]*(?:TV Series|TV Mini Series|TV Movie)\s*(\d{4}).*\)$/i,titleIdx:1,yearIdx:2},{re:/^(.{3,60})\s*\((\d{4})\s+(?:TV series|TV show|Movie|Film).*\)$/i,titleIdx:1,yearIdx:2}],ne=[`netflix`,`prime video`,`amazon prime`,`disney+`,`hulu`,`hbo`,`apple tv`,`hotstar`,`paramount+`,`peacock`],S=[`movie`,`film`,`series`,`tv show`,`television`,`season`,`episode`,`imdb`,`rotten tomatoes`],C=new Set([`SCRIPT`,`STYLE`,`NOSCRIPT`,`IFRAME`,`SVG`,`NAV`,`FOOTER`,`HEADER`,`ASIDE`,`INPUT`,`TEXTAREA`,`SELECT`,`BUTTON`,`CODE`,`PRE`]),w=`nav, footer, header, aside, [role="navigation"], [role="banner"], .nav, .footer, .header, .sidebar, #nav, #footer, #header`;function T(){return`sub-${crypto.randomUUID()}`}function E(e){let t=e.getBoundingClientRect();return t.width>0&&t.height>0}function D(e){return e.closest(w)!==null}function O(e){for(let t of x){let n=e.match(t.re);if(n&&n[t.titleIdx].length>=3)return{title:n[t.titleIdx].trim(),yearGuess:parseInt(n[t.yearIdx],10)}}return null}function k(e){let t=[],n=e.querySelectorAll(`img[alt], img[title]`);for(let e of n){if(e.hasAttribute(b)||!E(e)||D(e))continue;let n=O((e.alt||e.title||``).trim());if(n){let r=T();e.setAttribute(b,r),t.push({element:e,id:r,title:n.title,yearGuess:n.yearGuess})}}return t}function A(e){let t=[],n=e.querySelectorAll(`a`);for(let e of n){if(e.hasAttribute(b)||!E(e)||D(e))continue;let n=(e.textContent||``).trim();if(n.length<3||n.length>80)continue;let r=e.href.toLowerCase(),i=ne.some(e=>r.includes(e)),a=/imdb\.com\/title\//i.test(r);if(i||a){let r=O(n),i=T();e.setAttribute(b,i),t.push({element:e,id:i,title:r?r.title:n,yearGuess:r?r.yearGuess:void 0});continue}let o=(e.parentElement?.textContent||``).toLowerCase();if(S.some(e=>o.includes(e))){let r=O(n);if(r){let n=T();e.setAttribute(b,n),t.push({element:e,id:n,title:r.title,yearGuess:r.yearGuess})}}}return t}function j(e){let t=[],n=e.querySelectorAll(`h1, h2, h3, h4`);for(let e of n){if(e.hasAttribute(b)||!E(e)||D(e))continue;let n=O((e.textContent||``).trim());if(n){let r=(e.parentElement?.textContent||``).toLowerCase();if(S.some(e=>r.includes(e))){let r=T();e.setAttribute(b,r),t.push({element:e,id:r,title:n.title,yearGuess:n.yearGuess})}}}return t}function M(e=document.body){let t=[];return t.push(...k(e)),t.push(...A(e)),t.push(...j(e)),t}var N=null,P=[],F=null;function re(e){let t=new Set(e);return e.filter(e=>{let n=e.parentElement;for(;n;){if(t.has(n))return!1;n=n.parentElement}return!0})}function I(e){if(P.length===0)return;let t=P.filter(e=>document.body.contains(e));if(t=re(t),P=[],F=null,t.length===0)return;let n=[];for(let e of t)n.push(...M(e));n.length>0&&e(n)}var L=`image.tmdb.org/t/p/`,R=[`image.tmdb.org`,`m.media-amazon.com/images`,`static.tvmaze.com/uploads`,`artworks.thetvdb.com`];function z(e,t){if(!e.includes(L))return null;let n=e.split(`/`),r=n[n.length-1];if(!r)return null;let i=r.split(`.`)[0];if(!i||isNaN(parseInt(i,10)))return null;let a=`movie`;if(t){let e=t.closest(`a`);if(e){let t=e.href.toLowerCase();t.includes(`/movie/`)?a=`movie`:t.includes(`/tv/`)&&(a=`tv`)}}return{tmdbId:i,mediaType:a}}function B(e,t=!1){if(!e.src||e.src.startsWith(`data:`)||e.src.startsWith(`blob:`)||C.has(e.tagName)||D(e)||e.hasAttribute(`data-subsume-poster-scanned`))return!1;if(t&&m(e)||R.some(t=>e.src.includes(t)))return!0;let n=(e.alt||``).trim(),r=n.split(/\s+/).filter(Boolean);if(r.length>=3&&/^.+\(\d{4}\)$/.test(n))return!0;if(r.length>=2){let t=e.parentElement,r=0;for(;t&&r<2;){if(t.textContent&&t.textContent.includes(n))return!0;t=t.parentElement,r++}}let i=e.getBoundingClientRect(),a=i.width||e.width,o=i.height||e.height;return a>=80&&o>=100&&n.length>=4}async function V(t,r,i=document.body,a={}){let o=a.catalogMode??!1,s=Array.from(i.querySelectorAll(`img`));i instanceof HTMLImageElement&&s.unshift(i);let c=s.filter(e=>B(e,o));if(c.length!==0)for(let i=0;i<c.length;i+=5){let a=c.slice(i,i+5);await Promise.all(a.map(async i=>{i.setAttribute(`data-subsume-poster-scanned`,`pending`);let a=i.src.includes(L),s=(i.alt||``).trim(),c=/^.+\(\d{4}\)$/.test(s),l=null;if(a?l=`tmdb-cdn`:o&&s?l=`alt-text`:o?l=`ancestor-text`:t===`medium`&&c?l=`alt-text`:t===`high`&&(l=s?`alt-text`:`ancestor-text`),!l){i.setAttribute(`data-subsume-poster-scanned`,`skip`);return}try{let t=null;if(l===`tmdb-cdn`){let r=z(i.src,i);if(!r){i.setAttribute(`data-subsume-poster-scanned`,`skip`);return}t=await e(n.RESOLVE_POSTER,{strategy:`tmdb-cdn`,tmdbId:r.tmdbId,mediaType:r.mediaType})}else if(l===`alt-text`)t=await e(n.RESOLVE_POSTER,{strategy:`alt-text`,query:s});else if(l===`ancestor-text`){let r=i.parentElement,a=0,o=``;for(;r&&a<2;){let e=(r.textContent||``).trim();e&&(!o||e.length<o.length)&&(o=e),r=r.parentElement,a++}let s=o.slice(0,60).trim(),c=s.split(/\s+/).filter(e=>e.length>1).length;if(!s||c<2){i.setAttribute(`data-subsume-poster-scanned`,`skip`);return}t=await e(n.RESOLVE_POSTER,{strategy:`ancestor-text`,query:s})}t&&t.success&&t.data&&t.data.match?(i.setAttribute(`data-subsume-poster-scanned`,`matched`),i.setAttribute(`data-subsume-poster-id`,t.data.match.tmdbId),r(i,t.data.match)):i.setAttribute(`data-subsume-poster-scanned`,`skip`)}catch(e){console.error(`[Subsume] Failed to resolve poster image:`,e),i.setAttribute(`data-subsume-poster-scanned`,`skip`)}})),i+5<c.length&&await new Promise(e=>setTimeout(e,50))}}var H=null,U=`medium`,W=!1,G=null;function K(e,t,n=!1){U=e,H=t,W=n}function q(e){N||(N=new MutationObserver(t=>{let n=!1;for(let e of t)for(let t of e.addedNodes)t instanceof Element&&!C.has(t.tagName)&&(P.push(t),n=!0);n&&(F&&clearTimeout(F),F=setTimeout(()=>{I(e)},150));let r=[];for(let e of t)for(let t of e.addedNodes)(t.nodeName===`IMG`&&t instanceof HTMLImageElement||t instanceof Element&&t.querySelector(`img`))&&r.push(t);r.length>0&&H&&(G&&clearTimeout(G),G=setTimeout(()=>{Promise.all(r.map(e=>V(U,H,e,{catalogMode:W}).catch(e=>{console.error(`[Subsume] Debounced scanImages failed:`,e)})))},500))}),N.observe(document.body,{childList:!0,subtree:!0}))}function J(e){let t=e.getBoundingClientRect(),n=t.bottom+12+window.scrollY,r=t.left+window.scrollX;return r+340>window.innerWidth&&(r=window.innerWidth-340-16),r<8&&(r=8),t.bottom+12+380>window.innerHeight&&(n=t.top-380-12+window.scrollY),{top:n,left:r}}function Y({mediaItem:e,loading:n,position:r,visible:i,inLibrary:s,libraryItem:c,onAdd:l,onRemove:u,onMouseEnter:d,onMouseLeave:f}){if(!i)return null;let p=e?.ratings.find(e=>e.provider===`imdb`),m=e?.ratings.find(e=>e.provider===`rt`);return o(`div`,{className:`subsume-hover-card ${i?`subsume-visible`:``}`,style:{top:`${r.top}px`,left:`${r.left}px`},onMouseEnter:d,onMouseLeave:f,children:n?o(`div`,{className:`subsume-loading`,children:[o(`div`,{className:`subsume-spinner`}),o(`span`,{children:`Loading details…`})]}):e?o(a,{children:[o(`div`,{className:`subsume-card-header`,children:[o(`div`,{className:`subsume-poster`,children:e.posterUrl?o(`img`,{src:e.posterUrl,alt:e.canonicalTitle}):o(`div`,{className:`subsume-poster-placeholder`,children:o(`svg`,{width:`32`,height:`32`,viewBox:`0 0 24 24`,fill:`none`,stroke:`currentColor`,"stroke-width":`1.5`,children:[o(`rect`,{x:`2`,y:`3`,width:`20`,height:`18`,rx:`2`}),o(`path`,{d:`M7 3v18M17 3v18M2 9h5M17 9h5M2 15h5M17 15h5`})]})})}),o(`div`,{className:`subsume-card-info`,children:[o(`h3`,{className:`subsume-title`,children:e.canonicalTitle}),o(`div`,{className:`subsume-meta`,children:[o(`span`,{className:`subsume-year`,children:e.year}),e.runtimeMinutes&&o(`span`,{className:`subsume-runtime`,children:[e.runtimeMinutes,` min`]}),o(`span`,{className:`subsume-type-badge`,children:e.type===`tv`?`TV Show`:`Movie`})]})]})]}),o(`div`,{className:`subsume-ratings`,children:[p&&o(`div`,{className:`subsume-rating-chip subsume-imdb`,children:[o(`span`,{className:`subsume-rating-icon`,children:`⭐`}),o(`span`,{className:`subsume-rating-label`,children:`IMDb`}),o(`span`,{className:`subsume-rating-value`,children:[p.score,`/10`]})]}),m&&o(`div`,{className:`subsume-rating-chip subsume-rt`,children:[o(`span`,{className:`subsume-rating-icon`,children:`🍅`}),o(`span`,{className:`subsume-rating-label`,children:`RT`}),o(`span`,{className:`subsume-rating-value`,children:[m.score,`%`]})]})]}),e.streamingAvailability&&e.streamingAvailability.length>0&&o(`div`,{className:`subsume-platforms`,children:e.streamingAvailability.slice(0,3).map((e,n)=>o(`span`,{className:`subsume-platform-tag`,children:t(e.platform)},`${e.platform}-${n}`))}),o(`div`,{className:`subsume-genres`,children:e.genres.map(e=>o(`span`,{className:`subsume-genre-tag`,children:e},e))}),e.overview&&o(`p`,{className:`subsume-overview`,children:e.overview}),s&&c&&o(`div`,{className:`subsume-library-status-bar`,children:[o(`div`,{className:`subsume-library-status-left`,children:[o(`span`,{className:`subsume-library-label`,children:`Status`}),o(`span`,{className:`subsume-status-badge status-${c.status}`,children:c.status===`to-watch`?`To Watch`:c.status===`watching`?`Watching`:c.status===`watched`?`Watched`:`Abandoned`})]}),c.userRating!==void 0&&o(`div`,{className:`subsume-library-status-right`,children:[o(`span`,{className:`subsume-library-label`,children:`My Rating`}),o(`span`,{className:`subsume-user-rating-badge`,children:[o(`span`,{className:`subsume-star`,children:`★`}),` `,c.userRating,`/10`]})]})]}),o(`div`,{className:`subsume-actions`,children:s?o(`button`,{className:`subsume-btn subsume-btn-danger`,onClick:u,children:[o(`svg`,{width:`14`,height:`14`,viewBox:`0 0 24 24`,fill:`none`,stroke:`currentColor`,"stroke-width":`2`,children:[o(`polyline`,{points:`3 6 5 6 21 6`}),o(`path`,{d:`M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2`})]}),`Remove`]}):o(a,{children:[o(`button`,{className:`subsume-btn subsume-btn-primary`,onClick:()=>l(`movie`),children:[o(`svg`,{width:`14`,height:`14`,viewBox:`0 0 24 24`,fill:`none`,stroke:`currentColor`,"stroke-width":`2`,children:[o(`line`,{x1:`12`,y1:`5`,x2:`12`,y2:`19`}),o(`line`,{x1:`5`,y1:`12`,x2:`19`,y2:`12`})]}),`Add to Movies`]}),o(`button`,{className:`subsume-btn subsume-btn-secondary`,onClick:()=>l(`tv`),children:[o(`svg`,{width:`14`,height:`14`,viewBox:`0 0 24 24`,fill:`none`,stroke:`currentColor`,"stroke-width":`2`,children:[o(`line`,{x1:`12`,y1:`5`,x2:`12`,y2:`19`}),o(`line`,{x1:`5`,y1:`12`,x2:`19`,y2:`12`})]}),`Add to TV Shows`]})]})})]}):o(`div`,{className:`subsume-error`,children:`Could not load details`})})}var ie=class{container;shadowRoot;currentTarget=null;showTimeout=null;hideTimeout=null;isCardHovered=!1;libraryItems=new Map;constructor(){this.container=document.createElement(`div`),this.container.id=`subsume-hover-root`,this.shadowRoot=this.container.attachShadow({mode:`open`});let e=document.createElement(`style`);e.textContent=ae,this.shadowRoot.appendChild(e);let t=document.createElement(`div`);t.id=`subsume-mount`,this.shadowRoot.appendChild(t),document.body.appendChild(this.container),this.setupSyncListener()}libraryCacheInitialized=!1;async initLibraryCache(){try{let t=await e(n.GET_LIBRARY,{});t.success&&t.data&&(this.libraryItems=new Map(t.data.map(e=>[e.library.mediaId,e.library])))}catch(e){console.error(`[Subsume] Failed to initialize library cache:`,e)}}setupSyncListener(){chrome.runtime.onMessage.addListener((e,t)=>{if(t.id===chrome.runtime.id&&e&&e.type===`LIBRARY_UPDATED`){let t=e.libraryItem,n=e.mediaId||t?.mediaId;if(!n)return;e.action===`add`&&t||e.action===`update`&&t?this.libraryItems.set(n,t):e.action===`remove`&&this.libraryItems.delete(n)}})}attachToElement(e,t,n){this.libraryCacheInitialized||(this.libraryCacheInitialized=!0,this.initLibraryCache()),e.addEventListener(`mouseenter`,()=>{this.scheduleShow(e,t,n)}),e.addEventListener(`mouseleave`,()=>{this.scheduleHide()})}scheduleShow(e,t,n){this.cancelHide(),this.showTimeout=setTimeout(()=>{this.currentTarget=e,this.showCard(e,t,n)},300)}scheduleHide(){this.cancelShow(),this.hideTimeout=setTimeout(()=>{this.isCardHovered||this.hideCard()},200)}cancelShow(){this.showTimeout&&=(clearTimeout(this.showTimeout),null)}cancelHide(){this.hideTimeout&&=(clearTimeout(this.hideTimeout),null)}async showCard(t,r,a){let s=this.shadowRoot.getElementById(`subsume-mount`);if(!s)return;let c=J(t);i(o(Y,{mediaItem:null,loading:!0,position:c,visible:!0,inLibrary:!1,libraryItem:null,onAdd:()=>{},onRemove:()=>{},onMouseEnter:()=>{this.isCardHovered=!0,this.cancelHide()},onMouseLeave:()=>{this.isCardHovered=!1,this.scheduleHide()}}),s);try{let l=await e(n.GET_TITLE_DETAILS,{title:r,yearGuess:a});if(this.currentTarget!==t)return;let u=l.success?l.data??null:null,d=u&&this.libraryItems.get(u.id)||null;i(o(Y,{mediaItem:u,loading:!1,position:c,visible:!0,inLibrary:d!==null,libraryItem:d,onAdd:e=>this.handleAdd(u,e),onRemove:()=>this.handleRemove(u),onMouseEnter:()=>{this.isCardHovered=!0,this.cancelHide()},onMouseLeave:()=>{this.isCardHovered=!1,this.scheduleHide()}}),s)}catch(e){console.error(`[Subsume] Failed to fetch title details:`,e),i(o(Y,{mediaItem:null,loading:!1,position:J(t),visible:!0,inLibrary:!1,libraryItem:null,onAdd:()=>{},onRemove:()=>{},onMouseEnter:()=>{this.isCardHovered=!0,this.cancelHide()},onMouseLeave:()=>{this.isCardHovered=!1,this.scheduleHide()}}),s)}}hideCard(){let e=this.shadowRoot.getElementById(`subsume-mount`);e&&i(o(Y,{mediaItem:null,loading:!1,position:{top:0,left:0},visible:!1,inLibrary:!1,libraryItem:null,onAdd:()=>{},onRemove:()=>{},onMouseEnter:()=>{},onMouseLeave:()=>{}}),e),this.currentTarget=null}async handleAdd(t,r){try{await e(n.ADD_TO_LIST,{mediaItem:{...t,type:r},type:r});let a=this.shadowRoot.getElementById(`subsume-mount`);a&&(i(o(`div`,{className:`subsume-hover-card subsume-visible subsume-added`,children:o(`div`,{className:`subsume-added-msg`,children:[o(`svg`,{width:`24`,height:`24`,viewBox:`0 0 24 24`,fill:`none`,stroke:`currentColor`,"stroke-width":`2`,children:o(`path`,{d:`M20 6L9 17l-5-5`})}),o(`span`,{children:[`Added to `,r===`movie`?`Movies`:`TV Shows`,`!`]})]})}),a),setTimeout(()=>this.hideCard(),1200))}catch(e){console.error(`[Subsume] Failed to add to list:`,e)}}async handleRemove(t){try{await e(n.REMOVE_FROM_LIBRARY,{mediaId:t.id});let r=this.shadowRoot.getElementById(`subsume-mount`);r&&(i(o(`div`,{className:`subsume-hover-card subsume-visible subsume-added`,children:o(`div`,{className:`subsume-added-msg`,children:[o(`svg`,{width:`24`,height:`24`,viewBox:`0 0 24 24`,fill:`none`,stroke:`currentColor`,"stroke-width":`2`,children:o(`path`,{d:`M20 6L9 17l-5-5`})}),o(`span`,{children:`Removed from library!`})]})}),r),setTimeout(()=>this.hideCard(),1200))}catch(e){console.error(`[Subsume] Failed to remove from library:`,e)}}},ae=`
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
`,X=`data-subsume-badge`,Z=`subsume-poster-wrap`,oe=[`imdb`,`tmdb`,`rt`],se={imdb:{icon:`⭐`,label:`IMDb`,format:e=>`${e}/10`},tmdb:{icon:`★`,label:`TMDb`,format:e=>e.toFixed(1)},rt:{icon:`🍅`,label:`RT`,format:e=>`${Math.round(e)}%`}};function ce(e){for(let t of oe){let n=e.find(e=>e.provider===t);if(n&&n.score>0)return{provider:t,score:n.score}}return null}function le(e){return{id:`tmdb_${e.type}_${e.tmdbId}`,canonicalTitle:e.title,type:e.type,year:e.year,genres:[],ratings:e.ratings,providers:[],posterUrl:e.posterPath||``}}function ue(e){let t=e.parentElement;if(t?.classList.contains(Z))return t;let n=document.createElement(`span`);return n.className=Z,n.style.cssText=`position:relative;display:inline-block;line-height:0;vertical-align:top;`,e.parentNode?.insertBefore(n,e),n.appendChild(e),n}function Q({match:e,inLibrary:t,adding:n,onAdd:r}){let i=ce(e.ratings),a=i?se[i.provider]:null;return o(`div`,{className:`subsume-badge-root`,children:[i&&a&&o(`div`,{className:`subsume-badge-rating`,title:`${a.label} rating`,children:[o(`span`,{className:`subsume-badge-provider`,children:a.icon}),o(`span`,{className:`subsume-badge-score`,children:a.format(i.score)})]}),o(`button`,{type:`button`,className:`subsume-badge-action ${t?`in-library`:``}`,disabled:t||n,onClick:e=>{e.preventDefault(),e.stopPropagation(),!t&&!n&&r()},title:t?`In your library`:`Add to Subsume`,children:n?`…`:t?`✓`:`+`})]})}var de=`
  :host {
    all: initial;
    position: absolute;
    inset: 0;
    pointer-events: none;
    z-index: 2147483646;
    font-family: 'Geist', system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  }

  .subsume-badge-root {
    position: absolute;
    inset: 0;
    pointer-events: none;
  }

  .subsume-badge-rating {
    position: absolute;
    top: 6px;
    right: 6px;
    display: inline-flex;
    align-items: center;
    gap: 3px;
    padding: 3px 7px;
    border-radius: 6px;
    background: rgba(0, 0, 0, 0.78);
    color: #fff;
    font-size: 11px;
    font-weight: 700;
    line-height: 1;
    backdrop-filter: blur(4px);
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.35);
    pointer-events: auto;
  }

  .subsume-badge-provider {
    font-size: 10px;
    line-height: 1;
  }

  .subsume-badge-score {
    letter-spacing: -0.02em;
  }

  .subsume-badge-action {
    position: absolute;
    bottom: 4px;
    right: 4px;
    width: 32px;
    height: 32px;
    min-width: 32px;
    min-height: 32px;
    border: none;
    border-radius: 50%;
    background: #c9a84c;
    color: #121212;
    font-size: 16px;
    font-weight: 800;
    line-height: 1;
    cursor: pointer;
    pointer-events: auto;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
    transition: transform 0.15s ease, background 0.15s ease;
  }

  .subsume-badge-action:hover:not(:disabled) {
    transform: scale(1.08);
    background: #d4b860;
  }

  .subsume-badge-action.in-library {
    background: rgba(34, 197, 94, 0.9);
    color: #fff;
    cursor: default;
  }

  @media (prefers-reduced-motion: reduce) {
    .subsume-badge-action {
      transition: none;
    }
    .subsume-badge-action:hover:not(:disabled) {
      transform: none;
    }
  }

  .subsume-badge-action:disabled {
    opacity: 0.85;
    cursor: default;
  }
`,fe=class{badges=new Map;libraryIds=new Set;constructor(){this.setupSyncListener()}setupSyncListener(){chrome.runtime.onMessage.addListener((e,t)=>{if(t.id!==chrome.runtime.id||e?.type!==`LIBRARY_UPDATED`)return;let n=e.mediaId||e.libraryItem?.mediaId;if(n){e.action===`add`||e.action===`update`?this.libraryIds.add(n):e.action===`remove`&&this.libraryIds.delete(n);for(let t of this.badges.values())t.mediaId===n&&(t.inLibrary=e.action!==`remove`,this.renderBadge(t))}})}async initLibraryCache(){try{let t=await e(n.GET_LIBRARY,{});if(t.success&&t.data){this.libraryIds=new Set(t.data.map(e=>e.library.mediaId));for(let e of this.badges.values())e.inLibrary=this.libraryIds.has(e.mediaId),this.renderBadge(e)}}catch(e){console.error(`[Subsume] Failed to load library cache for poster badges:`,e)}}attachBadge(e,t){if(e.hasAttribute(X))return;let n=`tmdb_${t.type}_${t.tmdbId}`,r=ue(e),i=document.createElement(`div`);i.setAttribute(X,`true`),i.style.cssText=`position:absolute;inset:0;pointer-events:none;`,r.appendChild(i);let a=i.attachShadow({mode:`open`}),o=document.createElement(`style`);o.textContent=de,a.appendChild(o);let s=document.createElement(`div`);a.appendChild(s);let c={match:t,inLibrary:t.inLibrary||this.libraryIds.has(n),adding:!1,host:i,shadowRoot:a,mount:s,mediaId:n};e.setAttribute(X,`true`),this.badges.set(e,c),this.renderBadge(c)}renderBadge(e){i(o(Q,{match:e.match,inLibrary:e.inLibrary,adding:e.adding,onAdd:()=>this.handleAdd(e)}),e.mount)}async handleAdd(t){if(!(t.inLibrary||t.adding)){t.adding=!0,this.renderBadge(t);try{let r=le(t.match);await e(n.ADD_TO_LIST,{mediaItem:r,type:t.match.type}),t.inLibrary=!0,this.libraryIds.add(t.mediaId)}catch(e){console.error(`[Subsume] Failed to add from poster badge:`,e)}finally{t.adding=!1,this.renderBadge(t)}}}};async function $(){r.log(`[Subsume] Content script loaded.`);let t=window.location.hostname,i=await e(n.GET_CONTENT_PREFS,{hostname:t}),a=i.success?i.data:null,o=a?.hoverCardsEnabled??!0,s=a?.posterOverlaysEnabled??!0,c=a?.detectionSensitivity||`medium`;if(a?.domainDisabled){r.log(`[Subsume] Domain ${t} is blacklisted. Exiting.`);return}if(!o&&!s){r.log(`[Subsume] Page scanning disabled in preferences. Exiting.`);return}let l=null,u=null,d=y(document.body).filter(e=>e.confidence===`high`),f=d.length>0;if(s){u=new fe,u.initLibraryCache();let e=(e,t)=>{u?.attachBadge(e,t)};K(c,e,f),(async()=>{if(f){r.log(`[Subsume] Catalog page detected (${d.length} region(s)); prioritizing poster scan.`);for(let t of d)await V(c,e,t.element,{catalogMode:!0})}await V(c,e,document.body,{catalogMode:f})})().catch(e=>{r.error(`[Subsume] Initial poster scan failed:`,e)})}if(o){l=new ie;let e=e=>{for(let t of e)l.attachToElement(t.element,t.title,t.yearGuess)},t=M();t.length>0&&(r.log(`[Subsume] Found ${t.length} title(s) on page.`),e(t)),q(t=>{r.log(`[Subsume] Found ${t.length} new title(s) via mutation.`),e(t)})}else s&&q(()=>{})}document.readyState===`loading`?document.addEventListener(`DOMContentLoaded`,$):$();