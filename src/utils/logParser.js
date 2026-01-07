/**
 * Regex for parsing 5ch style text logs (copied from App.jsx)
 * Format: Number : Name : Date ID : Body (roughly)
 * Example: 1 : Name : 2025/10/12(日) 10:00:00.00 ID:User1ID
 */
const LOG_REGEX =
  /^(\d+)\s*:\s*(.*?)\s+(\d{4}\/\d{2}\/\d{2}\(.\)\s\d{2}:\d{2}:\d{2}\.\d{2})\s*ID:(.*)$/;

/**
 * Regex for simple chat log format
 * Format: HH:MM:SS : Message
 * Example: 00:00:01 : Hello World
 */
const SIMPLE_LOG_REGEX = /^(\d{1,2}:\d{2}:\d{2})\s*[:\s]\s*(.*)$/;

/**
 * Helper to parse JSON log format (Abema style)
 * Format: Array of { "time": number, "formattedTime": string, "comment": string }
 */
const parseJson = (text, fileId) => {
  let json;
  try {
    json = JSON.parse(text);
  } catch (e) {
    console.error('Failed to parse JSON', e);
    return { parsed: [], title: 'Invalid JSON', startDate: 0 };
  }

  if (!Array.isArray(json)) {
    return { parsed: [], title: 'Invalid JSON Log', startDate: 0 };
  }

  const parsed = json.map((item, index) => {
    // time is in seconds, convert to ms for rawTime
    const rawTime = Math.round(item.time * 1000);

    return {
      id: `${fileId}-${index}`,
      originalResNum: index + 1,
      name: 'Abema User', // Generic name since it's not in the log
      userId: '', // No ID in this format
      rawTime: rawTime,
      dateDisplay: item.formattedTime,
      text: item.comment,
      color: '#ffffff',
      type: 'scroll',
      sourceFileId: fileId,
    };
  });

  // For this relative time format, we set startDate to 0 so that rawTime (offset from 0)
  // matches the video timestamp directly.
  return { parsed, title: 'Abema Log', startDate: 0 };
};

/**
 * Helper to decode HTML entities (from datParser.js)
 */
const decodeEntities = (str) => {
  if (!str) return '';
  return str
    .replace(/&gt;/g, '>')
    .replace(/&lt;/g, '<')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(dec))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)));
};

/**
 * Helper to strip HTML tags (from datParser.js)
 * Preserves anchor text from 5ch-style links: <a href="...">&gt;&gt;5</a> -> >>5
 */
const stripTags = (str) => {
  if (!str) return '';
  // First, extract anchor text from 5ch-style links and normalize them
  // Pattern: <a href="...">&gt;&gt;N</a> or <a href="...">N</a>
  let result = str.replace(/<a[^>]*>(&gt;&gt;|>>)(\d+)<\/a>/gi, '>>$2');
  // Remove remaining HTML tags
  result = result.replace(/<\/?[^>]+(>|$)/g, '');
  return result;
};

/**
 * Parses a .dat file content (Shift_JIS encoded ArrayBuffer)
 */
const parseDat = (buffer, fileId) => {
  const decoder = new TextDecoder('windows-31j');
  const text = decoder.decode(buffer);
  const lines = text.split('\n');
  const parsed = [];
  let title = '';

  lines.forEach((line, index) => {
    if (!line.trim()) return;

    // Format: Name<>Email<>Date ID<>Body<>Title
    const parts = line.split('<>');
    if (parts.length < 4) return;

    const name = stripTags(parts[0]);
    // email = parts[1]
    const dateIdStr = parts[2];
    // Process body: <br> to \n first, then stripTags (to handle 5ch anchor links), then decode entities
    const rawBody = parts[3].replace(/<br\s*\/?>/gi, '\n');
    const body = decodeEntities(stripTags(rawBody));
    if (!title && parts[4]) title = decodeEntities(stripTags(parts[4].trim()));

    // Parse Date and ID
    let date = dateIdStr;
    let id = '';
    const idMatch = dateIdStr.match(/ID:(\S+)$/);
    if (idMatch) {
      id = idMatch[1];
      date = dateIdStr.replace(/ ID:\S+$/, '').trim();
    }

    // Normalize date to timestamp
    const cleanDateStr = date.replace(/\(.\)/, '');
    const timestamp = new Date(cleanDateStr).getTime();

    parsed.push({
      id: `${fileId}-${index + 1}`,
      originalResNum: index + 1,
      name: name,
      userId: id,
      rawTime: timestamp,
      dateDisplay: date,
      text: body,
      color: '#ffffff',
      type: 'scroll',
      sourceFileId: fileId,
    });
  });

  const startDate = parsed.length > 0 ? parsed[0].rawTime : 0;
  return { parsed, title: title || 'Log File', startDate };
};

/**
 * Parses a .txt file content (UTF-8 string)
 */
const parseTxt = (text, fileId) => {
  const lines = text.split('\n');
  const parsed = [];
  let currentRes = null;
  let potentialTitle = '';
  let isBeforeFirstRes = true;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const match = line.match(LOG_REGEX);
    const simpleMatch = !match ? line.match(SIMPLE_LOG_REGEX) : null;

    if (match) {
      isBeforeFirstRes = false;
      if (currentRes) parsed.push(currentRes);

      const resNum = parseInt(match[1]);
      const name = match[2].trim();
      const dateStr = match[3];
      const userId = match[4].trim();
      const cleanDateStr = dateStr.replace(/\(.\)/, '');
      const timestamp = new Date(cleanDateStr).getTime();

      currentRes = {
        id: `${fileId}-${resNum}`,
        originalResNum: resNum,
        name: name,
        userId: userId,
        rawTime: timestamp,
        dateDisplay: dateStr,
        text: '',
        color: '#ffffff',
        type: 'scroll',
        sourceFileId: fileId,
      };
    } else if (simpleMatch) {
      // Simple format parsing
      const timeStr = simpleMatch[1]; // HH:MM:SS
      const body = simpleMatch[2];

      // Generate pseudo timestamp (today + time)
      // Or relative to start?
      // Let's assume today for date part, but we mainly care about time part.
      // Actually, danmakuUtils uses rawTime.
      // Let's use a fixed base date so time diffs work correctly.
      const baseDate = new Date();
      const [h, m, s] = timeStr.split(':').map(Number);
      baseDate.setHours(h, m, s, 0);

      currentRes = {
        id: `${fileId}-${i + 1}`,
        originalResNum: i + 1,
        name: 'LogUser',
        userId: 'SimpleLog',
        rawTime: baseDate.getTime(),
        dateDisplay: timeStr,
        text: body,
        color: '#ffffff',
        type: 'scroll',
        sourceFileId: fileId,
      };
      parsed.push(currentRes);
      currentRes = null; // Single line per comment usually in this format
    } else if (currentRes) {
      if (line && !line.startsWith('!metadent')) {
        currentRes.text += (currentRes.text ? '\n' : '') + line;
      }
    } else if (isBeforeFirstRes && line.length > 0 && !line.startsWith('!metadent')) {
      if (!potentialTitle) potentialTitle = line;
    }
  }
  if (currentRes) parsed.push(currentRes);
  const startDate = parsed.length > 0 ? parsed[0].rawTime : 0;
  return { parsed, title: potentialTitle || 'Log File', startDate };
};

/**
 * Parses HTML content from bbs.eddibb.cc or similar 2ch-style read.cgi pages.
 * Structure usually involves <dl>, <dt>, <dd>.
 * <dt>1 ：<font color=green><b>Name</b></font>：2025/10/12(日) 10:00:00.00 ID:User1ID<dd> Body <br><br>
 */
const parseHtml = (html, fileId) => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const title = doc.title || 'URL Log';
  const parsed = [];

  const dts = doc.querySelectorAll('dt');
  const dds = doc.querySelectorAll('dd');

  // Basic validation
  if (dts.length === 0 || dts.length !== dds.length) {
    // Fallback: try to parse as dat if it looks like dat but was returned as html?
    // Or maybe it's a raw text log?
    // For now, return empty if structure doesn't match.
    return { parsed: [], title };
  }

  dts.forEach((dt, index) => {
    const dd = dds[index];
    const dtText = dt.textContent; // "1 ：Name：2025/10/12(日) 10:00:00.00 ID:User1ID"

    // Parse DT
    // Regex to match: Number : Name : Date ID
    // Note: Name might be inside font/b tags, but textContent flattens it.
    // Separators can be full-width colon "："
    const match = dtText.match(
      /^(\d+)\s*[：:]\s*(.*?)\s*[：:]\s*(\d{4}\/\d{2}\/\d{2}\(.\)\s\d{2}:\d{2}:\d{2}\.\d{2})\s*ID:(.*)$/
    );

    let resNum = index + 1;
    let name = 'Unknown';
    let dateStr = '';
    let userId = '';
    let timestamp = 0;

    if (match) {
      resNum = parseInt(match[1]);
      name = match[2].trim();
      dateStr = match[3];
      userId = match[4].trim();
      const cleanDateStr = dateStr.replace(/\(.\)/, '');
      timestamp = new Date(cleanDateStr).getTime();
    } else {
      // Fallback parsing if regex fails (e.g. different format)
      // Try to extract date at least
      const dateMatch = dtText.match(/(\d{4}\/\d{2}\/\d{2}\(.\)\s\d{2}:\d{2}:\d{2}\.\d{2})/);
      if (dateMatch) {
        dateStr = dateMatch[1];
        const cleanDateStr = dateStr.replace(/\(.\)/, '');
        timestamp = new Date(cleanDateStr).getTime();
      }
    }

    // Parse DD (Body)
    // innerHTML preserves <br> and anchors
    let body = dd.innerHTML;

    // Clean up body
    // Replace <br> with \n
    body = body.replace(/<br\s*\/?>/gi, '\n');
    // Remove other tags but keep text? Or keep anchors?
    // For now, let's strip tags but maybe keep anchors as text for now,
    // since our Sidebar parses >>N from text.
    // Actually, if the HTML has <a href="../test/read.cgi/...">>>1</a>, we want ">>1".
    // So stripTags is good, but we need to ensure ">>1" text remains.
    body = stripTags(body);
    body = decodeEntities(body).trim();

    parsed.push({
      id: `${fileId}-${resNum}`,
      originalResNum: resNum,
      name: name,
      userId: userId,
      rawTime: timestamp,
      dateDisplay: dateStr,
      text: body,
      color: '#ffffff',
      type: 'scroll',
      sourceFileId: fileId,
    });
  });

  const startDate = parsed.length > 0 ? parsed[0].rawTime : 0;
  return { parsed, title, startDate };
};

/**
 * Main entry point for log parsing
 * @param {File|string} input - The file object or HTML string
 * @param {string} [forcedId] - Optional ID for the file
 * @returns {Promise<{parsed: Array, title: string, id: string, name: string}>}
 */
export const parseLogFile = async (input, forcedId = null) => {
  const fileId = forcedId || Date.now() + Math.random().toString(36).substr(2, 9);

  // Check if input is File object
  if (typeof input === 'object' && input.name) {
    const isDat = input.name.endsWith('.dat');
    const isJson = input.name.endsWith('.json');

    if (isDat) {
      const buffer = await input.arrayBuffer();
      const { parsed, title, startDate } = parseDat(buffer, fileId);
      return {
        id: fileId,
        name: input.name,
        title: title,
        startDate: startDate,
        rawComments: parsed,
      };
    } else if (isJson) {
      const text = await input.text();
      const { parsed, title, startDate } = parseJson(text, fileId);
      return {
        id: fileId,
        name: input.name,
        title: title,
        startDate: startDate,
        rawComments: parsed,
      };
    } else {
      // Assume text/utf-8
      const text = await input.text();
      // Start of fallback logic for JSON content in .txt file or similar
      try {
        const jsonCheck = JSON.parse(text);
        if (Array.isArray(jsonCheck)) {
          const { parsed, title, startDate } = parseJson(text, fileId);
          return {
            id: fileId,
            name: input.name,
            title: title,
            startDate: startDate,
            rawComments: parsed,
          };
        }
      } catch {
        // Not JSON, continue to parse as text
      }
      // End fallback

      const { parsed, title, startDate } = parseTxt(text, fileId);
      return {
        id: fileId,
        name: input.name,
        title: title,
        startDate: startDate,
        rawComments: parsed,
      };
    }
  } else if (typeof input === 'string') {
    // Assume input is HTML content string
    const { parsed, title, startDate } = parseHtml(input, fileId);
    return {
      id: fileId,
      name: title, // Use title as name for URL logs
      title: title,
      startDate: startDate,
      rawComments: parsed,
    };
  }

  throw new Error('Unsupported input type');
};

/**
 * Helper to parse dat from buffer directly (for test log loading)
 */
export const parseDatBuffer = (buffer, fileName = 'test.dat') => {
  const fileId = 'test-log-' + Date.now();
  const { parsed, title, startDate } = parseDat(buffer, fileId);
  return {
    id: fileId,
    name: title && title !== 'Log File' ? title : fileName,
    title: title,
    startDate: startDate,
    rawComments: parsed,
  };
};
