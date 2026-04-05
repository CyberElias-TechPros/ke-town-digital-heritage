const mongoose = require('mongoose');
const { MongoClient } = require('mongodb');
const readline = require('readline');

const ATLAS_URI = 'mongodb://cybereliastk_db_user:3bBKj4DtLRh7DNd8@ac-okkbkq6-shard-00-00.rz1xdmd.mongodb.net:27017,ac-okkbkq6-shard-00-01.rz1xdmd.mongodb.net:27017,ac-okkbkq6-shard-00-02.rz1xdmd.mongodb.net:27017/keKingdom?ssl=true&replicaSet=atlas-ljgzbm-shard-0&authSource=admin&appName=CEA';
const LOCAL_URI = 'mongodb://localhost:27017/keKingdom';

const COLLECTIONS = [
  'users', 'posts', 'comments', 'activities', 'events', 'news', 
  'galleryimages', 'directoryentries', 'projects', 'contacts', 
  'newsletters', 'environmentissues', 'searchlogs', 'donations',
  'mentorshiprequests', 'jobs', 'calendarevents', 'oralhistories', 
  'genealogytrees', 'elderstories', 'products'
];

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

function prompt(question) {
  return new Promise(resolve => rl.question(question, resolve));
}

async function connectDB(uri, name) {
  try {
    const client = new MongoClient(uri, { serverSelectionTimeoutMS: 5000 });
    await client.connect();
    const db = client.db('keKingdom');
    console.log(`✅ Connected to ${name}`);
    return { client, db };
  } catch (err) {
    console.log(`❌ ${name} failed: ${err.message}`);
    return null;
  }
}

async function getCollectionStats(conn, collection) {
  try {
    const coll = conn.db.collection(collection);
    return await coll.countDocuments();
  } catch {
    return 0;
  }
}

async function getCollectionData(conn, collection) {
  try {
    const coll = conn.db.collection(collection);
    return await coll.find({}).toArray();
  } catch {
    return [];
  }
}

async function syncCollection(targetConn, collection, data, direction) {
  const coll = targetConn.db.collection(collection);
  if (direction === 'replace') {
    await coll.deleteMany({});
  }
  if (data.length > 0) {
    await coll.insertMany(data);
  }
  console.log(`   Synced ${data.length} documents to ${collection}`);
}

async function showCollectionDiff(atlasConn, localConn, collection) {
  const atlasCount = await getCollectionStats(atlasConn, collection);
  const localCount = await getCollectionStats(localConn, collection);
  console.log(`   ${collection}: Atlas=${atlasCount}, Localhost=${localCount}`);
  return { atlas: atlasCount, local: localCount };
}

async function main() {
  console.log('\n=== MongoDB Sync Tool ===\n');
  console.log('Connecting to databases...\n');

  const atlasConn = await connectDB(ATLAS_URI, 'Atlas');
  const localConn = await connectDB(LOCAL_URI, 'Localhost');

  if (!atlasConn && !localConn) {
    console.log('❌ No databases available');
    process.exit(1);
  }

  console.log('\n--- Collection Overview ---\n');
  
  let diffs = {};
  if (atlasConn && localConn) {
    for (const collection of COLLECTIONS) {
      diffs[collection] = await showCollectionDiff(atlasConn, localConn, collection);
    }
  } else if (atlasConn) {
    for (const collection of COLLECTIONS) {
      const count = await getCollectionStats(atlasConn, collection);
      console.log(`   ${collection}: Atlas=${count}, Localhost=N/A`);
      diffs[collection] = { atlas: count, local: 0 };
    }
  } else if (localConn) {
    for (const collection of COLLECTIONS) {
      const count = await getCollectionStats(localConn, collection);
      console.log(`   ${collection}: Atlas=N/A, Localhost=${count}`);
      diffs[collection] = { atlas: 0, local: count };
    }
  }

  console.log('\n--- Sync Options ---');
  console.log('1. Atlas → Localhost (push local changes to Atlas)');
  console.log('2. Localhost → Atlas (push Atlas changes to local)');
  console.log('3. Localhost ← Atlas (pull Atlas changes to local)');
  console.log('4. Atlas ← Localhost (pull local changes to Atlas)');
  console.log('5. Exit');

  const choice = await prompt('\nEnter option (1-5): ');

  if (choice === '5') {
    console.log('Exiting...');
    process.exit(0);
  }

  const operations = {
    '1': { from: 'Localhost', to: 'Atlas', direction: 'replace', label: 'Atlas ← Localhost' },
    '2': { from: 'Atlas', to: 'Localhost', direction: 'replace', label: 'Localhost ← Atlas' },
    '3': { from: 'Atlas', to: 'Localhost', direction: 'append', label: 'Localhost ← Atlas (append)' },
    '4': { from: 'Localhost', to: 'Atlas', direction: 'append', label: 'Atlas ← Localhost (append)' }
  };

  const op = operations[choice];
  if (!op) {
    console.log('Invalid option');
    process.exit(1);
  }

  console.log(`\n--- Preview: ${op.label} ---\n`);
  
  const fromConn = op.from === 'Atlas' ? atlasConn : localConn;
  const toConn = op.to === 'Atlas' ? atlasConn : localConn;

  if (!fromConn || !toConn) {
    console.log('❌ Source or destination not available');
    process.exit(1);
  }

  for (const collection of COLLECTIONS) {
    const count = await getCollectionStats(fromConn, collection);
    console.log(`   ${collection}: ${count} documents to sync`);
  }

  const confirm = await prompt('\nProceed with sync? (yes/no): ');
  if (confirm.toLowerCase() !== 'yes') {
    console.log('Cancelled');
    process.exit(0);
  }

  console.log('\nSyncing...\n');

  for (const collection of COLLECTIONS) {
    const data = await getCollectionData(fromConn, collection);
    await syncCollection(toConn, collection, data, op.direction);
  }

  console.log('\n✅ Sync complete!');

  await atlasConn?.client?.close();
  await localConn?.client?.close();
  rl.close();
  process.exit(0);
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});