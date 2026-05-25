(()=>{var e={};e.id=615,e.ids=[615],e.modules={7849:e=>{"use strict";e.exports=require("next/dist/client/components/action-async-storage.external")},2934:e=>{"use strict";e.exports=require("next/dist/client/components/action-async-storage.external.js")},5403:e=>{"use strict";e.exports=require("next/dist/client/components/request-async-storage.external")},4580:e=>{"use strict";e.exports=require("next/dist/client/components/request-async-storage.external.js")},4749:e=>{"use strict";e.exports=require("next/dist/client/components/static-generation-async-storage.external")},5869:e=>{"use strict";e.exports=require("next/dist/client/components/static-generation-async-storage.external.js")},399:e=>{"use strict";e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},8302:(e,t,s)=>{"use strict";s.r(t),s.d(t,{GlobalError:()=>o.a,__next_app__:()=>p,originalPathname:()=>d,pages:()=>c,routeModule:()=>g,tree:()=>l}),s(9079),s(2655),s(5866);var r=s(3191),a=s(8716),n=s(7922),o=s.n(n),i=s(5231),u={};for(let e in i)0>["default","tree","pages","GlobalError","originalPathname","__next_app__","routeModule"].indexOf(e)&&(u[e]=()=>i[e]);s.d(t,u);let l=["",{children:["publisher",{children:["[slug]",{children:["books",{children:["__PAGE__",{},{page:[()=>Promise.resolve().then(s.bind(s,9079)),"/Users/arouldas/djre-store/nstore/src/app/publisher/[slug]/books/page.jsx"]}]},{}]},{}]},{}]},{layout:[()=>Promise.resolve().then(s.bind(s,2655)),"/Users/arouldas/djre-store/nstore/src/app/layout.jsx"],"not-found":[()=>Promise.resolve().then(s.t.bind(s,5866,23)),"next/dist/client/components/not-found-error"]}],c=["/Users/arouldas/djre-store/nstore/src/app/publisher/[slug]/books/page.jsx"],d="/publisher/[slug]/books/page",p={require:s,loadChunk:()=>Promise.resolve()},g=new r.AppPageRouteModule({definition:{kind:a.x.APP_PAGE,page:"/publisher/[slug]/books/page",pathname:"/publisher/[slug]/books",bundlePath:"",filename:"",appPaths:[]},userland:{loaderTree:l}})},3125:(e,t,s)=>{Promise.resolve().then(s.bind(s,9164))},2350:(e,t,s)=>{"use strict";s.d(t,{Z:()=>a});var r=s(326);function a({pageData:e,currentPage:t,onPageChange:s}){let a=e?.previous!==null&&e?.previous!==void 0,n=e?.next!==null&&e?.next!==void 0;return(0,r.jsxs)("div",{className:"mt-4 flex w-full items-center justify-between gap-3 text-sm text-slate-600 sm:w-auto",children:[r.jsx("button",{type:"button",className:"inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed",onClick:()=>s(t-1),disabled:!a,children:"Previous"}),(0,r.jsxs)("span",{children:["Page ",t]}),r.jsx("button",{type:"button",className:"inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed",onClick:()=>s(t+1),disabled:!n,children:"Next"})]})}},9164:(e,t,s)=>{"use strict";s.d(t,{default:()=>l});var r=s(326),a=s(7577),n=s(434),o=s(5047);s(4264);var i=s(9210),u=s(2350);function l({publisher:e,initialPageData:t=null,initialPage:s=1}){let l=(0,o.useRouter)(),{addToCart:c}=(0,i.jD)(),[d,p]=(0,a.useState)(s),[g,h]=(0,a.useState)(t||{count:0,next:null,previous:null,results:[]}),[x,m]=(0,a.useState)(!t),[b,y]=(0,a.useState)(""),f=e=>{l.push(`/product/${e}`)},S=(e,t)=>{("Enter"===e.key||" "===e.key)&&(e.preventDefault(),f(t))},$=(0,a.useMemo)(()=>g.results||[],[g.results]);return(0,r.jsxs)("main",{className:"w-full px-4 py-8",children:[(0,r.jsxs)("nav",{className:"flex items-center gap-2 text-sm text-slate-500","aria-label":"Breadcrumb",children:[r.jsx(n.default,{className:"font-semibold text-orange-700 hover:text-orange-800",href:"/",children:"Home"}),r.jsx("span",{children:"/"}),r.jsx(n.default,{className:"font-semibold text-orange-700 hover:text-orange-800",href:"/publishers",children:"Publishers"}),r.jsx("span",{children:"/"}),r.jsx("span",{children:e.name})]}),r.jsx("h1",{className:"mt-3 text-2xl font-semibold text-slate-900",children:e.name}),r.jsx("p",{className:"mt-1 text-sm text-slate-500",children:"Books available from this publisher."}),b?r.jsx("p",{className:"mt-2 text-sm font-semibold text-red-600",children:b}):null,x?r.jsx("section",{className:"mt-4 grid grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-3","aria-label":"loading publisher books",children:Array.from({length:6}).map((e,t)=>r.jsx("article",{className:"min-h-[170px] animate-pulse rounded-2xl bg-slate-200"},t))}):(0,r.jsxs)(r.Fragment,{children:[r.jsx("section",{className:"mt-3 flex items-center justify-between text-sm text-slate-600",children:(0,r.jsxs)("p",{children:["Total books: ",r.jsx("strong",{children:g.count})]})}),r.jsx("section",{className:"mt-4 grid grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-3",children:$.map(e=>(0,r.jsxs)("article",{className:"flex h-full cursor-pointer flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300",role:"link",tabIndex:0,onClick:()=>f(e.uuid),onKeyDown:t=>S(t,e.uuid),children:[r.jsx("img",{className:"h-40 w-full rounded-xl border border-slate-200 bg-white object-contain",src:"/assets/placeholder-product.svg",alt:e.name||"Product placeholder"}),r.jsx("p",{className:"mt-3 inline-flex w-fit rounded-full bg-teal-100 px-2 py-0.5 text-xs font-semibold text-teal-700",children:e.sku}),r.jsx("h2",{className:"mt-2 text-base font-semibold text-slate-900",children:e.name}),r.jsx("p",{className:"mt-1 text-sm text-slate-600",children:e.short_description||"No description available."}),(0,r.jsxs)("div",{className:"mt-3 flex items-center justify-between gap-2",children:[(0,r.jsxs)("p",{className:"text-base font-semibold text-orange-800",children:["Rs ",e.sale_price]}),r.jsx("span",{className:`rounded-full px-2 py-0.5 text-xs font-semibold ${Number(e.stock_quantity)>0?"bg-emerald-100 text-emerald-700":"bg-red-100 text-red-700"}`,children:Number(e.stock_quantity)>0?"In stock":"Out of stock"})]}),r.jsx("button",{className:"mt-3 inline-flex items-center justify-center rounded-xl bg-orange-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50",onClick:t=>{t.stopPropagation(),c(e)},disabled:0>=Number(e.stock_quantity),children:"Add to cart"})]},e.uuid))}),r.jsx(u.Z,{pageData:g,currentPage:d,onPageChange:p})]})]})}},9079:(e,t,s)=>{"use strict";s.r(t),s.d(t,{default:()=>c});var r=s(9510),a=s(8570);let n=(0,a.createProxy)(String.raw`/Users/arouldas/djre-store/nstore/src/components/PublisherBooksClient.jsx`),{__esModule:o,$$typeof:i}=n;n.default;let u=(0,a.createProxy)(String.raw`/Users/arouldas/djre-store/nstore/src/components/PublisherBooksClient.jsx#default`);var l=s(2856);async function c({params:e}){let{slug:t}=e,s={count:0,next:null,previous:null,results:[]};try{s=await (0,l.qh)(t,{page:1,pageSize:24})}catch{s={count:0,next:null,previous:null,results:[]}}return r.jsx(u,{initialPageData:s,initialPage:1,initialSlug:t})}},2856:(e,t,s)=>{"use strict";s.d(t,{y7:()=>v,E4:()=>$,T1:()=>f,t2:()=>y,Qq:()=>w,an:()=>_,qh:()=>k,_1:()=>C,V2:()=>P,fs:()=>j,n4:()=>q,Lp:()=>S,On:()=>z});let r=`
  query Products($page: Int, $pageSize: Int, $categoryUuid: String, $tagSlug: String) {
    products(page: $page, pageSize: $pageSize, categoryUuid: $categoryUuid, tagSlug: $tagSlug) {
      count
      next
      previous
      results {
        uuid
        sku
        name
        short_description
        sale_price
        stock_quantity
      }
    }
  }
`,a=`
  query ProductDetail($uuid: String!) {
    productDetail(uuid: $uuid) {
      uuid
      sku
      name
      product_type
      short_description
      description
      sale_price
      stock_quantity
      category {
        uuid
        name
        slug
      }
      tags
      tag_details {
        name
        slug
      }
      book_details {
        isbn_10
        isbn_13
        book_language
        book_edition
        cover_type
        page_count
        published_year
        publisher {
          uuid
          name
          slug
        }
        authors {
          uuid
          name
          slug
        }
      }
    }
  }
`,n=`
  query TagsWithCount($page: Int, $pageSize: Int) {
    tagsWithProductCount(page: $page, pageSize: $pageSize) {
      count
      next
      previous
      results {
        name
        slug
        product_count
      }
    }
  }
`,o=`
  query CategoriesWithCount($page: Int, $pageSize: Int) {
    categoriesWithProductCount(page: $page, pageSize: $pageSize) {
      count
      next
      previous
      results {
        uuid
        name
        slug
        description
        product_count
      }
    }
  }
`,i=`
  query AuthorsWithCount($page: Int, $pageSize: Int) {
    authorsWithProductCount(page: $page, pageSize: $pageSize) {
      count
      next
      previous
      results {
        uuid
        name
        slug
        product_count
      }
    }
  }
`,u=`
  query PublishersWithCount($page: Int, $pageSize: Int) {
    publishersWithProductCount(page: $page, pageSize: $pageSize) {
      count
      next
      previous
      results {
        uuid
        name
        slug
        description
        product_count
      }
    }
  }
`,l=`
  query ProductsByCategory($categoryUuid: String!, $page: Int, $pageSize: Int) {
    productsByCategory(categoryUuid: $categoryUuid, page: $page, pageSize: $pageSize) {
      count
      next
      previous
      results {
        uuid
        sku
        name
        short_description
        sale_price
        stock_quantity
        category {
          uuid
          name
          slug
        }
      }
    }
  }
`,c=`
  query ProductsByTag($tagSlug: String!, $page: Int, $pageSize: Int) {
    productsByTag(tagSlug: $tagSlug, page: $page, pageSize: $pageSize) {
      count
      next
      previous
      results {
        uuid
        sku
        name
        short_description
        sale_price
        stock_quantity
      }
    }
  }
`,d=`
  query ProductsByAuthor($authorSlug: String!, $page: Int, $pageSize: Int) {
    productsByAuthor(authorSlug: $authorSlug, page: $page, pageSize: $pageSize) {
      count
      next
      previous
      results {
        uuid
        sku
        name
        short_description
        sale_price
        stock_quantity
      }
    }
  }
`,p=`
  query ProductsByPublisher($publisherSlug: String!, $page: Int, $pageSize: Int) {
    productsByPublisher(publisherSlug: $publisherSlug, page: $page, pageSize: $pageSize) {
      count
      next
      previous
      results {
        uuid
        sku
        name
        short_description
        sale_price
        stock_quantity
      }
    }
  }
`;function g(){return"http://localhost:8000/api/v1"}function h(e,t){let s=String(e||"http://localhost:8000/api/v1").replace(/\/+$/,""),r=String(t||"").replace(/^\/+/,"");return`${s}/${r}`}async function x(e,t={}){let s=await fetch(h(g(),"graphql/"),{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({query:e,variables:t}),next:{revalidate:60}});if(!s.ok)throw Error(`GraphQL request failed (${s.status})`);let r=await s.json();if(Array.isArray(r?.errors)&&r.errors.length>0)throw Error(r.errors[0]?.message||"GraphQL request failed");return r?.data||{}}function m(){return{count:0,next:null,previous:null,results:[]}}async function b(e,t){let s=await fetch(h(g(),e),{method:"GET",next:{revalidate:60}});if(!s.ok)throw Error(t||`Could not load ${e}`);let r=await s.json();return r&&"object"==typeof r?{count:Number(r.count||0),next:r.next??null,previous:r.previous??null,results:Array.isArray(r.results)?r.results:[]}:m()}async function y({page:e=1,pageSize:t=24}={}){let s=await x(r,{page:e,pageSize:t});return Array.isArray(s?.products?.results)?s.products.results:[]}async function f(e){let t=await x(a,{uuid:e});return t?.productDetail||null}async function S({page:e=1,pageSize:t=12}={}){let s=await x(n,{page:e,pageSize:t});return s?.tagsWithProductCount||m()}async function $({page:e=1,pageSize:t=12}={}){let s=await x(o,{page:e,pageSize:t});return s?.categoriesWithProductCount||m()}async function v({page:e=1,pageSize:t=12}={}){let s=await x(i,{page:e,pageSize:t});return s?.authorsWithProductCount||m()}async function j({page:e=1,pageSize:t=12}={}){let s=await x(u,{page:e,pageSize:t});return s?.publishersWithProductCount||m()}async function _(e,{page:t=1,pageSize:s=24}={}){let r=await x(l,{categoryUuid:e,page:t,pageSize:s});return r?.productsByCategory||m()}async function P(e,{page:t=1,pageSize:s=24}={}){let r=await x(c,{tagSlug:e,page:t,pageSize:s});return r?.productsByTag||m()}async function w(e,{page:t=1,pageSize:s=24}={}){let r=await x(d,{authorSlug:e,page:t,pageSize:s});return r?.productsByAuthor||m()}async function k(e,{page:t=1,pageSize:s=24}={}){let r=await x(p,{publisherSlug:e,page:t,pageSize:s});return r?.productsByPublisher||m()}async function q({page:e=1,pageSize:t=24}={}){let s=new URLSearchParams({page:String(e),page_size:String(t)});return b(`inventory/re-store/products/?${s.toString()}`,"Could not load Re Store products")}async function z({page:e=1,pageSize:t=24,maxPrice:s=10}={}){let r=new URLSearchParams({page:String(e),page_size:String(t),max_price:String(s)});return b(`inventory/under-price/products/?${r.toString()}`,"Could not load under-price products")}async function C(e,{page:t=1,pageSize:s=24}={}){let r=new URLSearchParams({page:String(t),page_size:String(s)});return b(`inventory/sellers/${e}/products/?${r.toString()}`,"Could not load seller products")}}};var t=require("../../../../webpack-runtime.js");t.C(e);var s=e=>t(t.s=e),r=t.X(0,[948,982,49],()=>s(8302));module.exports=r})();