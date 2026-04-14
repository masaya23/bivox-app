#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

function parseArgs(argv) {
  const parsed = {};

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];

    if (arg === '--email' || arg === '--uid' || arg === '--service-account') {
      parsed[arg.slice(2)] = argv[i + 1];
      i += 1;
      continue;
    }

    if (arg === '--remove') {
      parsed.remove = true;
      continue;
    }

    if (arg === '--help' || arg === '-h') {
      parsed.help = true;
    }
  }

  return parsed;
}

function printUsage() {
  console.log(`
Usage:
  npm run firebase:set-admin -- --email your@email.com
  npm run firebase:set-admin -- --uid firebase-uid
  npm run firebase:set-admin -- --email your@email.com --remove

Options:
  --email <email>                 Firebase Auth user email
  --uid <uid>                     Firebase Auth user uid
  --service-account <path>        Service account JSON path
  --remove                        Remove admin/master custom claims

Environment:
  FIREBASE_SERVICE_ACCOUNT_PATH   Default service account JSON path
  GOOGLE_APPLICATION_CREDENTIALS  Alternative service account JSON path
`);
}

function resolveServiceAccountPath(explicitPath) {
  const candidate = explicitPath
    || process.env.FIREBASE_SERVICE_ACCOUNT_PATH
    || process.env.GOOGLE_APPLICATION_CREDENTIALS;

  if (!candidate) {
    throw new Error(
      'Service account JSON path is missing. Use --service-account or set FIREBASE_SERVICE_ACCOUNT_PATH.'
    );
  }

  const resolvedPath = path.resolve(process.cwd(), candidate);

  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`Service account JSON was not found: ${resolvedPath}`);
  }

  return resolvedPath;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help || (!args.email && !args.uid)) {
    printUsage();
    process.exit(args.help ? 0 : 1);
  }

  const serviceAccountPath = resolveServiceAccountPath(args['service-account']);
  const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });

  const auth = admin.auth();
  const userRecord = args.email
    ? await auth.getUserByEmail(args.email)
    : await auth.getUser(args.uid);

  const currentClaims = userRecord.customClaims || {};
  const nextClaims = { ...currentClaims };

  if (args.remove) {
    delete nextClaims.admin;
    delete nextClaims.master;
  } else {
    nextClaims.admin = true;
    delete nextClaims.master;
  }

  await auth.setCustomUserClaims(userRecord.uid, Object.keys(nextClaims).length > 0 ? nextClaims : null);

  console.log(`Updated custom claims for ${userRecord.email || userRecord.uid}`);
  console.log(JSON.stringify(nextClaims, null, 2));
  console.log('The user must sign out and sign back in, or refresh the ID token, to receive the updated claim.');
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
