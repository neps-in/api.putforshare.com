// src/dataProvider.js
import { fetchUtils } from "react-admin";

const apiUrl = import.meta.env.VITE_JSON_SERVER_URL;
const httpClient = fetchUtils.fetchJson;

export async function getList({ cursor, dir, search }) {
  let url = `${apiUrl}/s3-browser/?`;

  if (cursor) url += `cursor=${encodeURIComponent(cursor)}&`;
  if (dir) url += `dir=${encodeURIComponent(dir)}&`;
  if (search) url += `search=${encodeURIComponent(search)}&`;

  const { json } = await httpClient(url);
  console.info("S3 list call", { cursor, dir, search });

  return {
    results: json.results || [],
    next_cursor: json.next_cursor || null,
  };
}

export const s3DataProvider = {
  getList: async (resource, params) => {
    const { dir, search } = params.filter || {};
    const { page, perPage } = params.pagination || { page: 1, perPage: 50 };

    // cursor per virtual page (RA compatibility)
    if (!s3DataProvider._cursorStore) {
      s3DataProvider._cursorStore = {};
    }

    let url = `${apiUrl}/s3-browser/?`;

    const cursor = s3DataProvider._cursorStore[page - 1];
    if (cursor) url += `cursor=${encodeURIComponent(cursor)}&`;

    if (dir) url += `dir=${encodeURIComponent(dir)}&`;
    if (search) url += `search=${encodeURIComponent(search)}&`;

    const { json } = await httpClient(url);

    if (json.next_cursor) {
      s3DataProvider._cursorStore[page] = json.next_cursor;
    }

    return {
      data: (json.results || []).map((item) => ({
        ...item,
        id: item.full_path, // REQUIRED by RA
      })),

      // Fake total to keep RA pagination working
      total: json.next_cursor ? page * perPage + 1 : page * perPage,
    };
  },

  // Stub methods to satisfy RA
  getOne: () => Promise.reject(),
  getMany: () => Promise.reject(),
  getManyReference: () => Promise.reject(),
  create: () => Promise.reject(),
  update: () => Promise.reject(),
  delete: () => Promise.reject(),
};

/**
 * Cursor-based S3 list fetcher
 * Used by S3PhotoList (Load More / Infinite scroll)
 */
// export async function getList({ cursor, dir, search }) {
//   let url = `${apiUrl}/s3-browser/?`;

//   if (cursor) url += `cursor=${encodeURIComponent(cursor)}&`;
//   if (dir) url += `dir=${encodeURIComponent(dir)}&`;
//   if (search) url += `search=${encodeURIComponent(search)}&`;

//   const { json } = await httpClient(url);

//   return {
//     results: json.results || [],
//     next_cursor: json.next_cursor || null,
//   };
// }

// old one numbered pages
// export const s3DataProvider = {
//   getList: async (resource, params) => {
//     console.log("Res in s3DataProvider : ", resource);
//     const { page, perPage } = params.pagination;
//     const { dir, search } = params.filter;

//     // Construct the URL with our custom S3 params
//     let url = `${apiUrl}/s3-browser/${resource}/?page=${page}`;
//     if (dir) url += `&dir=${encodeURIComponent(dir)}`;
//     if (search) url += `&search=${encodeURIComponent(search)}`;

//     return httpClient(url).then(({ json }) => ({
//       data: json.results.map((item) => ({ ...item, id: item.full_path })), // Use full_path as unique ID
//       total: json.count, // Ensure your Django S3Pagination returns 'count'
//     }));
//   },
//   // Implement getOne, update, etc., as needed for your Photo model
// };
