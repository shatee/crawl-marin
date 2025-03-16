import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

type Data = Record<string, string>;

const prevData = function () {
  try {
    return JSON.parse(fs.readFileSync(path.join(__dirname, '../var/data.json'), 'utf8')) as Data;
  } catch (e) {
    return {};
  }
}();

test('crawl', async ({ page }) => {
  await page.goto(process.env.CRAWL_URL!);

  const table = page.locator('.table-schedule').filter({
    hasText: process.env.CRAWL_NAME!
  }).first();

  const dates = await table.locator('.date').all();
  const schedules = await table.locator('.sche').all();
  
  const data = {};
  for (const i in dates) {
    const dateText = (await dates[i].textContent())!.replaceAll(/\s+/g, '');
    const scheduleText = (await schedules[i].textContent())!.replaceAll(/\s+/g, '');
    console.log(dateText, scheduleText);
    data[dateText] = scheduleText;
  }

  const diffs = diff(prevData, data);

  console.log(diffs);
  if (Object.keys(diffs).length > 0) {
    await notifySlack(Object.entries(diffs).map(([date, [prev, curr]]) => `${date}: ${prev} -> ${curr}`).join('\n'));
  }

  fs.writeFileSync(path.join(__dirname, '../var/data.json'), JSON.stringify(data, null, 2));
});

function diff(prevData: Data, newData: Data): Record<string, [string, string]> {
  const diff = {};
  for (const date in newData) {
    if (date in prevData && prevData[date] !== newData[date]) {
      diff[date] = [prevData[date], newData[date]];
    }
  }
  return diff;
}

async function notifySlack(str: string) {
  await fetch(process.env.SLACK_WEBHOOK_URL!, {
    method: 'POST',
    body: JSON.stringify({ text: str }),
  });
}

// test('get started link', async ({ page }) => {
//   await page.goto('https://playwright.dev/');

//   // Click the get started link.
//   await page.getByRole('link', { name: 'Get started' }).click();

//   // Expects page to have a heading with the name of Installation.
//   await expect(page.getByRole('heading', { name: 'Installation' })).toBeVisible();
// });
