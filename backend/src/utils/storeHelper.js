/**
 * Store (FITECH / ISMAYILLI) filtering helper for controllers.
 * Accepts the request object or a direct store string and returns a Prisma filter object.
 */
export const getStoreFilter = (reqOrStore) => {
    let storeVal = "FITECH";
    if (typeof reqOrStore === "string") {
        storeVal = reqOrStore.toUpperCase();
    } else if (reqOrStore && reqOrStore.query && reqOrStore.query.store) {
        storeVal = reqOrStore.query.store.toUpperCase();
    } else if (reqOrStore && reqOrStore.headers && reqOrStore.headers['x-store-type']) {
        storeVal = reqOrStore.headers['x-store-type'].toUpperCase();
    }
    
    // Fallback to FITECH if invalid value passed
    if (storeVal !== "FITECH" && storeVal !== "ISMAYILLI") {
        storeVal = "FITECH";
    }
    
    return { store: storeVal };
};
