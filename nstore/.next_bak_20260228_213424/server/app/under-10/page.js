(()=>{var e={};e.id=160,e.ids=[160],e.modules={7849:e=>{"use strict";e.exports=require("next/dist/client/components/action-async-storage.external")},2934:e=>{"use strict";e.exports=require("next/dist/client/components/action-async-storage.external.js")},5403:e=>{"use strict";e.exports=require("next/dist/client/components/request-async-storage.external")},4580:e=>{"use strict";e.exports=require("next/dist/client/components/request-async-storage.external.js")},4749:e=>{"use strict";e.exports=require("next/dist/client/components/static-generation-async-storage.external")},5869:e=>{"use strict";e.exports=require("next/dist/client/components/static-generation-async-storage.external.js")},399:e=>{"use strict";e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},3972:(e,t,r)=>{"use strict";r.r(t),r.d(t,{GlobalError:()=>o.a,__next_app__:()=>p,originalPathname:()=>d,pages:()=>c,routeModule:()=>g,tree:()=>l}),r(5993),r(2655),r(5866);var s=r(3191),a=r(8716),n=r(7922),o=r.n(n),i=r(5231),u={};for(let e in i)0>["default","tree","pages","GlobalError","originalPathname","__next_app__","routeModule"].indexOf(e)&&(u[e]=()=>i[e]);r.d(t,u);let l=["",{children:["under-10",{children:["__PAGE__",{},{page:[()=>Promise.resolve().then(r.bind(r,5993)),"/Users/arouldas/djre-store/nstore/src/app/under-10/page.jsx"]}]},{}]},{layout:[()=>Promise.resolve().then(r.bind(r,2655)),"/Users/arouldas/djre-store/nstore/src/app/layout.jsx"],"not-found":[()=>Promise.resolve().then(r.t.bind(r,5866,23)),"next/dist/client/components/not-found-error"]}],c=["/Users/arouldas/djre-store/nstore/src/app/under-10/page.jsx"],d="/under-10/page",p={require:r,loadChunk:()=>Promise.resolve()},g=new s.AppPageRouteModule({definition:{kind:a.x.APP_PAGE,page:"/under-10/page",pathname:"/under-10",bundlePath:"",filename:"",appPaths:[]},userland:{loaderTree:l}})},6315:(e,t,r)=>{Promise.resolve().then(r.bind(r,4723))},2350:(e,t,r)=>{"use strict";r.d(t,{Z:()=>a});var s=r(326);function a({pageData:e,currentPage:t,onPageChange:r}){let a=e?.previous!==null&&e?.previous!==void 0,n=e?.next!==null&&e?.next!==void 0;return(0,s.jsxs)("div",{className:"mt-4 flex w-full items-center justify-between gap-3 text-sm text-slate-600 sm:w-auto",children:[s.jsx("button",{type:"button",className:"inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed",onClick:()=>r(t-1),disabled:!a,children:"Previous"}),(0,s.jsxs)("span",{children:["Page ",t]}),s.jsx("button",{type:"button",className:"inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed",onClick:()=>r(t+1),disabled:!n,children:"Next"})]})}},4723:(e,t,r)=>{"use strict";r.d(t,{default:()=>l});var s=r(326),a=r(7577),n=r(434),o=r(5047);r(4264);var i=r(9210),u=r(2350);function l({maxPrice:e=10,initialPageData:t=null,initialPage:r=1}){let l=(0,o.useRouter)(),{addToCart:c}=(0,i.jD)(),{searchText:d}=(0,i.mY)(),[p,g]=(0,a.useState)(r),[x,m]=(0,a.useState)(t||{count:0,next:null,previous:null,results:[]}),[h,y]=(0,a.useState)(!t),[b,f]=(0,a.useState)(""),[S,j]=(0,a.useState)(!1),[v,_]=(0,a.useState)("featured"),[w,$]=(0,a.useState)(e),P=(0,a.useMemo)(()=>{let e=(d||"").trim().toLowerCase(),t=x.results.filter(t=>{let r=!e||t.name?.toLowerCase().includes(e)||t.short_description?.toLowerCase().includes(e)||t.sku?.toLowerCase().includes(e),s=!S||Number(t.stock_quantity)>0;return r&&s});return"price_low"===v?t=[...t].sort((e,t)=>Number(e.sale_price)-Number(t.sale_price)):"price_high"===v?t=[...t].sort((e,t)=>Number(t.sale_price)-Number(e.sale_price)):"name"===v&&(t=[...t].sort((e,t)=>(e.name||"").localeCompare(t.name||""))),t},[x.results,d,S,v]),N=e=>{l.push(`/product/${e}`)},k=(e,t)=>{("Enter"===e.key||" "===e.key)&&(e.preventDefault(),N(t))};return(0,s.jsxs)("main",{className:"w-full px-4 py-8",children:[(0,s.jsxs)("nav",{className:"flex items-center gap-2 text-sm text-slate-500","aria-label":"Breadcrumb",children:[s.jsx(n.default,{className:"font-semibold text-orange-700 hover:text-orange-800",href:"/",children:"Home"}),s.jsx("span",{children:"/"}),s.jsx("span",{children:"10 Rs Store"})]}),s.jsx("h1",{className:"mt-3 text-2xl font-semibold text-slate-900",children:"10 Rs Store"}),(0,s.jsxs)("p",{className:"mt-1 text-sm text-slate-500",children:["Products priced at Rs ",w," or less."]}),(0,s.jsxs)("section",{className:"mt-4 flex flex-wrap items-center gap-3","aria-label":"10 rs store product controls",children:[(0,s.jsxs)("select",{value:v,onChange:e=>_(e.target.value),className:"w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-300",children:[s.jsx("option",{value:"featured",children:"Sort: Featured"}),s.jsx("option",{value:"price_low",children:"Sort: Price low to high"}),s.jsx("option",{value:"price_high",children:"Sort: Price high to low"}),s.jsx("option",{value:"name",children:"Sort: Name"})]}),(0,s.jsxs)("label",{className:"grid gap-1 text-xs font-semibold text-slate-600",children:[(0,s.jsxs)("span",{children:["Max Rs ",w]}),s.jsx("input",{type:"range",min:"1",max:"500",step:"1",value:w,onChange:e=>{g(1),$(Number(e.target.value))},className:"accent-orange-500"})]}),(0,s.jsxs)("label",{className:"inline-flex items-center gap-2 text-sm text-slate-600",children:[s.jsx("input",{type:"checkbox",checked:S,onChange:e=>j(e.target.checked),className:"h-4 w-4 accent-orange-500"}),"In stock only"]})]}),s.jsx("section",{className:"mt-3 flex flex-wrap items-center justify-between gap-2 text-sm text-slate-600",children:(0,s.jsxs)("p",{children:["Showing ",s.jsx("strong",{children:P.length})," of ",s.jsx("strong",{children:x.count})," products"]})}),b?s.jsx("p",{className:"mt-2 text-sm font-semibold text-red-600",children:b}):null,h?s.jsx("section",{className:"mt-4 grid grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-3","aria-label":"loading 10 rs store products",children:Array.from({length:6}).map((e,t)=>s.jsx("article",{className:"min-h-[170px] animate-pulse rounded-2xl bg-slate-200"},t))}):0===P.length?s.jsx("p",{className:"mt-4 text-sm text-slate-500",children:"No products available in this price range."}):(0,s.jsxs)(s.Fragment,{children:[s.jsx("section",{className:"mt-4 grid grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-3",children:P.map(e=>(0,s.jsxs)("article",{className:"flex h-full cursor-pointer flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300",role:"link",tabIndex:0,onClick:()=>N(e.uuid),onKeyDown:t=>k(t,e.uuid),children:[s.jsx("img",{className:"h-40 w-full rounded-xl border border-slate-200 bg-white object-contain",src:"/assets/placeholder-product.svg",alt:e.name||"Product placeholder"}),s.jsx("p",{className:"mt-3 inline-flex w-fit rounded-full bg-teal-100 px-2 py-0.5 text-xs font-semibold text-teal-700",children:e.sku}),s.jsx("h2",{className:"mt-2 text-base font-semibold text-slate-900",children:e.name}),s.jsx("p",{className:"mt-1 text-sm text-slate-600",children:e.short_description||"No description available."}),(0,s.jsxs)("div",{className:"mt-3 flex items-center justify-between gap-2",children:[(0,s.jsxs)("p",{className:"text-base font-semibold text-orange-800",children:["Rs ",e.sale_price]}),s.jsx("span",{className:`rounded-full px-2 py-0.5 text-xs font-semibold ${Number(e.stock_quantity)>0?"bg-emerald-100 text-emerald-700":"bg-red-100 text-red-700"}`,children:Number(e.stock_quantity)>0?"In stock":"Out of stock"})]}),s.jsx("button",{className:"mt-3 inline-flex items-center justify-center rounded-xl bg-orange-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50",onClick:t=>{t.stopPropagation(),c(e)},disabled:0>=Number(e.stock_quantity),children:"Add to cart"})]},e.uuid))}),s.jsx(u.Z,{pageData:x,currentPage:p,onPageChange:g})]})]})}},5993:(e,t,r)=>{"use strict";r.r(t),r.d(t,{default:()=>c});var s=r(9510),a=r(8570);let n=(0,a.createProxy)(String.raw`/Users/arouldas/djre-store/nstore/src/components/UnderPriceProductsClient.jsx`),{__esModule:o,$$typeof:i}=n;n.default;let u=(0,a.createProxy)(String.raw`/Users/arouldas/djre-store/nstore/src/components/UnderPriceProductsClient.jsx#default`);var l=r(2856);async function c(){let e={count:0,next:null,previous:null,results:[]};try{e=await (0,l.On)({page:1,pageSize:24,maxPrice:10})}catch{e={count:0,next:null,previous:null,results:[]}}return s.jsx(u,{maxPrice:10,initialPageData:e,initialPage:1})}},2856:(e,t,r)=>{"use strict";r.d(t,{y7:()=>v,E4:()=>j,T1:()=>f,t2:()=>b,Qq:()=>P,an:()=>w,qh:()=>N,_1:()=>q,V2:()=>$,fs:()=>_,n4:()=>k,Lp:()=>S,On:()=>C});let s=`
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
`;function g(){return"http://localhost:8000/api/v1"}function x(e,t){let r=String(e||"http://localhost:8000/api/v1").replace(/\/+$/,""),s=String(t||"").replace(/^\/+/,"");return`${r}/${s}`}async function m(e,t={}){let r=await fetch(x(g(),"graphql/"),{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({query:e,variables:t}),next:{revalidate:60}});if(!r.ok)throw Error(`GraphQL request failed (${r.status})`);let s=await r.json();if(Array.isArray(s?.errors)&&s.errors.length>0)throw Error(s.errors[0]?.message||"GraphQL request failed");return s?.data||{}}function h(){return{count:0,next:null,previous:null,results:[]}}async function y(e,t){let r=await fetch(x(g(),e),{method:"GET",next:{revalidate:60}});if(!r.ok)throw Error(t||`Could not load ${e}`);let s=await r.json();return s&&"object"==typeof s?{count:Number(s.count||0),next:s.next??null,previous:s.previous??null,results:Array.isArray(s.results)?s.results:[]}:h()}async function b({page:e=1,pageSize:t=24}={}){let r=await m(s,{page:e,pageSize:t});return Array.isArray(r?.products?.results)?r.products.results:[]}async function f(e){let t=await m(a,{uuid:e});return t?.productDetail||null}async function S({page:e=1,pageSize:t=12}={}){let r=await m(n,{page:e,pageSize:t});return r?.tagsWithProductCount||h()}async function j({page:e=1,pageSize:t=12}={}){let r=await m(o,{page:e,pageSize:t});return r?.categoriesWithProductCount||h()}async function v({page:e=1,pageSize:t=12}={}){let r=await m(i,{page:e,pageSize:t});return r?.authorsWithProductCount||h()}async function _({page:e=1,pageSize:t=12}={}){let r=await m(u,{page:e,pageSize:t});return r?.publishersWithProductCount||h()}async function w(e,{page:t=1,pageSize:r=24}={}){let s=await m(l,{categoryUuid:e,page:t,pageSize:r});return s?.productsByCategory||h()}async function $(e,{page:t=1,pageSize:r=24}={}){let s=await m(c,{tagSlug:e,page:t,pageSize:r});return s?.productsByTag||h()}async function P(e,{page:t=1,pageSize:r=24}={}){let s=await m(d,{authorSlug:e,page:t,pageSize:r});return s?.productsByAuthor||h()}async function N(e,{page:t=1,pageSize:r=24}={}){let s=await m(p,{publisherSlug:e,page:t,pageSize:r});return s?.productsByPublisher||h()}async function k({page:e=1,pageSize:t=24}={}){let r=new URLSearchParams({page:String(e),page_size:String(t)});return y(`inventory/re-store/products/?${r.toString()}`,"Could not load Re Store products")}async function C({page:e=1,pageSize:t=24,maxPrice:r=10}={}){let s=new URLSearchParams({page:String(e),page_size:String(t),max_price:String(r)});return y(`inventory/under-price/products/?${s.toString()}`,"Could not load under-price products")}async function q(e,{page:t=1,pageSize:r=24}={}){let s=new URLSearchParams({page:String(t),page_size:String(r)});return y(`inventory/sellers/${e}/products/?${s.toString()}`,"Could not load seller products")}}};var t=require("../../webpack-runtime.js");t.C(e);var r=e=>t(t.s=e),s=t.X(0,[948,982,49],()=>r(3972));module.exports=s})();