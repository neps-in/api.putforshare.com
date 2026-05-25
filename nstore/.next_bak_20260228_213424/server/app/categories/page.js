(()=>{var e={};e.id=457,e.ids=[457],e.modules={7849:e=>{"use strict";e.exports=require("next/dist/client/components/action-async-storage.external")},2934:e=>{"use strict";e.exports=require("next/dist/client/components/action-async-storage.external.js")},5403:e=>{"use strict";e.exports=require("next/dist/client/components/request-async-storage.external")},4580:e=>{"use strict";e.exports=require("next/dist/client/components/request-async-storage.external.js")},4749:e=>{"use strict";e.exports=require("next/dist/client/components/static-generation-async-storage.external")},5869:e=>{"use strict";e.exports=require("next/dist/client/components/static-generation-async-storage.external.js")},399:e=>{"use strict";e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},4082:(e,t,r)=>{"use strict";r.r(t),r.d(t,{GlobalError:()=>i.a,__next_app__:()=>d,originalPathname:()=>p,pages:()=>c,routeModule:()=>g,tree:()=>l}),r(6040),r(2655),r(5866);var s=r(3191),a=r(8716),n=r(7922),i=r.n(n),o=r(5231),u={};for(let e in o)0>["default","tree","pages","GlobalError","originalPathname","__next_app__","routeModule"].indexOf(e)&&(u[e]=()=>o[e]);r.d(t,u);let l=["",{children:["categories",{children:["__PAGE__",{},{page:[()=>Promise.resolve().then(r.bind(r,6040)),"/Users/arouldas/djre-store/nstore/src/app/categories/page.jsx"]}]},{}]},{layout:[()=>Promise.resolve().then(r.bind(r,2655)),"/Users/arouldas/djre-store/nstore/src/app/layout.jsx"],"not-found":[()=>Promise.resolve().then(r.t.bind(r,5866,23)),"next/dist/client/components/not-found-error"]}],c=["/Users/arouldas/djre-store/nstore/src/app/categories/page.jsx"],p="/categories/page",d={require:r,loadChunk:()=>Promise.resolve()},g=new s.AppPageRouteModule({definition:{kind:a.x.APP_PAGE,page:"/categories/page",pathname:"/categories",bundlePath:"",filename:"",appPaths:[]},userland:{loaderTree:l}})},7369:(e,t,r)=>{Promise.resolve().then(r.bind(r,605))},605:(e,t,r)=>{"use strict";r.d(t,{default:()=>o});var s=r(326),a=r(7577),n=r(434);r(4264);var i=r(2350);function o({initialPageData:e=null,initialPage:t=1}){let[r,o]=(0,a.useState)(t),[u,l]=(0,a.useState)(e||{count:0,next:null,previous:null,results:[]}),[c,p]=(0,a.useState)(!e),[d,g]=(0,a.useState)("");return(0,s.jsxs)("main",{className:"w-full px-4 py-8",children:[(0,s.jsxs)("nav",{className:"flex items-center gap-2 text-sm text-slate-500","aria-label":"Breadcrumb",children:[s.jsx(n.default,{className:"font-semibold text-orange-700 hover:text-orange-800",href:"/",children:"Home"}),s.jsx("span",{children:"/"}),s.jsx("span",{children:"Categories"})]}),s.jsx("h1",{className:"mt-3 text-2xl font-semibold text-slate-900",children:"Categories"}),s.jsx("p",{className:"mt-1 text-sm text-slate-500",children:"Browse categories and jump to products in each category."}),d?s.jsx("p",{className:"mt-2 text-sm font-semibold text-red-600",children:d}):null,c?s.jsx("section",{className:"mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3","aria-label":"loading categories",children:Array.from({length:4}).map((e,t)=>s.jsx("article",{className:"min-h-[170px] animate-pulse rounded-2xl bg-slate-200"},t))}):(0,s.jsxs)(s.Fragment,{children:[s.jsx("section",{className:"mt-3 flex items-center justify-between text-sm text-slate-600",children:(0,s.jsxs)("p",{children:["Total categories: ",s.jsx("strong",{children:u.count})]})}),s.jsx("section",{className:"mt-4 flex flex-wrap gap-4",children:u.results.map(e=>s.jsx(n.default,{className:"inline-flex w-fit flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300",href:`/category/${e.uuid}/products`,children:(0,s.jsxs)("h2",{className:"text-base font-semibold text-slate-900",children:[e.name," (",e.product_count,")"]})},e.uuid))}),s.jsx(i.Z,{pageData:u,currentPage:r,onPageChange:o})]})]})}},2350:(e,t,r)=>{"use strict";r.d(t,{Z:()=>a});var s=r(326);function a({pageData:e,currentPage:t,onPageChange:r}){let a=e?.previous!==null&&e?.previous!==void 0,n=e?.next!==null&&e?.next!==void 0;return(0,s.jsxs)("div",{className:"mt-4 flex w-full items-center justify-between gap-3 text-sm text-slate-600 sm:w-auto",children:[s.jsx("button",{type:"button",className:"inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed",onClick:()=>r(t-1),disabled:!a,children:"Previous"}),(0,s.jsxs)("span",{children:["Page ",t]}),s.jsx("button",{type:"button",className:"inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed",onClick:()=>r(t+1),disabled:!n,children:"Next"})]})}},6040:(e,t,r)=>{"use strict";r.r(t),r.d(t,{default:()=>c});var s=r(9510),a=r(8570);let n=(0,a.createProxy)(String.raw`/Users/arouldas/djre-store/nstore/src/components/CategoriesClient.jsx`),{__esModule:i,$$typeof:o}=n;n.default;let u=(0,a.createProxy)(String.raw`/Users/arouldas/djre-store/nstore/src/components/CategoriesClient.jsx#default`);var l=r(2856);async function c(){let e={count:0,next:null,previous:null,results:[]};try{e=await (0,l.E4)({page:1,pageSize:12})}catch{e={count:0,next:null,previous:null,results:[]}}return s.jsx(u,{initialPageData:e,initialPage:1})}},2856:(e,t,r)=>{"use strict";r.d(t,{y7:()=>v,E4:()=>$,T1:()=>S,t2:()=>f,Qq:()=>w,an:()=>j,qh:()=>q,_1:()=>k,V2:()=>P,fs:()=>_,n4:()=>C,Lp:()=>b,On:()=>z});let s=`
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
`,i=`
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
`,o=`
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
`,p=`
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
`,d=`
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
`;function g(){return"http://localhost:8000/api/v1"}function x(e,t){let r=String(e||"http://localhost:8000/api/v1").replace(/\/+$/,""),s=String(t||"").replace(/^\/+/,"");return`${r}/${s}`}async function h(e,t={}){let r=await fetch(x(g(),"graphql/"),{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({query:e,variables:t}),next:{revalidate:60}});if(!r.ok)throw Error(`GraphQL request failed (${r.status})`);let s=await r.json();if(Array.isArray(s?.errors)&&s.errors.length>0)throw Error(s.errors[0]?.message||"GraphQL request failed");return s?.data||{}}function m(){return{count:0,next:null,previous:null,results:[]}}async function y(e,t){let r=await fetch(x(g(),e),{method:"GET",next:{revalidate:60}});if(!r.ok)throw Error(t||`Could not load ${e}`);let s=await r.json();return s&&"object"==typeof s?{count:Number(s.count||0),next:s.next??null,previous:s.previous??null,results:Array.isArray(s.results)?s.results:[]}:m()}async function f({page:e=1,pageSize:t=24}={}){let r=await h(s,{page:e,pageSize:t});return Array.isArray(r?.products?.results)?r.products.results:[]}async function S(e){let t=await h(a,{uuid:e});return t?.productDetail||null}async function b({page:e=1,pageSize:t=12}={}){let r=await h(n,{page:e,pageSize:t});return r?.tagsWithProductCount||m()}async function $({page:e=1,pageSize:t=12}={}){let r=await h(i,{page:e,pageSize:t});return r?.categoriesWithProductCount||m()}async function v({page:e=1,pageSize:t=12}={}){let r=await h(o,{page:e,pageSize:t});return r?.authorsWithProductCount||m()}async function _({page:e=1,pageSize:t=12}={}){let r=await h(u,{page:e,pageSize:t});return r?.publishersWithProductCount||m()}async function j(e,{page:t=1,pageSize:r=24}={}){let s=await h(l,{categoryUuid:e,page:t,pageSize:r});return s?.productsByCategory||m()}async function P(e,{page:t=1,pageSize:r=24}={}){let s=await h(c,{tagSlug:e,page:t,pageSize:r});return s?.productsByTag||m()}async function w(e,{page:t=1,pageSize:r=24}={}){let s=await h(p,{authorSlug:e,page:t,pageSize:r});return s?.productsByAuthor||m()}async function q(e,{page:t=1,pageSize:r=24}={}){let s=await h(d,{publisherSlug:e,page:t,pageSize:r});return s?.productsByPublisher||m()}async function C({page:e=1,pageSize:t=24}={}){let r=new URLSearchParams({page:String(e),page_size:String(t)});return y(`inventory/re-store/products/?${r.toString()}`,"Could not load Re Store products")}async function z({page:e=1,pageSize:t=24,maxPrice:r=10}={}){let s=new URLSearchParams({page:String(e),page_size:String(t),max_price:String(r)});return y(`inventory/under-price/products/?${s.toString()}`,"Could not load under-price products")}async function k(e,{page:t=1,pageSize:r=24}={}){let s=new URLSearchParams({page:String(t),page_size:String(r)});return y(`inventory/sellers/${e}/products/?${s.toString()}`,"Could not load seller products")}}};var t=require("../../webpack-runtime.js");t.C(e);var r=e=>t(t.s=e),s=t.X(0,[948,982,49],()=>r(4082));module.exports=s})();