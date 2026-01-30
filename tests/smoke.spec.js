const { test, expect } = require('@playwright/test');

const PAGES = [
  { name: 'Home', path: '/' },
  { name: 'Dodge & Collect', path: '/game-dodge-collect/' },
  { name: 'Snake', path: '/games/01-snake/' },
  { name: '2048', path: '/games/02-2048/' },
  { name: 'Tic-Tac-Toe', path: '/games/03-tic-tac-toe/' },
  { name: 'Memory Match', path: '/games/04-memory-match/' },
  { name: 'Flappy', path: '/games/05-flappy/' },
  { name: 'Breakout', path: '/games/06-breakout/' },
  { name: 'Whack-a-Mole', path: '/games/07-whack-a-mole/' },
  { name: 'Pong', path: '/games/08-pong/' },
  { name: 'Aim Trainer', path: '/games/09-aim-trainer/' },
  { name: 'Minesweeper', path: '/games/10-minesweeper/' }
];

function attachPageGuards(page) {
  const consoleErrors = [];
  const requestFailures = [];
  const badResponses = [];

  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });

  page.on('requestfailed', (req) => {
    requestFailures.push({ url: req.url(), error: req.failure()?.errorText });
  });

  page.on('response', (res) => {
    const s = res.status();
    // Catch missing assets (404 etc)
    if (s >= 400) badResponses.push({ url: res.url(), status: s });
  });

  return {
    async assertClean() {
      expect(requestFailures, `requestfailed: ${JSON.stringify(requestFailures, null, 2)}`).toEqual([]);
      expect(badResponses, `bad responses: ${JSON.stringify(badResponses, null, 2)}`).toEqual([]);
      expect(consoleErrors, `console errors: ${JSON.stringify(consoleErrors, null, 2)}`).toEqual([]);
    }
  };
}

for (const p of PAGES) {
  test(`${p.name} loads (no 4xx/5xx, no console errors)`, async ({ page }) => {
    const guards = attachPageGuards(page);

    await page.goto(p.path, { waitUntil: 'networkidle' });

    // For game pages, verify canvas exists + 2D context works.
    if (p.path.startsWith('/games/') || p.path.startsWith('/game-dodge-collect/')) {
      const ok = await page.evaluate(() => {
        const c = document.querySelector('canvas');
        if (!c) return { hasCanvas: false };
        let ctxOk = false;
        try { ctxOk = !!c.getContext('2d'); } catch { ctxOk = false; }
        return { hasCanvas: true, ctxOk, w: c.width, h: c.height };
      });
      expect(ok.hasCanvas).toBeTruthy();
      expect(ok.ctxOk).toBeTruthy();
      expect(ok.w).toBeGreaterThan(0);
      expect(ok.h).toBeGreaterThan(0);

      // Basic interaction (should not crash)
      await page.locator('canvas').click({ position: { x: 30, y: 30 } });
      await page.waitForTimeout(250);
    }

    await guards.assertClean();
  });
}
