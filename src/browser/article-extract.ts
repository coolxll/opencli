/**
 * Shared article extraction core.
 *
 * The extractor deliberately keeps listing-page discovery out of this module.
 * It accepts one document (the live page or supplied HTML), produces a small
 * number of deterministic candidates, and returns the best candidate together
 * with quality metrics. Readability remains the primary extractor; the block
 * scorer is only allowed to replace it when the result is clearly better.
 */

import * as fs from 'node:fs';
import { createRequire } from 'node:module';

const requireFromHere = createRequire(import.meta.url);

let cachedSources: { readability: string; readerable: string } | null = null;

function readabilitySources(): { readability: string; readerable: string } {
  if (cachedSources) return cachedSources;
  const readabilityPath = requireFromHere.resolve('@mozilla/readability/Readability.js');
  const readerablePath = requireFromHere.resolve('@mozilla/readability/Readability-readerable.js');
  cachedSources = {
    readability: fs.readFileSync(readabilityPath, 'utf8'),
    readerable: fs.readFileSync(readerablePath, 'utf8'),
  };
  return cachedSources;
}

export interface ExtractArticleOptions {
  /** Site-specific selectors removed from the cloned document. */
  cleanSelectors?: string[];
  /** Fallback chain when Readability and the secondary scorer find no usable candidate. */
  fallbackSelectors?: string[];
  /** Kept for backwards compatibility; extraction is no longer gated by readerable. */
  force?: boolean;
  /** Internal: parse supplied HTML instead of the live page document. */
  sourceHtml?: string;
  /** Internal: base URL used to resolve relative links in sourceHtml. */
  baseUrl?: string;
}

export type ExtractSource = 'readability' | 'secondary' | 'fallback' | 'raw-text' | 'pre';

export interface ExtractionQuality {
  textChars: number;
  proseChars: number;
  proseSentenceCount: number;
  proseRatio: number;
  linkDensity: number;
  botBlocked: boolean;
  passed: boolean;
}

export interface ExtractedArticle {
  html: string;
  title: string;
  byline?: string;
  publishedTime?: string;
  siteName?: string;
  source: ExtractSource;
  quality?: ExtractionQuality;
}

export const DEFAULT_FALLBACK_SELECTORS: string[] = [
  'main',
  '[role="main"]',
  '#main-content',
  '#main',
  '#content',
  '.content',
  'article',
  'body',
];

const MIN_FALLBACK_TEXT_LENGTH = 80;

/**
 * Build the JS expression evaluated in-page to extract the article. Exported
 * for testability — callers on the host side should use `extractArticle`.
 */
export function buildExtractArticleJs(options: ExtractArticleOptions = {}): string {
  const { readability, readerable } = readabilitySources();
  const cleanSelectors = options.cleanSelectors ?? [];
  const fallbackSelectors = options.fallbackSelectors ?? DEFAULT_FALLBACK_SELECTORS;
  const sourceHtml = options.sourceHtml ?? null;
  const baseUrl = options.baseUrl ?? null;
  const force = !!options.force;

  const readabilityLit = JSON.stringify(readability);
  const readerableLit = JSON.stringify(readerable);
  const cleanLit = JSON.stringify(cleanSelectors);
  const fallbackLit = JSON.stringify(fallbackSelectors);
  const sourceHtmlLit = JSON.stringify(sourceHtml);
  const baseUrlLit = JSON.stringify(baseUrl);

  return [
    '(() => {',
    `  const sourceHtml = ${sourceHtmlLit};`,
    `  const baseUrl = ${baseUrlLit};`,
    `  const force = ${JSON.stringify(force)};`,
    '  const sourceDoc = sourceHtml === null ? document : (() => {',
    '    const parsed = new DOMParser().parseFromString(sourceHtml, "text/html");',
    '    if (baseUrl && parsed.head) {',
    '      const base = parsed.createElement("base");',
    '      base.href = baseUrl;',
    '      parsed.head.prepend(base);',
    '    }',
    '    return parsed;',
    '  })();',
    `  const cleanSelectors = ${cleanLit};`,
    `  const fallbackSelectors = ${fallbackLit};`,
    '  const minFallbackText = ' + MIN_FALLBACK_TEXT_LENGTH + ';',
    `  const readabilitySrc = ${readabilityLit};`,
    `  const readerableSrc = ${readerableLit};`,
    '',
    '  function collapse(value) { return String(value || "").replace(/\\s+/g, " ").trim(); }',
    '  function textChars(root) { return collapse(root && root.textContent).length; }',
    '  function linkDensity(root) {',
    '    const total = textChars(root);',
    '    if (!total || !root || !root.querySelectorAll) return 0;',
    '    let linked = 0;',
    '    for (const a of root.querySelectorAll("a")) linked += collapse(a.textContent).length;',
    '    return linked / total;',
    '  }',
    '  function proseRoot(root) {',
    '    const clone = root.cloneNode(true);',
    '    for (const selector of ["pre", "code", "script", "style", "noscript", "svg", "nav"]) {',
    '      for (const node of clone.querySelectorAll(selector)) node.remove();',
    '    }',
    '    return clone;',
    '  }',
    '  function sentenceCount(text) {',
    '    const matches = String(text || "").match(/[^.!?。！？]+[.!?。！？]/g) || [];',
    '    return matches.filter(sentence => {',
    '      const value = collapse(sentence);',
    '      const latinTokens = value.match(/[A-Za-z0-9]+/g) || [];',
    '      return value.length >= 12 || latinTokens.length >= 3;',
    '    }).length;',
    '  }',
    '  function isBotBlocked(text) {',
    '    const lower = collapse(text).toLowerCase();',
    '    return [',
    '      "your submission has been received", "something went wrong while submitting",',
    '      "please verify you are a human", "please verify you are human",',
    '      "checking your browser", "enable javascript and cookies", "just a moment",',
    '      "attention required", "access denied", "cf-chl-captcha",',
    '    ].some(pattern => lower.includes(pattern));',
    '  }',
    '  function quality(root) {',
    '    const text = collapse(root && root.textContent);',
    '    const prose = collapse(proseRoot(root).textContent);',
    '    const total = text.length;',
    '    const proseChars = prose.length;',
    '    const ratio = total ? proseChars / total : 0;',
    '    const density = linkDensity(root);',
    '    const botBlocked = isBotBlocked(text);',
    '    const proseSentenceCount = sentenceCount(prose);',
    '    const passed = !botBlocked && total >= 200 && proseSentenceCount >= 2 && ratio >= 0.25 && density <= 0.55;',
    '    return { textChars: total, proseChars, proseSentenceCount, proseRatio: ratio, linkDensity: density, botBlocked, passed };',
    '  }',
    '  function qualityForText(text) {',
    '    const value = collapse(text);',
    '    return { textChars: value.length, proseChars: value.length, proseSentenceCount: sentenceCount(value), proseRatio: 1, linkDensity: 0, botBlocked: false, passed: value.length > 0 };',
    '  }',
    '  function clearlyBetter(next, current) {',
    '    if (!current) return true;',
    '    const a = next.quality; const b = current.quality;',
    '    if (a.botBlocked !== b.botBlocked) return !a.botBlocked;',
    '    if (a.passed !== b.passed) return a.passed;',
    '    const gained = a.proseChars >= Math.max(b.proseChars + 20, b.proseChars * 1.25);',
    '    const safe = a.proseRatio >= b.proseRatio - 0.05 && a.linkDensity <= b.linkDensity + 0.05;',
    '    return gained && safe;',
    '  }',
    '  function absoluteUrls(root) {',
    '    for (const el of root.querySelectorAll("a[href], img[src], img[srcset], video[poster], source[srcset]")) {',
    '      for (const attr of ["href", "src", "poster"]) {',
    '        const value = el.getAttribute(attr);',
    '        if (value && !value.startsWith("data:") && !value.startsWith("#")) {',
    '          try { el.setAttribute(attr, new URL(value, sourceDoc.baseURI).href); } catch {}',
    '        }',
    '      }',
    '    }',
    '  }',
    '  function normalize(root) {',
    '    for (const comment of (() => {',
    '      const walker = root.ownerDocument.createTreeWalker(root, 128); const nodes = []; let node;',
    '      while ((node = walker.nextNode())) nodes.push(node); return nodes;',
    '    })()) comment.remove();',
    '    for (const img of root.querySelectorAll("img")) {',
    '      const lazy = img.getAttribute("data-src") || img.getAttribute("data-original") || img.getAttribute("data-lazy-src");',
    '      if (!img.getAttribute("src") && lazy) img.setAttribute("src", lazy);',
    '    }',
    '    absoluteUrls(root);',
    '    const allowed = new Set(["href", "src", "srcset", "alt", "title", "controls", "poster", "colspan", "rowspan", "dir", "lang", "data-lang"]);',
    '    for (const el of [root, ...root.querySelectorAll("*")]) {',
    '      for (const attr of [...el.attributes]) if (!allowed.has(attr.name.toLowerCase())) el.removeAttribute(attr.name);',
    '      for (const text of (() => { const w = el.ownerDocument.createTreeWalker(el, 4); const xs = []; let n; while ((n = w.nextNode())) xs.push(n); return xs; })()) {',
    '        if (!text.parentElement?.closest("pre,code")) text.textContent = text.textContent.replace(/\\u00a0/g, " ");',
    '      }',
    '    }',
    '  }',
    '  function postClean(root) {',
    '    const selectors = ["script", "style", "noscript", "template", "nav", "[role=\\"navigation\\"]", "[role=\\"banner\\"]", "[role=\\"contentinfo\\"]", "form", "button", "input", "select", "textarea", "[aria-hidden=\\"true\\"]", ...cleanSelectors];',
    '    for (const selector of selectors) { try { for (const node of root.querySelectorAll(selector)) node.remove(); } catch {} }',
    '    normalize(root);',
    '  }',
    '  function candidateFromHtml(html, source, title, meta) {',
    '    const holder = sourceDoc.createElement("article");',
    '    holder.innerHTML = html || "";',
    '    postClean(holder);',
    '    const candidate = { html: holder.innerHTML, title: title || sourceDoc.title || "", source, quality: quality(holder) };',
    '    if (meta) Object.assign(candidate, meta);',
    '    return candidate;',
    '  }',
    '  function findBestBlock(doc) {',
    '    let best = null;',
    '    for (const el of doc.querySelectorAll("article, main, [role=\\"main\\"], section, div")) {',
    '      const total = textChars(el); if (total < 200) continue;',
    '      const paragraphs = [...el.querySelectorAll("p")];',
    '      const paragraphChars = paragraphs.reduce((sum, p) => sum + textChars(p), 0);',
    '      if (!paragraphChars && paragraphs.length === 0) continue;',
    '      const ratio = paragraphChars / Math.max(total, 1);',
    '      const density = linkDensity(el); if (density > 0.55) continue;',
    '      const marker = ((el.className || "") + " " + (el.id || "")).toLowerCase();',
    '      const contentBonus = /(article|content|post|entry|story|main|body)/.test(marker) ? 1.2 : 1;',
    '      const noisePenalty = /(nav|menu|sidebar|footer|header|comment|related|share|social|advert|promo)/.test(marker) ? 0.35 : 1;',
    '      const score = Math.max(paragraphChars, total * 0.5) * (0.5 + ratio) * (1 - density) * contentBonus * noisePenalty;',
    '      if (!best || score > best.score) best = { el, score };',
    '    }',
    '    return best;',
    '  }',
    '',
    '  // Preserve raw text and preformatted documents before DOM extraction.',
    '  const contentType = sourceDoc.contentType || "";',
    '  const rawText = sourceDoc.body ? sourceDoc.body.textContent || "" : "";',
    '  if (contentType && contentType !== "text/html" && contentType !== "application/xhtml+xml") {',
    '    return { source: "raw-text", html: "<pre>" + String(rawText).replace(/[&<>]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c])) + "</pre>", title: sourceDoc.title || "", quality: qualityForText(rawText) };',
    '  }',
    '  if (sourceDoc.body && sourceDoc.body.children.length === 1 && sourceDoc.body.children[0]?.tagName === "PRE") {',
    '    return { source: "pre", html: sourceDoc.body.outerHTML, title: sourceDoc.title || "", quality: qualityForText(rawText) };',
    '  }',
    '',
    '  // Keep the library source isolated from the surrounding IIFE.',
    '  const libs = (new Function(readabilitySrc + "\\n" + readerableSrc + "\\nreturn {" +',
    '    " Readability: typeof Readability !== \\"undefined\\" ? Readability : null," +',
    '    " isProbablyReaderable: typeof isProbablyReaderable !== \\"undefined\\" ? isProbablyReaderable : null" + " };"))();',
    '  const Readability = libs.Readability;',
    '  let cleanDoc = sourceDoc.cloneNode(true);',
    '  const cloneDoc = cleanDoc;',
    '  const preClean = ["style", "template", "canvas", "dialog"];',
    '  for (const selector of preClean) { try { for (const node of cleanDoc.querySelectorAll(selector)) node.remove(); } catch {} }',
    '  for (const selector of cleanSelectors) { try { for (const node of cleanDoc.querySelectorAll(selector)) node.remove(); } catch {} }',
    '  const readabilityDoc = cleanDoc.cloneNode(true);',
    '  let article = null;',
    '  if (typeof Readability === "function") { try { article = new Readability(readabilityDoc).parse(); } catch {} }',
    '  let selected = article && article.content ? candidateFromHtml(article.content, "readability", article.title || sourceDoc.title || "", { byline: article.byline || undefined, publishedTime: article.publishedTime || undefined, siteName: article.siteName || undefined }) : null;',
    '  const best = findBestBlock(cleanDoc);',
    '  if (best) {',
    '    const secondary = candidateFromHtml(best.el.outerHTML || best.el.innerHTML, "secondary", article?.title || sourceDoc.title || "");',
    '    if (clearlyBetter(secondary, selected)) selected = secondary;',
    '  }',
    '  if (!selected || !selected.quality.passed) {',
    '    for (const selector of fallbackSelectors) {',
    '      let el = null; try { el = cloneDoc.querySelector(selector); } catch { continue; }',
    '      if (!el || textChars(el) < minFallbackText) continue;',
    '      const fallback = candidateFromHtml(el.outerHTML || el.innerHTML, "fallback", article?.title || sourceDoc.title || "");',
    '      if (clearlyBetter(fallback, selected)) selected = fallback;',
    '    }',
    '  }',
    '  if (selected) return selected;',
    '  return null;',
    '})()',
  ].join('\n');
}

/** Extract an HTML string using the same in-page core without requiring jsdom at runtime. */
export function buildExtractArticleFromHtmlJs(
  html: string,
  url: string,
  options: Omit<ExtractArticleOptions, 'sourceHtml' | 'baseUrl'> = {},
): string {
  return buildExtractArticleJs({ ...options, sourceHtml: html, baseUrl: url });
}

export interface PageLike {
  evaluate(js: string): Promise<unknown>;
}

export async function extractArticle(
  page: PageLike,
  options: ExtractArticleOptions = {},
): Promise<ExtractedArticle | null> {
  const raw = await page.evaluate(buildExtractArticleJs(options));
  if (raw == null || typeof raw !== 'object') return null;
  const r = raw as Partial<ExtractedArticle> & { source?: string; quality?: ExtractionQuality };
  if (typeof r.html !== 'string' || typeof r.source !== 'string') return null;
  const source = r.source as ExtractSource;
  return {
    html: r.html,
    title: typeof r.title === 'string' ? r.title : '',
    ...(r.byline && { byline: r.byline }),
    ...(r.publishedTime && { publishedTime: r.publishedTime }),
    ...(r.siteName && { siteName: r.siteName }),
    source,
    ...(r.quality && { quality: r.quality }),
  };
}
