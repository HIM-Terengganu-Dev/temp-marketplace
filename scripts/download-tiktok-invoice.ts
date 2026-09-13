import fs from 'fs';
import path from 'path';

interface AccountConfig {
  account_name: string;
  access_token: string;
}

interface BCItem {
  bc_info: {
    bc_id: string;
    name: string;
    currency: string;
    company: string;
  };
}

const ROOT_DIR = process.cwd();
const OUTPUT_DIR = path.join(ROOT_DIR, 'downloads/invoices');

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function getBusinessCenters(accessToken: string): Promise<BCItem[]> {
  const res = await fetch('https://business-api.tiktok.com/open_api/v1.3/bc/get/', {
    headers: { 'Access-Token': accessToken }
  });
  const data = await res.json();
  if (data.code !== 0) {
    throw new Error(`Failed to list Business Centers: ${data.message} (code: ${data.code})`);
  }
  return data.data?.list || [];
}

async function createInvoiceTask(
  accessToken: string,
  bcId: string,
  downloadType: 'INVOICE_LIST' | 'INVOICE_BATCH' | 'BILLING_REPORT'
): Promise<string> {
  const res = await fetch('https://business-api.tiktok.com/open_api/v1.3/bc/invoice/task/create/', {
    method: 'POST',
    headers: {
      'Access-Token': accessToken,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      bc_id: bcId,
      download_type: downloadType
    })
  });

  const data = await res.json();
  if (data.code !== 0) {
    throw new Error(`Failed to create invoice task: ${data.message} (code: ${data.code})`);
  }
  return data.data.task_id;
}

async function pollAndDownloadTask(
  accessToken: string,
  bcId: string,
  taskId: string,
  outDir: string
): Promise<string> {
  const maxAttempts = 30;
  const pollInterval = 3000;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const url = `https://business-api.tiktok.com/open_api/v1.3/bc/invoice/task/get/?bc_id=${bcId}&task_id=${taskId}`;
    const res = await fetch(url, {
      headers: { 'Access-Token': accessToken }
    });

    const contentType = res.headers.get('content-type') || '';
    const disposition = res.headers.get('content-disposition') || '';

    // If API returned binary stream directly
    if (contentType.includes('application/octet-stream') || disposition.includes('attachment')) {
      let filename = `tiktok_invoice_${taskId}.xlsx`;
      const match = disposition.match(/filename="?([^";]+)"?/);
      if (match?.[1]) {
        filename = match[1];
      }

      const filePath = path.join(outDir, filename);
      const arrayBuffer = await res.arrayBuffer();
      fs.writeFileSync(filePath, Buffer.from(arrayBuffer));
      return filePath;
    }

    // Otherwise response is JSON task status
    const data = await res.json();
    if (data.code !== 0) {
      throw new Error(`Invoice task query failed: ${data.message} (code: ${data.code})`);
    }

    const taskData = data.data;
    if (taskData.status === 'SUCCESS' && taskData.download_url) {
      const fileRes = await fetch(taskData.download_url);
      const arrayBuffer = await fileRes.arrayBuffer();
      const filePath = path.join(outDir, `tiktok_invoice_${taskId}.zip`);
      fs.writeFileSync(filePath, Buffer.from(arrayBuffer));
      return filePath;
    }

    if (taskData.status === 'FAILED') {
      throw new Error(`Invoice generation task failed: ${taskData.error_message || 'Unknown error'}`);
    }

    console.log(`[Attempt ${attempt}/${maxAttempts}] Task status: ${taskData.status || 'PROCESSING'}... waiting`);
    await sleep(pollInterval);
  }

  throw new Error(`Timed out waiting for task ${taskId}`);
}

function parseArgs() {
  const args = process.argv.slice(2);
  let account = 'account.json';
  let downloadType: 'INVOICE_LIST' | 'INVOICE_BATCH' | 'BILLING_REPORT' = 'INVOICE_LIST';
  let bcId: string | null = null;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--account' && args[i + 1]) {
      account = args[++i];
      if (!account.endsWith('.json')) account += '.json';
    } else if (arg === '--bc' && args[i + 1]) {
      bcId = args[++i];
    } else if (arg === '--type' && args[i + 1]) {
      downloadType = args[++i] as any;
    } else if (['INVOICE_LIST', 'INVOICE_BATCH', 'BILLING_REPORT'].includes(arg)) {
      downloadType = arg as any;
    }
  }

  return { account, downloadType, bcId };
}

async function main() {
  const { account, downloadType, bcId } = parseArgs();
  const credentialsPath = path.join(ROOT_DIR, 'credentials/marketing', account);

  if (!fs.existsSync(credentialsPath)) {
    throw new Error(`Credential file not found at ${credentialsPath}`);
  }

  const accountConfig: AccountConfig = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
  const accessToken = accountConfig.access_token;

  console.log(`Using credential: credentials/marketing/${account} (${accountConfig.account_name})`);
  const bcs = await getBusinessCenters(accessToken);

  if (bcs.length === 0) {
    console.log('No Business Centers found for this account.');
    return;
  }

  console.log(`\nAccessible Business Center(s):`);
  bcs.forEach((b, i) => {
    const marker = bcId === b.bc_info.bc_id ? ' -> (Selected)' : '';
    console.log(` [${i + 1}] ID: ${b.bc_info.bc_id} | Name: ${b.bc_info.name} (${b.bc_info.currency})${marker}`);
  });

  const selectedBC = bcId
    ? bcs.find((b) => b.bc_info.bc_id === bcId)?.bc_info
    : bcs[0].bc_info;

  if (!selectedBC) {
    throw new Error(`Business Center ID "${bcId}" not found in account.`);
  }

  console.log(`\nExporting:`);
  console.log(`  Target BC    : ${selectedBC.name} (${selectedBC.bc_id})`);
  console.log(`  Download Type: ${downloadType}`);

  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const taskId = await createInvoiceTask(accessToken, selectedBC.bc_id, downloadType);
  console.log(`  Task Created : ID ${taskId}`);

  const savedFile = await pollAndDownloadTask(accessToken, selectedBC.bc_id, taskId, OUTPUT_DIR);
  console.log(`\n✓ File downloaded successfully:`);
  console.log(`  Path: ${savedFile}`);
}

main().catch((err) => {
  console.error('\nERROR:', err.message);
  process.exit(1);
});
