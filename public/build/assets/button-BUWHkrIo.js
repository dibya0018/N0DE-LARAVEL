import{r as u,j as k}from"./app-BAYl1HSz.js";import{d as C,S as p,c as j}from"./utils-CSG-oG7g.js";/**
 * @license lucide-react v0.475.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const N=r=>r.replace(/([a-z0-9])([A-Z])/g,"$1-$2").toLowerCase(),x=(...r)=>r.filter((t,e,s)=>!!t&&t.trim()!==""&&s.indexOf(t)===e).join(" ").trim();/**
 * @license lucide-react v0.475.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */var V={xmlns:"http://www.w3.org/2000/svg",width:24,height:24,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:2,strokeLinecap:"round",strokeLinejoin:"round"};/**
 * @license lucide-react v0.475.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const A=u.forwardRef(({color:r="currentColor",size:t=24,strokeWidth:e=2,absoluteStrokeWidth:s,className:a="",children:n,iconNode:v,...c},m)=>u.createElement("svg",{ref:m,...V,width:t,height:t,stroke:r,strokeWidth:s?Number(e)*24/Number(t):e,className:x("lucide",a),...c},[...v.map(([o,i])=>u.createElement(o,i)),...Array.isArray(n)?n:[n]]));/**
 * @license lucide-react v0.475.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const z=(r,t)=>{const e=u.forwardRef(({className:s,...a},n)=>u.createElement(A,{ref:n,iconNode:t,className:x(`lucide-${N(r)}`,s),...a}));return e.displayName=`${r}`,e},f=r=>typeof r=="boolean"?`${r}`:r===0?"0":r,h=C,E=(r,t)=>e=>{var s;if((t==null?void 0:t.variants)==null)return h(r,e==null?void 0:e.class,e==null?void 0:e.className);const{variants:a,defaultVariants:n}=t,v=Object.keys(a).map(o=>{const i=e==null?void 0:e[o],l=n==null?void 0:n[o];if(i===null)return null;const d=f(i)||f(l);return a[o][d]}),c=e&&Object.entries(e).reduce((o,i)=>{let[l,d]=i;return d===void 0||(o[l]=d),o},{}),m=t==null||(s=t.compoundVariants)===null||s===void 0?void 0:s.reduce((o,i)=>{let{class:l,className:d,...y}=i;return Object.entries(y).every(w=>{let[b,g]=w;return Array.isArray(g)?g.includes({...n,...c}[b]):{...n,...c}[b]===g})?[...o,l,d]:o},[]);return h(r,v,m,e==null?void 0:e.class,e==null?void 0:e.className)},O=E("inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-[color,box-shadow] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",{variants:{variant:{default:"bg-primary text-primary-foreground shadow-xs hover:bg-primary/90",destructive:"bg-destructive text-white shadow-xs hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40",outline:"border border-input bg-background shadow-xs hover:bg-accent hover:text-accent-foreground",secondary:"bg-secondary text-secondary-foreground shadow-xs hover:bg-secondary/80",ghost:"hover:bg-accent hover:text-accent-foreground",link:"text-primary underline-offset-4 hover:underline",warning:"bg-yellow-500 text-white shadow-xs hover:bg-yellow-600"},size:{default:"h-9 px-4 py-2 has-[>svg]:px-3",sm:"h-8 rounded-md px-3 has-[>svg]:px-2.5",lg:"h-10 rounded-md px-6 has-[>svg]:px-4",icon:"size-9"}},defaultVariants:{variant:"default",size:"default"}});function B({className:r,variant:t,size:e,asChild:s=!1,...a}){const n=s?p:"button";return k.jsx(n,{"data-slot":"button",className:j(O({variant:t,size:e,className:r})),...a})}export{B,E as a,O as b,z as c};
