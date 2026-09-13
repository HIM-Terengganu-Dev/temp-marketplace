import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

interface AccountConfig {
  account_name: string;
  access_token: string;
  advertiser_ids: string[];
}

interface CampaignRow {
  advertiser: string;
  advertiser_id: string;
  campaign_id: string;
  campaign_name: string;
  target_country: string;
  po: string;
  period: string;
  spend: number;
  cash_spend: number;
}

const ROOT_DIR = process.cwd();
const CREDENTIALS_PATH = path.join(ROOT_DIR, 'credentials/marketing/account.json');
const OUTPUT_DIR = path.join(ROOT_DIR, 'downloads/invoices');

function formatCurrency(amount: number): string {
  return amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function parseDateInput(input?: string): string {
  if (!input) {
    // Default yesterday
    const d = new Date(Date.now() - 24 * 3600 * 1000);
    return d.toISOString().slice(0, 10);
  }

  // Support DD/MM, DD/MM/YYYY, or YYYY-MM-DD
  if (input.includes('/')) {
    const parts = input.split('/');
    if (parts.length === 2) {
      const day = parts[0].padStart(2, '0');
      const month = parts[1].padStart(2, '0');
      const year = new Date().getFullYear();
      return `${year}-${month}-${day}`;
    }
    if (parts.length === 3) {
      const day = parts[0].padStart(2, '0');
      const month = parts[1].padStart(2, '0');
      let year = parts[2];
      if (year.length === 2) year = '20' + year;
      return `${year}-${month}-${day}`;
    }
  }

  return input;
}

async function fetchDayCampaigns(accessToken: string, advId: string, dateStr: string): Promise<CampaignRow[]> {
  const url = new URL('https://business-api.tiktok.com/open_api/v1.3/report/integrated/get/');
  url.searchParams.append('advertiser_id', advId);
  url.searchParams.append('report_type', 'BASIC');
  url.searchParams.append('data_level', 'AUCTION_CAMPAIGN');
  url.searchParams.append('dimensions', JSON.stringify(['campaign_id', 'stat_time_day']));
  url.searchParams.append('metrics', JSON.stringify(['campaign_name', 'spend', 'cash_spend']));
  url.searchParams.append('start_date', dateStr);
  url.searchParams.append('end_date', dateStr);
  url.searchParams.append('page_size', '100');

  const res = await fetch(url.toString(), {
    headers: { 'Access-Token': accessToken }
  });

  const data = await res.json();
  if (data.code !== 0) {
    throw new Error(`TikTok API Error: ${data.message} (code: ${data.code})`);
  }

  return (data.data?.list || [])
    .map((item: any) => ({
      advertiser: 'GMV MAX VOL2',
      advertiser_id: advId,
      campaign_id: item.dimensions.campaign_id,
      campaign_name: item.metrics.campaign_name,
      target_country: 'MY',
      po: '',
      period: `${dateStr} ~ ${dateStr}`,
      spend: parseFloat(item.metrics.spend || '0'),
      cash_spend: parseFloat(item.metrics.cash_spend || '0')
    }))
    .filter((row: CampaignRow) => row.spend > 0)
    .sort((a: CampaignRow, b: CampaignRow) => b.spend - a.spend);
}

function generateInvoiceHtml(dateStr: string, campaigns: CampaignRow[]): string {
  const [year, month, day] = dateStr.split('-');
  const dateObj = new Date(`${dateStr}T00:00:00Z`);
  const monthName = dateObj.toLocaleString('en-US', { month: 'long', timeZone: 'UTC' });
  const formattedInvoiceDate = `${day}, ${monthName}, ${year}`;

  const invoiceNo = `MYTT${year}${month}${day}0001`;
  const subtotal = campaigns.reduce((sum, c) => sum + c.spend, 0);
  const dstAmount = subtotal * 0.08;
  const totalPayable = subtotal + dstAmount;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Tax Invoice - ${invoiceNo}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 15mm 15mm 15mm 15mm;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      font-size: 10px;
      color: #111;
      line-height: 1.4;
      margin: 0;
      padding: 0;
    }
    .page {
      page-break-after: always;
      position: relative;
    }
    .page:last-child {
      page-break-after: avoid;
    }
    .header {
      margin-bottom: 20px;
    }
    .company-title {
      font-size: 13px;
      font-weight: 700;
    }
    .company-info {
      font-size: 10px;
      color: #333;
    }
    .doc-title {
      font-size: 20px;
      font-weight: 700;
      margin: 15px 0 10px 0;
      color: #000;
    }
    .bill-section {
      display: flex;
      justify-content: space-between;
      margin-bottom: 20px;
      border-top: 1px solid #ddd;
      padding-top: 12px;
    }
    .bill-col {
      width: 48%;
    }
    .label {
      font-weight: 600;
      color: #555;
    }
    .value {
      color: #111;
    }
    .bill-row {
      margin-bottom: 5px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 15px;
      margin-bottom: 15px;
      font-size: 9.5px;
    }
    th {
      background-color: #f7f7f8;
      border-bottom: 1.5px solid #bbb;
      text-align: left;
      padding: 7px 6px;
      font-weight: 700;
      color: #222;
    }
    td {
      padding: 7px 6px;
      border-bottom: 1px solid #e5e5e5;
      vertical-align: top;
    }
    .text-right {
      text-align: right;
    }
    .totals-table {
      width: 50%;
      margin-left: auto;
      margin-top: 15px;
      font-size: 10px;
    }
    .totals-table td {
      padding: 5px 8px;
      border: none;
    }
    .totals-table tr.highlight td {
      font-weight: 700;
      font-size: 11px;
      border-top: 1.5px solid #222;
      border-bottom: 2px solid #222;
    }
    .payment-box {
      margin-top: 25px;
      padding: 12px;
      background-color: #fafafa;
      border: 1px solid #e0e0e0;
      border-radius: 4px;
      font-size: 9.5px;
    }
    .payment-title {
      font-weight: 700;
      margin-bottom: 6px;
      font-size: 10px;
    }
    .notice {
      margin-top: 15px;
      font-weight: 600;
      font-size: 9px;
      color: #555;
    }
    .footer-thanks {
      margin-top: 25px;
      font-weight: 600;
      font-size: 11px;
      color: #222;
    }
    .section-header {
      font-size: 13px;
      font-weight: 700;
      margin-bottom: 8px;
      padding-bottom: 4px;
      border-bottom: 1.5px solid #333;
    }
    .campaign-name {
      max-width: 200px;
      word-break: break-word;
    }
  </style>
</head>
<body>

  <!-- PAGE 1: TAX INVOICE SUMMARY -->
  <div class="page">
    <div class="header">
      <div class="company-title">TIKTOK PTE. LTD.</div>
      <div class="company-info">Address: 1 Raffles Quay #26-10, Singapore (048583)</div>
      <div class="company-info">DST Registration: 20000322</div>
    </div>

    <div class="doc-title">Tax Invoice</div>

    <div class="bill-section">
      <div class="bill-col">
        <div style="font-weight: 700; margin-bottom: 6px; font-size: 11px;">Bill To:</div>
        <div class="bill-row"><span class="label">Client Name: </span><span class="value">HIM & HER WELLNESS PRODUCT SDN. BHD.</span></div>
        <div class="bill-row"><span class="label">Billing Address: </span><span class="value">2015k tingkat atas, taman pemin jaya, chendering, Kuala Terengganu, Terengganu, Malaysia 21080</span></div>
        <div class="bill-row"><span class="label">Billing Contact: </span><span class="value">hafizie</span></div>
        <div class="bill-row"><span class="label">Billing Email: </span><span class="value">forhimclinic@hotmail.com</span></div>
      </div>
      <div class="bill-col">
        <div style="font-weight: 700; margin-bottom: 6px; font-size: 11px;">Invoice Details:</div>
        <div class="bill-row"><span class="label">Invoice No.: </span><span class="value" style="font-weight: 700;">${invoiceNo}</span></div>
        <div class="bill-row"><span class="label">Invoice Date: </span><span class="value">${formattedInvoiceDate}</span></div>
        <div class="bill-row"><span class="label">Contract #: </span><span class="value">CON7420347513821249553</span></div>
        <div class="bill-row"><span class="label">Billing Period: </span><span class="value">${dateStr} ~ ${dateStr} (Daily Autopay)</span></div>
        <div class="bill-row"><span class="label">Payment Due Date: </span><span class="value">Paid</span></div>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th style="width: 50%;">Client Name</th>
          <th style="width: 30%;">Description</th>
          <th style="width: 20%;" class="text-right">Amount (MYR)</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>HIM & HER WELLNESS PRODUCT SDN. BHD.</td>
          <td>Advertising Fees (Daily Consumption - ${dateStr})</td>
          <td class="text-right">${formatCurrency(subtotal)}</td>
        </tr>
      </tbody>
    </table>

    <table class="totals-table">
      <tr>
        <td>Subtotal (excluding DST):</td>
        <td class="text-right">${formatCurrency(subtotal)}</td>
      </tr>
      <tr>
        <td>Note: DST@8%:</td>
        <td class="text-right">${formatCurrency(dstAmount)}</td>
      </tr>
      <tr class="highlight">
        <td>Total Amount Payable:</td>
        <td class="text-right">MYR ${formatCurrency(totalPayable)}</td>
      </tr>
    </table>

    <div class="payment-box">
      <div class="payment-title">Payment Method & Banking Information:</div>
      <div><strong>Bank:</strong> Citibank Berhad, Kuala Lumpur Branch</div>
      <div><strong>Account #:</strong> 0110567006</div>
      <div><strong>Account Name:</strong> TIKTOK PTE LTD</div>
      <div><strong>SWIFT Code:</strong> CITIMYKL</div>
      <div><strong>Bank Address:</strong> 165, JALAN AMPANG 50450 KUALA LUMPUR</div>
      <div class="notice">INVOICE NUMBER MUST BE REFERENCED ON ALL PAYMENTS</div>
    </div>

    <div class="footer-thanks">Thank You for Your Business</div>
  </div>

  <!-- PAGE 2: CONSUMPTION DETAILS BREAKDOWN -->
  <div class="page" style="page-break-before: always; margin-top: 20px;">
    <div class="section-header">Consumption Details:</div>
    <div style="margin-bottom: 12px; font-size: 10px; color: #444;">
      <strong>Invoice Number:</strong> ${invoiceNo} &nbsp;|&nbsp; <strong>Period:</strong> ${dateStr} ~ ${dateStr}
    </div>

    <table>
      <thead>
        <tr>
          <th style="width: 12%;">Advertiser</th>
          <th style="width: 14%;">Advertiser ID</th>
          <th style="width: 15%;">Campaign ID</th>
          <th style="width: 25%;">Campaign Name</th>
          <th style="width: 6%;">Country</th>
          <th style="width: 14%;" class="text-right">Consumption (MYR)</th>
          <th style="width: 14%;" class="text-right">Cash Spend (MYR)</th>
        </tr>
      </thead>
      <tbody>
        ${campaigns
          .map(
            (c) => `
        <tr>
          <td>${c.advertiser}</td>
          <td>${c.advertiser_id}</td>
          <td>${c.campaign_id}</td>
          <td class="campaign-name">${c.campaign_name}</td>
          <td>${c.target_country}</td>
          <td class="text-right">${formatCurrency(c.spend)}</td>
          <td class="text-right">${formatCurrency(c.cash_spend)}</td>
        </tr>`
          )
          .join('')}
      </tbody>
    </table>

    <table class="totals-table">
      <tr>
        <td>Subtotal before prepay amount:</td>
        <td class="text-right">${formatCurrency(subtotal)}</td>
      </tr>
      <tr>
        <td style="color: #666; font-size: 9px;">Non-US: ${formatCurrency(subtotal)} | US: 0.00</td>
        <td></td>
      </tr>
      <tr>
        <td>DST@8.0%:</td>
        <td class="text-right">${formatCurrency(dstAmount)}</td>
      </tr>
      <tr class="highlight">
        <td>Total in MYR:</td>
        <td class="text-right">MYR ${formatCurrency(totalPayable)}</td>
      </tr>
      <tr>
        <td style="color: #666; font-size: 9px;">Non-US: ${formatCurrency(totalPayable)} | US: 0.00</td>
        <td></td>
      </tr>
    </table>
  </div>

</body>
</html>`;
}

async function main() {
  const inputDate = process.argv[2] || '2026-09-04';
  const targetDate = parseDateInput(inputDate);

  console.log(`Generating daily invoice for date: ${targetDate}`);

  if (!fs.existsSync(CREDENTIALS_PATH)) {
    throw new Error(`Credential file not found at ${CREDENTIALS_PATH}`);
  }

  const accountConfig: AccountConfig = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, 'utf8'));
  const accessToken = accountConfig.access_token;
  const advId = '7505228077656621057'; // GMV MAX VOL2

  console.log(`Fetching campaign consumption from TikTok Ads API for Advertiser: ${advId}...`);
  const campaigns = await fetchDayCampaigns(accessToken, advId, targetDate);

  if (campaigns.length === 0) {
    console.log(`No ad consumption found on ${targetDate}.`);
    return;
  }

  const subtotal = campaigns.reduce((s, c) => s + c.spend, 0);
  console.log(`Found ${campaigns.length} active campaigns. Total Spend: RM ${formatCurrency(subtotal)}`);

  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const [year, month, day] = targetDate.split('-');
  const invoiceNo = `MYTT${year}${month}${day}0001`;
  const htmlFilename = `${invoiceNo}-HIM & HER WELLNESS PRODUCT SDN. BHD.-Invoice.html`;
  const pdfFilename = `${invoiceNo}-HIM & HER WELLNESS PRODUCT SDN. BHD.-Invoice.pdf`;

  const htmlPath = path.join(OUTPUT_DIR, htmlFilename);
  const pdfPath = path.join(OUTPUT_DIR, pdfFilename);

  const html = generateInvoiceHtml(targetDate, campaigns);
  fs.writeFileSync(htmlPath, html, 'utf8');

  console.log(`Converting HTML to PDF via Chrome headless...`);
  const chromePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  const cmd = `"${chromePath}" --headless --disable-gpu --no-pdf-header-footer --print-to-pdf="${pdfPath}" "${htmlPath}"`;
  execSync(cmd);

  // Clean up temporary HTML
  if (fs.existsSync(htmlPath)) {
    fs.unlinkSync(htmlPath);
  }

  console.log(`\n✓ Generated Daily Tax Invoice PDF:`);
  console.log(`  Path: ${pdfPath}`);
  console.log(`  Size: ${(fs.statSync(pdfPath).size / 1024).toFixed(1)} KB`);
}

main().catch((err) => {
  console.error('\nERROR:', err.message);
  process.exit(1);
});
