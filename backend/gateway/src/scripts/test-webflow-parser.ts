import '../env.js';
import { db } from '../db/client.js';
import { WebflowParserService } from '../services/webflowParserService.js';
import JSZip from 'jszip';
import { randomUUID } from 'crypto';

async function runTest() {
  console.log('1. Mocking a Webflow ZIP Export...');
  const zip = new JSZip();
  
  zip.file("index.html", `
    <!DOCTYPE html>
    <html data-wf-page="123" data-wf-site="456">
      <head>
        <link href="css/normalize.css" rel="stylesheet" type="text/css">
        <link href="css/webflow.css" rel="stylesheet" type="text/css">
        <link href="css/test-site.webflow.css" rel="stylesheet" type="text/css">
      </head>
      <body class="body">
        <div class="navbar w-nav">
          <div class="container w-container">
            <a href="#" class="brand w-nav-brand">Logo</a>
            <nav role="navigation" class="nav-menu w-nav-menu">
              <a href="#" class="nav-link w-nav-link">Home</a>
              <a href="#" class="nav-link w-nav-link">About</a>
            </nav>
          </div>
        </div>
        <div class="hero-section">
          <h1 class="heading">Welcome to Shift AI</h1>
          <p class="paragraph">This is a test of the Webflow to Next.js parser.</p>
          <a href="#" class="primary-button w-button">Get Started</a>
        </div>
      </body>
    </html>
  `);

  zip.file("css/normalize.css", "/* mock normalize */");
  zip.file("css/webflow.css", "/* mock webflow framework */");
  zip.file("css/test-site.webflow.css", `
    .body { font-family: Arial; background-color: #f5f5f5; }
    .navbar { background-color: #fff; padding: 20px; }
    .brand { font-size: 24px; font-weight: bold; }
    .hero-section { padding: 100px 20px; text-align: center; }
    .heading { font-size: 48px; color: #333; margin-bottom: 20px; }
    .paragraph { font-size: 18px; color: #666; max-width: 600px; margin: 0 auto; }
    .primary-button { background-color: #6366f1; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; }
  `);

  const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });
  console.log('✅ ZIP created. Size:', zipBuffer.length, 'bytes');

  console.log('2. Connecting to DB with retries...');
  let users: any[] = [];
  let attempts = 0;
  while (attempts < 5) {
      try {
          users = await db`SELECT id FROM auth.users LIMIT 1`;
          console.log('✅ Connected to database.');
          break;
      } catch (err) {
          attempts++;
          console.log(`⚠️ Connection attempt ${attempts} failed. Retrying...`);
          if (attempts === 5) throw err;
          await new Promise(r => setTimeout(r, 2000));
      }
  }

  const userId = '00000000-0000-0000-0000-000000000000'; 
  let testUserId = userId;
  if (users.length > 0) {
      testUserId = users[0].id;
  } else {
      console.log('Inserting dummy user...');
      await db`INSERT INTO auth.users (id, instance_id, role, aud, status) VALUES (${testUserId}, ${randomUUID()}, 'authenticated', 'authenticated', 'active') ON CONFLICT DO NOTHING`;
  }

  const projectId = randomUUID();
  console.log('Creating project...');
  await db`
    INSERT INTO projects (id, user_id, name, framework, source_platform, origin_meta)
    VALUES (${projectId}, ${testUserId}, 'Webflow Test Project', 'react', 'webflow', '{"test": true}')
  `;
  console.log('✅ Project created:', projectId);

  console.log('3. Running WebflowParserService.processZipUpload()...');
  try {
    await WebflowParserService.processZipUpload(projectId, zipBuffer, "mock-site-export.zip");
    console.log('✅ processZipUpload completed successfully.');

    console.log('4. Verifying output...');
    const dbFiles = await db`SELECT id, file_path, type FROM project_files WHERE project_id = ${projectId}`;
    console.log(`✅ Found ${dbFiles.length} files in project_files:`);
    for (const file of dbFiles) {
        console.log(`   - ${file.file_path} (${file.type})`);
    }

  } catch (err: any) {
    console.error('❌ Service failed:', err);
  } finally {
    console.log('Cleaning up...');
    try {
        await db`DELETE FROM project_files WHERE project_id = ${projectId}`;
        await db`DELETE FROM projects WHERE id = ${projectId}`;
    } catch (e) {
        console.error('Cleanup failed (ignoring):', e);
    }
    console.log('Done.');
    process.exit(0);
  }
}

runTest().catch(err => {
    console.error('Fatal Test Error:', err);
    process.exit(1);
});
