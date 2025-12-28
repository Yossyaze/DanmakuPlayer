// Image URL validation cache
const urlValidityCache = new Map();
const pendingChecks = new Map();

/**
 * Check if an image URL is valid (exists and returns image content type)
 * @param {string} url - Image URL to check
 * @returns {Promise<boolean>} - True if valid, false otherwise
 */
export const checkImageUrl = async (url) => {
    // Return cached result if available
    if (urlValidityCache.has(url)) {
        return urlValidityCache.get(url);
    }

    // Return pending promise if already checking
    if (pendingChecks.has(url)) {
        return pendingChecks.get(url);
    }

    // Create new check
    const checkPromise = (async () => {
        try {
            // Use fetch with HEAD method for lightweight check
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 3000); // 3s timeout
            
            const response = await fetch(url, {
                method: 'HEAD',
                mode: 'cors',
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            // Check if response is OK and content-type is image
            const contentType = response.headers.get('content-type') || '';
            const isValid = response.ok && contentType.startsWith('image/');
            
            urlValidityCache.set(url, isValid);
            pendingChecks.delete(url);
            return isValid;
        } catch {
            // CORS error, timeout, or network error - try fallback with Image element
            return new Promise((resolve) => {
                const img = new Image();
                const timeoutId = setTimeout(() => {
                    img.src = '';
                    urlValidityCache.set(url, false);
                    pendingChecks.delete(url);
                    resolve(false);
                }, 5000);
                
                img.onload = () => {
                    clearTimeout(timeoutId);
                    urlValidityCache.set(url, true);
                    pendingChecks.delete(url);
                    resolve(true);
                };
                img.onerror = () => {
                    clearTimeout(timeoutId);
                    urlValidityCache.set(url, false);
                    pendingChecks.delete(url);
                    resolve(false);
                };
                img.src = url;
            });
        }
    })();

    pendingChecks.set(url, checkPromise);
    return checkPromise;
};

/**
 * Check validity of multiple image URLs
 * @param {string[]} urls - Array of URLs to check
 * @returns {Promise<Map<string, boolean>>} - Map of URL to validity
 */
export const checkImageUrls = async (urls) => {
    const results = new Map();
    const promises = urls.map(async (url) => {
        const isValid = await checkImageUrl(url);
        results.set(url, isValid);
    });
    await Promise.all(promises);
    return results;
};

/**
 * Get cached validity for a URL (synchronous)
 * @param {string} url - URL to check
 * @returns {boolean|null} - True/false if cached, null if not checked yet
 */
export const getCachedValidity = (url) => {
    return urlValidityCache.has(url) ? urlValidityCache.get(url) : null;
};

/**
 * Clear the URL validity cache
 */
export const clearImageCache = () => {
    urlValidityCache.clear();
    pendingChecks.clear();
};
