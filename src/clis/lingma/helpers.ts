import type { IPage } from '../../types.js';
import { CDPBridge } from '../../browser/cdp.js';

export interface LingmaMessage {
  Role: 'User' | 'Assistant' | 'System';
  Type: 'message' | 'activity' | 'terminal' | 'status';
  Text: string;
}

export interface LingmaWaitResult {
  rows: LingmaMessage[];
  timedOut: boolean;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function ensureLingmaEditorMode(page: IPage): Promise<void> {
  await page.evaluate(`
    (() => {
      const editorTab = Array.from(document.querySelectorAll('button'))
        .find((node) => ((node.innerText || node.textContent || '').trim()) === 'Editor');
      if (editorTab instanceof HTMLElement) editorTab.click();
    })()
  `);
  await page.wait(0.5);
}

async function clickPoint(x: number, y: number): Promise<void> {
  const bridge = new CDPBridge();
  await bridge.connect({ timeout: 15 });
  try {
    await bridge.send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 });
    await sleep(50);
    await bridge.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 });
  } finally {
    await bridge.close().catch(() => {});
  }
}

async function pressShortcut(key: 'N'): Promise<void> {
  const bridge = new CDPBridge();
  await bridge.connect({ timeout: 15 });
  try {
    const modifiers = process.platform === 'darwin' ? 4 : 2;
    await bridge.send('Input.dispatchKeyEvent', {
      type: 'keyDown',
      key: process.platform === 'darwin' ? 'Meta' : 'Control',
      code: process.platform === 'darwin' ? 'MetaLeft' : 'ControlLeft',
      windowsVirtualKeyCode: process.platform === 'darwin' ? 91 : 17,
      nativeVirtualKeyCode: process.platform === 'darwin' ? 91 : 17,
      modifiers,
    });
    await sleep(50);
    await bridge.send('Input.dispatchKeyEvent', {
      type: 'keyDown',
      key,
      code: `Key${key}`,
      windowsVirtualKeyCode: key.charCodeAt(0),
      nativeVirtualKeyCode: key.charCodeAt(0),
      modifiers,
    });
    await sleep(50);
    await bridge.send('Input.dispatchKeyEvent', {
      type: 'keyUp',
      key,
      code: `Key${key}`,
      windowsVirtualKeyCode: key.charCodeAt(0),
      nativeVirtualKeyCode: key.charCodeAt(0),
      modifiers,
    });
    await sleep(50);
    await bridge.send('Input.dispatchKeyEvent', {
      type: 'keyUp',
      key: process.platform === 'darwin' ? 'Meta' : 'Control',
      code: process.platform === 'darwin' ? 'MetaLeft' : 'ControlLeft',
      windowsVirtualKeyCode: process.platform === 'darwin' ? 91 : 17,
      nativeVirtualKeyCode: process.platform === 'darwin' ? 91 : 17,
      modifiers: 0,
    });
  } finally {
    await bridge.close().catch(() => {});
  }
}

async function getVisibleComposerRect(page: IPage): Promise<{ x: number; y: number } | null> {
  const rectJson = await page.evaluate(`
    (() => {
      const composers = Array.from(document.querySelectorAll('.chat-input-contenteditable'))
        .filter((node) => node.getAttribute('contenteditable') === 'true')
        .filter((node) => {
          const rect = node.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0;
        });

      const preferred = composers.find((node) => {
        const placeholder = node.getAttribute('data-placeholder') || '';
        return /规划与编程|直接提问/.test(placeholder);
      }) || composers.at(-1);

      if (!preferred) return '';

      const rect = preferred.getBoundingClientRect();
      return JSON.stringify({
        x: rect.left + Math.min(24, rect.width / 2),
        y: rect.top + Math.min(24, rect.height / 2),
      });
    })()
  `);

  if (!rectJson || typeof rectJson !== 'string') return null;
  return JSON.parse(rectJson) as { x: number; y: number };
}

async function getVisibleSendButtonRect(page: IPage): Promise<{ x: number; y: number } | null> {
  const rectJson = await page.evaluate(`
    (() => {
      const footers = Array.from(document.querySelectorAll('.agentchat-footer .flex'))
        .filter((node) => {
          const rect = node.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0;
        });
      const footer = footers.at(-1);
      if (!footer) return '';

      const buttons = Array.from(footer.querySelectorAll('button[aria-label="Send message"], a[aria-label="Send message"], [aria-label="Send message"]'));
      const button = buttons.find((node) => {
        const rect = node.getBoundingClientRect();
        const disabled = node.disabled === true || node.getAttribute('aria-disabled') === 'true';
        return rect.width > 0 && rect.height > 0 && !disabled;
      });
      if (!button) return '';
      const rect = button.getBoundingClientRect();
      return JSON.stringify({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
    })()
  `);

  if (!rectJson || typeof rectJson !== 'string') return null;
  return JSON.parse(rectJson) as { x: number; y: number };
}

async function getVisibleElementRectByLabel(page: IPage, pattern: string): Promise<{ x: number; y: number } | null> {
  const rectJson = await page.evaluate(`
    ((rawPattern) => {
      const regex = new RegExp(rawPattern, 'i');
      const candidates = Array.from(document.querySelectorAll('button, a, [role="button"]'))
        .map((node) => {
          const text = (node.innerText || node.textContent || '').trim();
          const aria = node.getAttribute('aria-label') || '';
          const title = node.getAttribute('title') || '';
          const tooltip = node.getAttribute('data-tooltip') || node.getAttribute('data-tooltip-id') || '';
          const rect = node.getBoundingClientRect();
          const disabled = node.disabled === true || node.getAttribute('aria-disabled') === 'true';
          const label = [text, aria, title, tooltip].filter(Boolean).join(' ');
          return { label, rect, disabled };
        })
        .filter(({ label, rect, disabled }) => rect.width > 0 && rect.height > 0 && !disabled && regex.test(label));

      const target = candidates.at(-1);
      if (!target) return '';
      return JSON.stringify({ x: target.rect.left + target.rect.width / 2, y: target.rect.top + target.rect.height / 2 });
    })(${JSON.stringify(pattern)})
  `);

  if (!rectJson || typeof rectJson !== 'string') return null;
  return JSON.parse(rectJson) as { x: number; y: number };
}

function formatLastArg(last?: number): string {
  return typeof last === 'number' ? String(last) : 'undefined';
}

export async function extractLingmaMessages(page: IPage, last?: number): Promise<LingmaMessage[]> {
  return page.evaluate(`
    (function(lastCount) {
      function getClassName(node) {
        return typeof node.className === 'string'
          ? node.className
          : (typeof node.getAttribute === 'function' ? (node.getAttribute('class') || '') : '');
      }

      function cleanText(text) {
        const lines = String(text || '')
          .split(/\\r?\\n/)
          .map((line) => line.trim())
          .filter(Boolean);
        const deduped = [];
        for (const line of lines) {
          if (deduped[deduped.length - 1] !== line) deduped.push(line);
        }
        return deduped.join('\\n');
      }

      function summarizeTerminal(node) {
        const commandNode = node.querySelector('.terminal-tool-content-cmd pre code, .terminal-tool-content-cmd pre');
        let command = cleanText(commandNode ? commandNode.innerText || commandNode.textContent : '');

        if (!command) {
          const lines = cleanText(node.innerText || node.textContent).split('\\n');
          command = lines.length > 1 ? lines[1] : '';
        }

        const exitNode = node.querySelector('.terminal-tool-operation');
        const exitText = cleanText(exitNode ? exitNode.innerText || exitNode.textContent : '');
        const exitMatch = exitText.match(/Exit Code:\\s*(-?\\d+)/i);

        const parts = [];
        if (command) parts.push(command);
        if (exitMatch) parts.push('Exit Code: ' + exitMatch[1]);
        return parts.join('\\n');
      }

      function summarizeActivity(node) {
        const parts = [];
        const header = node.querySelector('.collapsible-card-header');
        const headerText = cleanText(header ? header.innerText || header.textContent : '');
        if (headerText) parts.push(headerText);

        const readTools = Array.from(node.querySelectorAll('.read_file_tool'));
        for (const tool of readTools) {
          const status = cleanText((tool.querySelector('.read_file_tool_status') || {}).innerText || '');
          const file = cleanText((tool.querySelector('.read_file_tool_filename') || {}).innerText || '');
          const line = [status, file].filter(Boolean).join(' ');
          if (line) parts.push(line);
        }

        const searchTools = Array.from(node.querySelectorAll('.search_tool'));
        for (const tool of searchTools) {
          const name = cleanText((tool.querySelector('.search_tool_name') || {}).innerText || '');
          const extras = Array.from(tool.querySelectorAll('.search_tool_extra'))
            .map((el) => cleanText(el.innerText || el.textContent))
            .filter(Boolean)
            .join(' ');
          const line = [name, extras].filter(Boolean).join(' ');
          if (line) parts.push(line);
        }

        if (parts.length === 0) {
          return cleanText(node.innerText || node.textContent);
        }

        return cleanText(parts.join('\\n'));
      }

      function classify(node) {
        const className = getClassName(node);
        const text = cleanText(node.innerText || node.textContent);
        if (!text) return null;

        if (className.includes('user-message-wrapper')) {
          return { Role: 'User', Type: 'message', Text: text };
        }

        if (node.querySelector('.tool-container.terminal-tool')) {
          const terminal = summarizeTerminal(node);
          return terminal ? { Role: 'Assistant', Type: 'terminal', Text: terminal } : null;
        }

        if (className.includes('activity-group-wrapper') || node.querySelector('.read_file_tool, .search_tool')) {
          const activity = summarizeActivity(node);
          return activity ? { Role: 'Assistant', Type: 'activity', Text: activity } : null;
        }

        return { Role: 'Assistant', Type: 'message', Text: text };
      }

      const nodes = Array.from(document.querySelectorAll('.conversation-section > [data-message-id]'));

      const items = nodes.map(classify).filter(Boolean);
      if (typeof lastCount === 'number' && lastCount > 0) {
        return items.slice(-lastCount);
      }
      return items;
    })(${formatLastArg(last)})
  `) as Promise<LingmaMessage[]>;
}

export async function countLingmaMessages(page: IPage): Promise<number> {
  const items = await extractLingmaMessages(page);
  return items.length;
}

export async function getLingmaCurrentModel(page: IPage): Promise<string> {
  await ensureLingmaEditorMode(page);
  const currentModel = await page.evaluate(`
    (() => {
      const roots = Array.from(document.querySelectorAll('.master-inline-chat-wrapper .agentchat-footer .flex, .agentchat-footer .flex'));
      const root = roots.find((node) => {
        const rect = node.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      });
      if (!root) return 'Unknown';

      const selector = Array.from(root.querySelectorAll('.select2-component'))
        .find((node) => {
          const rect = node.getBoundingClientRect();
          const cls = typeof node.className === 'string' ? node.className : (node.getAttribute('class') || '');
          const text = ((node.innerText || node.textContent || '').trim());
          return rect.width > 0 && rect.height > 0 && text.length > 0 && !cls.includes('chat-mode-switcher');
        });

      if (!selector) return 'Unknown';
      return (selector.innerText || selector.textContent || '').trim() || 'Unknown';
    })()
  `);

  return String(currentModel || 'Unknown');
}

export async function switchLingmaModel(page: IPage, desiredModel: string): Promise<boolean> {
  await ensureLingmaEditorMode(page);
  const currentModel = await getLingmaCurrentModel(page);
  if (currentModel.toLowerCase() === desiredModel.toLowerCase()) return true;

  const opened = await page.evaluate(`
    (() => {
      const roots = Array.from(document.querySelectorAll('.master-inline-chat-wrapper .agentchat-footer .flex, .agentchat-footer .flex'));
      const root = roots.find((node) => {
        const rect = node.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      });
      if (!root) return false;

      const selector = Array.from(root.querySelectorAll('.select2-component'))
        .find((node) => {
          const rect = node.getBoundingClientRect();
          const cls = typeof node.className === 'string' ? node.className : (node.getAttribute('class') || '');
          const text = ((node.innerText || node.textContent || '').trim());
          return rect.width > 0 && rect.height > 0 && text.length > 0 && !cls.includes('chat-mode-switcher');
        });

      if (!(selector instanceof HTMLElement)) return false;
      selector.click();
      return true;
    })()
  `);

  if (!opened) return false;
  await page.wait(0.5);

  const switched = await page.evaluate(`
    ((target) => {
      const options = Array.from(document.querySelectorAll('.select2-dropdown.model-selector-dropdown .select2-option, .select2-dropdown.model-selector-dropdown .select2-option-text'));
      for (const node of options) {
        const rect = node.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0) continue;
        const text = ((node.innerText || node.textContent || '').trim());
        if (!text) continue;
        if (text.toLowerCase().includes(target.toLowerCase())) {
          node.click();
          return true;
        }
      }
      return false;
    })(${JSON.stringify(desiredModel)})
  `);

  await page.wait(0.5);
  return Boolean(switched);
}

export async function startLingmaNewConversation(page: IPage): Promise<boolean> {
  await ensureLingmaEditorMode(page);

  const beforeCount = await countLingmaMessages(page).catch(() => 0);
  const rect = await getVisibleElementRectByLabel(page, '新建会话|新会话|新对话|new conversation|new chat|new session');
  let actionTaken = false;

  if (rect) {
    await clickPoint(rect.x, rect.y);
    actionTaken = true;
  } else {
    try {
      await page.pressKey(process.platform === 'darwin' ? 'Meta+N' : 'Control+N');
      actionTaken = true;
    } catch {
      await pressShortcut('N').catch(() => {});
      actionTaken = true;
    }
  }

  await page.wait(1);

  const afterCount = await countLingmaMessages(page).catch(() => beforeCount);
  return actionTaken && afterCount <= beforeCount;
}

export async function sendLingmaMessage(page: IPage, text: string): Promise<boolean> {
  await ensureLingmaEditorMode(page);

  const nativeSent = await sendLingmaMessageNative(page, text).catch(() => false);
  if (nativeSent) return true;

  const injected = await page.evaluate(`
    (function(message) {
      const composers = Array.from(document.querySelectorAll('.chat-input-contenteditable'))
        .filter((node) => node.getAttribute('contenteditable') === 'true');
      const composer = composers
        .filter((node) => {
          const rect = node.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0;
        })
        .at(-1);
      if (!composer) return false;

      composer.focus();
      const selection = window.getSelection();
      if (selection) {
        const range = document.createRange();
        range.selectNodeContents(composer);
        selection.removeAllRanges();
        selection.addRange(range);
      }

      let inserted = false;
      try {
        inserted = document.execCommand('insertText', false, message);
      } catch {}

      const currentText = (composer.innerText || composer.textContent || '').trim();
      if (!inserted || currentText !== message) {
        composer.textContent = '';
        const textNode = document.createTextNode(message);
        composer.appendChild(textNode);

        if (selection) {
          const range = document.createRange();
          range.selectNodeContents(composer);
          range.collapse(false);
          selection.removeAllRanges();
          selection.addRange(range);
        }

        composer.dispatchEvent(new InputEvent('beforeinput', {
          bubbles: true,
          cancelable: true,
          inputType: 'insertText',
          data: message,
        }));
        composer.dispatchEvent(new InputEvent('input', {
          bubbles: true,
          inputType: 'insertText',
          data: message,
        }));
      }

      return (composer.innerText || composer.textContent || '').trim().length > 0;
    })(${JSON.stringify(text)})
  `);

  if (!injected) return false;

  await page.wait(0.5);

  const clicked = await page.evaluate(`
    (() => {
      const buttons = Array.from(document.querySelectorAll('button[aria-label="Send message"], a[aria-label="Send message"], [aria-label="Send message"]'));
      const sendButton = buttons
        .filter((node) => {
          const rect = node.getBoundingClientRect();
          const disabled = node.disabled === true || node.getAttribute('aria-disabled') === 'true';
          return rect.width > 0 && rect.height > 0 && !disabled;
        })
        .at(-1);
      if (!(sendButton instanceof HTMLElement)) return false;
      sendButton.click();
      return true;
    })()
  `);

  if (!clicked) {
    await page.pressKey('Enter');
  }

  return true;
}

async function sendLingmaMessageNative(page: IPage, text: string): Promise<boolean> {
  const composerRect = await getVisibleComposerRect(page);
  if (!composerRect) return false;
  const { x, y } = composerRect;

  const bridge = new CDPBridge();
  await bridge.connect({ timeout: 15 });
  try {
    await bridge.send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 });
    await sleep(50);
    await bridge.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 });
    await sleep(150);
    await bridge.send('Input.insertText', { text });
    await sleep(250);

    const sendRect = await getVisibleSendButtonRect(page);
    if (sendRect) {
      await bridge.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: sendRect.x, y: sendRect.y, button: 'left', clickCount: 1 });
      await sleep(50);
      await bridge.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: sendRect.x, y: sendRect.y, button: 'left', clickCount: 1 });
      return true;
    }

    await bridge.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, nativeVirtualKeyCode: 13 });
    await sleep(50);
    await bridge.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, nativeVirtualKeyCode: 13 });
    return true;
  } finally {
    await bridge.close().catch(() => {});
  }
}

export async function waitForLingmaResponse(
  page: IPage,
  beforeCount: number,
  timeoutSeconds: number,
): Promise<LingmaWaitResult> {
  const pollInterval = 1;
  const maxPolls = Math.ceil(timeoutSeconds / pollInterval);
  let pendingRows: LingmaMessage[] = [];
  let lastAssistantText = '';
  let stableAssistantHits = 0;

  for (let i = 0; i < maxPolls; i++) {
    await page.wait(pollInterval);
    await clickLingmaContinueIfPresent(page).catch(() => false);

    const rows = await extractLingmaMessages(page);
    const newRows = rows.slice(beforeCount);
    if (newRows.length === 0) continue;

    pendingRows = newRows;

    const lastAssistant = [...newRows].reverse().find(
      (row) => row.Role === 'Assistant' && row.Type === 'message' && row.Text.trim().length > 0,
    );

    if (!lastAssistant) continue;

    if (lastAssistant.Text === lastAssistantText) {
      stableAssistantHits += 1;
    } else {
      lastAssistantText = lastAssistant.Text;
      stableAssistantHits = 1;
    }

    if (stableAssistantHits >= 2) {
      return { rows: newRows, timedOut: false };
    }
  }

  return { rows: pendingRows, timedOut: true };
}

export function getLastLingmaAssistantMessage(rows: LingmaMessage[]): LingmaMessage | undefined {
  return [...rows].reverse().find(
    (row) => row.Role === 'Assistant' && row.Type === 'message' && row.Text.trim().length > 0,
  );
}

export async function clickLingmaContinueIfPresent(page: IPage): Promise<boolean> {
  const bridge = new CDPBridge();
  await bridge.connect({ timeout: 15 });
  try {
    const rectJson = await page.evaluate(`
      (() => {
        const candidates = Array.from(document.querySelectorAll('button, a, [role="button"]'))
          .map((node) => {
            const text = ((node.innerText || node.textContent || '').trim());
            const aria = node.getAttribute('aria-label') || '';
            const rect = node.getBoundingClientRect();
            const disabled = node.disabled === true || node.getAttribute('aria-disabled') === 'true';
            return { node, text, aria, rect, disabled };
          })
          .filter(({ text, aria, rect, disabled }) => {
            const label = String(text) + ' ' + String(aria);
            return rect.width > 0 && rect.height > 0 && !disabled && /(继续|continue|继续生成|resume)/i.test(label);
          });

        const target = candidates.at(-1);
        if (!target) return '';
        return JSON.stringify({ x: target.rect.left + target.rect.width / 2, y: target.rect.top + target.rect.height / 2 });
      })()
    `);

    if (!rectJson || typeof rectJson !== 'string') return false;
    const rect = JSON.parse(rectJson) as { x: number; y: number };
    await bridge.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: rect.x, y: rect.y, button: 'left', clickCount: 1 });
    await sleep(50);
    await bridge.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: rect.x, y: rect.y, button: 'left', clickCount: 1 });
    return true;
  } finally {
    await bridge.close().catch(() => {});
  }
}
