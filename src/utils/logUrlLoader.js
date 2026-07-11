import { parseDatBuffer, parseLogFile } from './logParser';

const VIDEO_FILE_URL_REGEX = /\.(mp4|webm|ogg)$/i;

export const isVideoFileUrl = (url) => VIDEO_FILE_URL_REGEX.test(url);

export const resolveLogUrlCandidates = (inputUrl) => {
  let board = null;
  let id = null;
  let server = null;

  // 5ch のスレッドURLから dat 候補を作る
  const fivechMatch = inputUrl.match(
    /https?:\/\/([^.]+\.5ch\.net)\/test\/read\.cgi\/([^/]+)\/(\d+)/
  );
  if (fivechMatch) {
    server = fivechMatch[1];
    board = fivechMatch[2];
    id = fivechMatch[3];

    const candidates = [`https://${server}/${board}/dat/${id}.dat`];
    if (id.length >= 4) {
      candidates.push(`https://${server}/${board}/oyster/${id.slice(0, 4)}/${id}.dat`);
    }
    return candidates;
  }

  // eddibb / kyodemo のスレッドURLから dat 候補を作る
  const eddibbMatch = inputUrl.match(/bbs\.eddibb\.cc\/(?:test\/read\.cgi\/)?([^/]+)\/(\d+)/);
  if (eddibbMatch) {
    board = eddibbMatch[1];
    id = eddibbMatch[2];
  }

  const kyodemoMatch = inputUrl.match(/kyodemo\.net\/sdemo\/r\/e_e_([^/]+)\/(\d+)/);
  if (kyodemoMatch) {
    board = kyodemoMatch[1];
    id = kyodemoMatch[2];
  }

  if (board && id) {
    const candidates = [`https://bbs.eddibb.cc/${board}/dat/${id}.dat`];
    if (id.length >= 5) {
      candidates.push(
        `https://bbs.eddibb.cc/${board}/kako/${id.slice(0, 4)}/${id.slice(0, 5)}/${id}.dat`
      );
    }
    return candidates;
  }

  return [inputUrl];
};

const isExternalUrl = (targetUrl) =>
  targetUrl.startsWith('http') &&
  !targetUrl.includes('localhost') &&
  !targetUrl.includes('127.0.0.1');

const base64ToArrayBuffer = (base64Text) => {
  const binaryString = atob(base64Text);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
};

const fetchViaExtension = (targetUrl, timeoutMs = 10000) => {
  return new Promise((resolve, reject) => {
    const requestId = `fetch_${Date.now()}_${Math.random()}`;

    const handleResponse = (event) => {
      if (event.source !== window) return;
      if (event.data?.type === 'DANMAKU_FETCH_RESPONSE' && event.data?.requestId === requestId) {
        window.removeEventListener('message', handleResponse);
        if (event.data.error) {
          reject(new Error(event.data.error));
        } else if (event.data.data) {
          resolve(base64ToArrayBuffer(event.data.data));
        } else {
          reject(new Error('No data received'));
        }
      }
    };

    window.addEventListener('message', handleResponse);
    window.postMessage(
      {
        type: 'DANMAKU_FETCH_REQUEST',
        requestId,
        url: targetUrl,
      },
      '*'
    );

    setTimeout(() => {
      window.removeEventListener('message', handleResponse);
      reject(new Error('Extension fetch timeout'));
    }, timeoutMs);
  });
};

const fetchWithCorsProxies = async (targetUrl) => {
  const proxies = [
    (url) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
    (url) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
    (url) => `https://thingproxy.freeboard.io/fetch/${url}`,
  ];

  let lastErr = null;
  for (const getProxyUrl of proxies) {
    try {
      const fetchUrl = getProxyUrl(targetUrl);
      console.log('Trying CORS proxy:', fetchUrl);
      const response = await fetch(fetchUrl);
      if (response.ok) {
        return await response.arrayBuffer();
      }
      console.warn(`Proxy ${fetchUrl} returned ${response.status}`);
    } catch (err) {
      console.warn('Proxy fetch failed:', err);
      lastErr = err;
    }
  }
  throw lastErr || new Error('All CORS proxies failed');
};

export const fetchUrlAsArrayBuffer = async (targetUrl) => {
  if (isExternalUrl(targetUrl)) {
    try {
      const buffer = await fetchViaExtension(targetUrl);
      console.log('Fetched via extension:', targetUrl);
      return buffer;
    } catch (extErr) {
      console.warn('Extension fetch failed, trying CORS proxies:', extErr);
      return fetchWithCorsProxies(targetUrl);
    }
  }

  const response = await fetch(targetUrl);
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  return response.arrayBuffer();
};

export const decodeLogBuffer = (buffer) => {
  try {
    const utf8Decoder = new TextDecoder('utf-8', { fatal: true });
    return utf8Decoder.decode(buffer);
  } catch {
    console.log('UTF-8 decode failed, falling back to windows-31j');
    const sjisDecoder = new TextDecoder('windows-31j');
    return sjisDecoder.decode(buffer);
  }
};

export const parseFetchedLog = async (buffer, usedUrl) => {
  if (usedUrl.endsWith('.dat')) {
    const idMatch = usedUrl.match(/\/(\d+)\.dat$/);
    const name = idMatch ? `${idMatch[1]}.dat` : usedUrl.split('/').pop();
    return parseDatBuffer(buffer, name);
  }

  return parseLogFile(decodeLogBuffer(buffer));
};

export const loadLogFromUrl = async (url) => {
  const candidates = resolveLogUrlCandidates(url);
  let lastError = null;

  for (const candidate of candidates) {
    try {
      console.log('Trying to fetch:', candidate);
      const buffer = await fetchUrlAsArrayBuffer(candidate);
      const parsed = await parseFetchedLog(buffer, candidate);
      return { parsed, usedUrl: candidate };
    } catch (err) {
      console.warn('Fetch failed for:', candidate, err);
      lastError = err;
    }
  }

  throw lastError || new Error('All fetch attempts failed');
};
