import { promisifyRequest, type UseStore } from "idb-keyval";

const DB_NAME = "apitou-offline";
const DB_VERSION = 2;
const STORE_NAMES = ["match-events", "match-patches"] as const;

type StoreName = (typeof STORE_NAMES)[number];

let dbp: Promise<IDBDatabase> | undefined;

function getDB(): Promise<IDBDatabase> {
  if (dbp) return dbp;
  const request = indexedDB.open(DB_NAME, DB_VERSION);
  request.onupgradeneeded = () => {
    for (const name of STORE_NAMES) {
      if (!request.result.objectStoreNames.contains(name)) {
        request.result.createObjectStore(name);
      }
    }
  };
  dbp = promisifyRequest(request);
  dbp.then(
    (db) => {
      db.onclose = () => (dbp = undefined);
    },
    () => {
      dbp = undefined;
    },
  );
  return dbp;
}

/**
 * idb-keyval's own `createStore` opens the DB without a version, so each
 * store only gets created if it already existed when *that particular*
 * store's connection first ran `onupgradeneeded` — a second store added
 * later never gets created for anyone who already has the DB from before
 * (hit as "One of the specified object stores was not found" once
 * match-patch-queue.ts's store was added after match-events' was already
 * live). Both stores are created together here, in one shared upgrade.
 */
export function createSharedStore(storeName: StoreName): UseStore {
  return (txMode, callback) =>
    getDB().then((db) => callback(db.transaction(storeName, txMode).objectStore(storeName)));
}
