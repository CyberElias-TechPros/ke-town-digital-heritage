#!/usr/bin/env node
/**
 * Seeds a KE Town database with real heritage content and demo accounts.
 *
 *   node scripts/seed.mjs --local     # wrangler dev / local D1
 *   node scripts/seed.mjs --remote    # deployed D1
 *
 * Password hashes are computed with the exact same PBKDF2 parameters the
 * Worker uses at runtime, so the seeded accounts can log in immediately.
 */
import { spawnSync } from 'node:child_process';
import { writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import crypto from 'node:crypto';

const ITERATIONS = 100_000;

function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.pbkdf2Sync(password, salt, ITERATIONS, 32, 'sha256');
  return `pbkdf2$${ITERATIONS}$${salt.toString('base64')}$${hash.toString('base64')}`;
}

const q = (v) => (v === null || v === undefined ? 'NULL' : `'${String(v).replace(/'/g, "''")}'`);
const j = (v) => q(JSON.stringify(v ?? []));
const now = "datetime('now')";

const DEMO_PASSWORD = process.env.SEED_PASSWORD || 'KEtown@2026';

const users = [
  {
    id: 'usr_admin',
    full_name: 'KE Town Admin',
    email: 'admin@ketown.com.ng',
    username: 'ketown',
    role: 'admin',
    bio: 'Custodians of the KE Town digital heritage archive.',
    location: 'KE Town, Rivers State',
    verified: 1,
  },
  {
    id: 'usr_amina',
    full_name: 'Amina Tamuno',
    email: 'amina@ketown.com.ng',
    username: 'amina',
    role: 'content_manager',
    bio: 'Curator of the KE Town gallery and oral history archive.',
    location: 'KE Town',
    verified: 1,
  },
  {
    id: 'usr_tari',
    full_name: 'Tari Dokubo',
    email: 'tari@ketown.com.ng',
    username: 'tari',
    role: 'user',
    bio: 'Weaver, dyer and keeper of the loom. Second-generation textile artisan.',
    location: 'KE Town',
    is_seller: 1,
    shop_name: 'Dokubo Loom',
    shop_description: 'Hand-woven Kalabari textiles, dyed with indigo from the creek banks.',
    verified: 1,
  },
  {
    id: 'usr_boma',
    full_name: 'Boma Fubara',
    email: 'boma@ketown.com.ng',
    username: 'boma',
    role: 'user',
    bio: 'Software engineer in the diaspora. Mentors young developers from the creeks.',
    location: 'Manchester, UK',
    is_seller: 0,
  },
];

const warCanoeHouses = [
  ['wch_1', 'House Of Oruwari', 'KE Town', 'Oruwari Briggs', 1690, 'One of the founding war canoe houses, custodians of the creek-side shrines.', 'Oruwari Doksiri', 'active'],
  ['wch_2', 'House Of Amadabo', 'KE Town', 'Amadabo Dokubo', 1712, 'Renowned for masquerade regalia and the Owu-Aru-Sun boat processions.', 'Amadabo IX', 'active'],
  ['wch_3', 'House Of Fubara-Manilla', 'KE Town', 'Fubara Manilla', 1735, 'Traders and diplomats; kept the earliest written records of creek commerce.', 'Manilla Fubara', 'active'],
];

const festivals = [
  ['fes_1', 'Owu-Aru-Sun', 'The great boat regatta. War canoes race the creeks while masquerades dance on deck.', 1, 12, 'cultural', 'KE Town Waterfront'],
  ['fes_2', 'Iri Ji (New Yam)', 'First-yam festival. Elders bless the harvest before the community eats.', 8, 21, 'harvest', 'KE Town Square'],
  ['fes_3', 'Masquerade Season', 'Six weeks of Seki, Ogbagba and Owu performances across the houses.', 12, 1, 'masquerade', 'All Houses'],
  ['fes_4', 'Creek Clean-Up Day', 'Community mangrove and creek restoration, led by the youth council.', 4, 18, 'environment', 'Mangrove Belt'],
  ['fes_5', 'Fisherman Festival', 'Blessing of the nets and the first cast of the season.', 11, 8, 'heritage', 'Landing Jetty'],
];

const phrases = [
  ['phr_1', 'I baa du', 'Good morning', 'Kalabari', 'greetings'],
  ['phr_2', 'I baa so', 'Good afternoon', 'Kalabari', 'greetings'],
  ['phr_3', 'A fie', 'Welcome', 'Kalabari', 'greetings'],
  ['phr_4', 'Tobara', 'Thank you', 'Kalabari', 'courtesy'],
  ['phr_5', 'Oyinbo', 'The foreigner / overseas', 'Kalabari', 'vocabulary'],
  ['phr_6', 'Ama', 'Town / settlement', 'Kalabari', 'vocabulary'],
  ['phr_7', 'Fibre', 'Canoe', 'Kalabari', 'vocabulary'],
  ['phr_8', 'Seki', 'Masquerade', 'Kalabari', 'culture'],
  ['phr_9', 'Bite bite', 'Slowly / take it easy', 'Kalabari', 'courtesy'],
  ['phr_10', 'Wari', 'House / household', 'Kalabari', 'vocabulary'],
];

const news = [
  ['nws_1', 'KE Town archive crosses 1,000 digitised photographs', 'The volunteer scanning team has now preserved over a thousand glass plates and prints from the creek-era studios.', 'Each frame has been catalogued with the family name, the canoe house and, where known, the year. Curators are asking residents to help identify faces that remain unnamed.', 'community', 1, 412],
  ['nws_2', 'Indigo dyeing returns to the creek banks', 'A new cooperative of nine dyers is reviving the indigo vats that once supplied cloth across the delta.', 'The vats are fed by a plant harvested from the mangrove fringe. Masters teach apprentices across a six-month cycle.', 'culture', 1, 288],
  ['nws_3', 'Mangrove replanting hits 40 hectares', 'Youth volunteers and the environment desk have replanted forty hectares of Rhizophora along the eroding shoreline.', 'Mangroves buffer the town against storm surge and serve as the nursery for the fish the town depends on.', 'environment', 0, 190],
];

const gallery = [
  ['gal_1', 'War canoe at dawn', 'A racing canoe is pushed off the mud bank before first light.', 'culture', 1],
  ['gal_2', 'Seki masquerade regalia', 'Carved face plate, raffia skirt and the rattle that announces the spirit.', 'masquerade', 1],
  ['gal_3', 'Indigo vat, third dip', 'Cloth comes out green and turns blue as it meets the air.', 'crafts', 1],
  ['gal_4', 'Mangrove roots at low tide', 'The belt that holds the shoreline together.', 'environment', 0],
  ['gal_5', 'Elder telling the founding story', 'Recorded at the Amadabo house veranda.', 'heritage', 1],
];

const elderStories = [
  ['eld_1', 'How the town chose its name', 'Chief Oruwari Doksiri', 94, 'KE Town', 'The elders argue for three days by the water before the name is spoken aloud.', 'memoir', 1],
  ['eld_2', 'The year the creek changed course', 'Madam Ibiye Fubara', 88, 'KE Town', 'A single rainy season rewrote the map, and with it the fishing grounds of four houses.', 'memoir', 0],
  ['eld_3', 'Learning the loom at seven', 'Tariyeibifa Dokubo', 79, 'KE Town', 'A master weaver describes the apprenticeship that has not changed in three generations.', 'craft', 1],
];

const oralHistories = [
  ['oral_1', 'The founding of the canoe houses', 'Elder Oruwari Doksiri', 'heritage', 'Kalabari', 'Three houses claimed the same landing. The elders settled it by racing at dawn, and the order of that race is the order of the houses to this day.', 1],
  ['oral_2', 'Songs for the fishing net', 'Madam Ibiye Fubara', 'heritage', 'Kalabari', 'Nets are blessed with a specific song before the first cast. The song names every ancestor who fished this water.', 0],
  ['oral_3', 'When the missionaries came', 'Deacon Boma Green', 'history', 'English', 'The first school was a shed with a tin roof. Within a decade it produced the town’s first university graduate.', 0],
];

const projects = [
  ['prj_1', 'Creek-side Heritage Museum', 'Convert the old customs house into a museum for the canoe houses, with climate-controlled storage for the archive.', 'heritage', 45000000, 18750000, 'active'],
  ['prj_2', 'Solar power for the archive', 'Solar array and battery backup so the digitisation studio runs through the dry-season outages.', 'infrastructure', 12000000, 9600000, 'active'],
  ['prj_3', 'Mangrove belt restoration', 'Replant 100 hectares of Rhizophora along the eroding eastern shoreline.', 'environment', 8000000, 3200000, 'active'],
];

const jobs = [
  ['job_1', 'Archive Digitisation Technician', 'KE Town Heritage Trust', 'Scan, catalogue and preserve the photographic and audio archive.', 'heritage', 'full_time', 'KE Town', 0, 180000, 240000],
  ['job_2', 'Full-stack Developer (Remote)', 'Cyber Elias Academy', 'Build and maintain learning platforms for students across the delta.', 'technology', 'full_time', 'Remote', 1, 450000, 700000],
  ['job_3', 'Textile Dyeing Apprentice', 'Dokubo Loom', 'Six-month apprenticeship in indigo dyeing and hand-weaving.', 'crafts', 'apprenticeship', 'KE Town', 0, 80000, 120000],
];

const products = [
  ['prd_1', 'usr_tari', 'Hand-woven indigo wrapper', 'Double-width cotton wrapper woven on a traditional loom and dyed three times in a natural indigo vat.', 'textiles', 48000, 6, ['Indigo', 'Handwoven', 'Wrapper']],
  ['prd_2', 'usr_tari', 'Masquerade face plate (replica)', 'Carved hardwood replica of a Seki face plate, finished with natural pigments.', 'masquerade', 92000, 3, ['Carving', 'Seki', 'Replica']],
  ['prd_3', 'usr_tari', 'Raffia shoulder bag', 'Woven raffia bag with a hand-braided strap.', 'crafts', 22500, 12, ['Raffia', 'Bag']],
  ['prd_4', 'usr_tari', 'Creek-smoked fish hamper', 'A curated hamper of smoked creek fish, dry pepper and locally milled garri.', 'food', 31000, 8, ['Food', 'Hamper']],
];

const events = [
  ['evt_1', 'Owu-Aru-Sun Boat Regatta', 'Watch the war canoe houses race the creek, with masquerades dancing on deck.', 'festival', 'in_person', 'KE Town Waterfront', 120000, 0],
  ['evt_2', 'Indigo Dyeing Workshop', 'A hands-on introduction to natural indigo. All materials provided.', 'workshop', 'in_person', 'Dokubo Loom', 24, 15000],
  ['evt_3', 'Archive Volunteer Day', 'Help catalogue the newly scanned photographs. No experience needed.', 'community', 'in_person', 'Heritage Trust Office', 40, 0],
  ['evt_4', 'Diaspora Investment Call', 'Monthly call for diaspora members exploring heritage and agribusiness opportunities.', 'business', 'online', 'Online', 500, 0],
];

const groups = [
  ['grp_1', 'KE Town Diaspora Network', 'For members living abroad who want to stay connected and invest back home.', 'public', 'community', 342],
  ['grp_2', 'Creek Conservation Crew', 'Volunteers restoring the mangrove belt and monitoring water quality.', 'public', 'environment', 128],
  ['grp_3', 'Artisan Guild', 'Weavers, carvers, dyers and potters trading techniques and suppliers.', 'public', 'business', 96],
];

const posts = [
  ['pst_1', 'usr_amina', 'We just finished scanning the Fubara-Manilla studio collection — 214 plates, most of them unnamed. If you recognise a face, comment below and we will credit your family.', 84, 17],
  ['pst_2', 'usr_tari', 'Third dip today. The cloth comes out of the vat green and turns blue in about ninety seconds. Every time it still feels like magic.', 152, 23],
  ['pst_3', 'usr_boma', 'Mentored four students from KE Town this month. Two shipped their first production app. The talent here is not the bottleneck — access is.', 201, 31],
];

const directory = [
  ['dir_1', 'Dr. Kala George', 'kala.george@example.com', 'Cardiologist', 'health', 'United Kingdom', 'London', 1, 1],
  ['dir_2', 'Nengi Briggs', 'nengi.briggs@example.com', 'Marine Lawyer', 'law', 'Nigeria', 'Port Harcourt', 1, 1],
  ['dir_3', 'Tamuno Harry', 'tamuno.harry@example.com', 'Civil Engineer', 'engineering', 'Canada', 'Toronto', 0, 1],
];

const mentorProfiles = [
  ['mtr_1', 'usr_boma', ['JavaScript', 'React', 'Cloudflare Workers'], 'Web platform engineering', 11, 'I help self-taught developers ship production work and get hired.', 'weekends', 0],
  ['mtr_2', 'usr_amina', ['Archiving', 'Photography', 'Curation'], 'Cultural heritage digitisation', 14, 'Fifteen years cataloguing delta collections.', 'evenings', 0],
];

const campaigns = [
  ['cmp_1', 'Save the Eastern Shoreline', 'Fund gabions and mangrove replanting along the eroding eastern bank.', 'environment', 25000000, 11200000],
];

const petitions = [
  ['pet_1', 'Protect the creek landing from sand-filling', 'Ask the state environment ministry to halt unpermitted sand-filling at the historic landing.', 'State Ministry of Environment', 5000, 1842],
];

const polls = [
  ['pol_1', 'Which archive should we digitise next?', ['Studio photographs', 'Court records', 'Mission school registers', 'Trade ledgers'], 'heritage'],
];

const volunteer = [
  ['vol_1', 'Mangrove planting crew', 'Plant and stake Rhizophora seedlings along the eastern belt. Boots provided.', 'Creek Conservation Crew', 'environment', 'KE Town Eastern Bank', 'Saturdays', 60],
  ['vol_2', 'Archive scanning volunteers', 'Two-hour shifts at the flatbed scanner. Training given on the day.', 'KE Town Heritage Trust', 'heritage', 'Heritage Trust Office', 'Weekdays', 25],
];

const environment = [
  ['env_1', 'Plastic build-up at the market landing', 'Daily waste is washing into the creek at the market landing. Needs weekly collection.', 'waste', 'high', 'Market Landing', 42],
  ['env_2', 'Oil sheen near the eastern channel', 'A recurring sheen appears after heavy rain. Suspected upstream discharge.', 'pollution', 'critical', 'Eastern Channel', 67],
];

const familyTrees = [
  ['tre_1', 'usr_amina', 'Oruwari House lineage', 'Seven generations traced from the founding canoe house.', 'public'],
];

const familyMembers = [
  ['fmb_1', 'tre_1', 'Oruwari Briggs', 'male', 1655, 1720, 0, 0, null],
  ['fmb_2', 'tre_1', 'Doksiri Oruwari', 'male', 1690, 1761, 0, 1, 'fmb_1'],
  ['fmb_3', 'tre_1', 'Ibiye Doksiri', 'female', 1725, 1790, 0, 2, 'fmb_2'],
  ['fmb_4', 'tre_1', 'Oruwari Doksiri', 'male', 1931, null, 1, 5, 'fmb_3'],
];

const sql = [];
const push = (s) => sql.push(s);

/* users */
const hash = hashPassword(DEMO_PASSWORD);
for (const u of users) {
  push(
    `INSERT OR REPLACE INTO users (id, full_name, email, username, password_hash, role, account_status, email_verified, verified, avatar, bio, location, is_seller, shop_name, shop_description, seller_rating, total_sales, balance, interests, skills, created_at, updated_at)
     VALUES (${q(u.id)}, ${q(u.full_name)}, ${q(u.email)}, ${q(u.username)}, ${q(hash)}, ${q(u.role)}, 'active', 1, ${u.verified ?? 0}, '', ${q(u.bio ?? '')}, ${q(u.location ?? '')}, ${u.is_seller ?? 0}, ${q(u.shop_name ?? '')}, ${q(u.shop_description ?? '')}, ${u.is_seller ? 4.8 : 0}, ${u.is_seller ? 137 : 0}, ${u.is_seller ? 250000 : 0}, ${j(u.id === 'usr_boma' ? ['education', 'technology'] : ['culture', 'history'])}, ${j(u.id === 'usr_boma' ? ['JavaScript', 'Mentoring'] : [])}, ${now}, ${now});`,
  );
}
push(`INSERT OR REPLACE INTO follows (follower_id, following_id, created_at) VALUES ('usr_boma','usr_tari',${now}), ('usr_boma','usr_amina',${now}), ('usr_amina','usr_tari',${now}), ('usr_tari','usr_amina',${now});`);

for (const [id, owner, name, desc] of [['shp_1', 'usr_tari', 'Dokubo Loom', 'Hand-woven Kalabari textiles, dyed with indigo from the creek banks.']]) {
  push(
    `INSERT OR REPLACE INTO shops (id, owner_id, name, slug, description, verified, rating, total_sales, status, created_at, updated_at)
     VALUES (${q(id)}, ${q(owner)}, ${q(name)}, 'dokubo-loom', ${q(desc)}, 1, 4.8, 137, 'active', ${now}, ${now});`,
  );
}

for (const [id, name, community, founder, year, desc, chief, status] of warCanoeHouses) {
  push(
    `INSERT OR REPLACE INTO war_canoe_houses (id, name, community, founder, founded_year, description, current_chief, lineage, status, created_at)
     VALUES (${q(id)}, ${q(name)}, ${q(community)}, ${q(founder)}, ${year}, ${q(desc)}, ${q(chief)}, ${j([founder, chief])}, ${q(status)}, ${now});`,
  );
}

for (const [id, name, desc, month, day, category, location] of festivals) {
  push(
    `INSERT OR REPLACE INTO festivals (id, name, description, month, day, category, location_name, created_at)
     VALUES (${q(id)}, ${q(name)}, ${q(desc)}, ${month}, ${day}, ${q(category)}, ${q(location)}, ${now});`,
  );
}

for (const [id, phrase, translation, language, category] of phrases) {
  push(
    `INSERT OR REPLACE INTO phrases (id, phrase, translation, language, category, created_at)
     VALUES (${q(id)}, ${q(phrase)}, ${q(translation)}, ${q(language)}, ${q(category)}, ${now});`,
  );
}

news.forEach(([id, title, excerpt, content, category, featured, views], i) => {
  push(
    `INSERT OR REPLACE INTO news (id, title, slug, excerpt, content, category, author_id, author_name, views, featured, status, published_at, created_at, updated_at)
     VALUES (${q(id)}, ${q(title)}, ${q(title.toLowerCase().replace(/[^a-z0-9]+/g, '-'))}, ${q(excerpt)}, ${q(content)}, ${q(category)}, 'usr_amina', 'Amina Tamuno', ${views}, ${featured}, 'published', datetime('now', '${-i * 3} days'), ${now}, ${now});`,
  );
});

gallery.forEach(([id, title, description, category, featured]) => {
  push(
    `INSERT OR REPLACE INTO gallery_items (id, title, description, url, media_type, category, uploader_id, credit, approved, featured, views, likes, created_at)
     VALUES (${q(id)}, ${q(title)}, ${q(description)}, '/placeholder.svg', 'image', ${q(category)}, 'usr_amina', 'Amina Tamuno', 1, ${featured}, ${200 + Math.floor(Math.random() * 400)}, ${20 + Math.floor(Math.random() * 60)}, ${now});`,
  );
});

for (const [id, title, elder, age, community, excerpt, category, featured] of elderStories) {
  push(
    `INSERT OR REPLACE INTO elder_stories (id, title, elder_name, age, community, excerpt, content, category, author_id, views, featured, status, created_at, updated_at)
     VALUES (${q(id)}, ${q(title)}, ${q(elder)}, ${age}, ${q(community)}, ${q(excerpt)}, ${q(excerpt)}, ${q(category)}, 'usr_amina', ${300 + Math.floor(Math.random() * 500)}, ${featured}, 'published', ${now}, ${now});`,
  );
}

for (const [id, title, narrator, category, language, transcript, featured] of oralHistories) {
  push(
    `INSERT OR REPLACE INTO oral_histories (id, title, narrator, narrator_id, category, language, transcript, duration, approved, views, created_at)
     VALUES (${q(id)}, ${q(title)}, ${q(narrator)}, 'usr_amina', ${q(category)}, ${q(language)}, ${q(transcript)}, ${600 + Math.floor(Math.random() * 900)}, ${featured}, ${200 + Math.floor(Math.random() * 600)}, ${now});`,
  );
}

for (const [id, title, description, category, goal, raised, status] of projects) {
  push(
    `INSERT OR REPLACE INTO projects (id, title, description, category, goal_amount, raised_amount, currency, status, supporters, created_at, updated_at)
     VALUES (${q(id)}, ${q(title)}, ${q(description)}, ${q(category)}, ${goal}, ${raised}, 'NGN', ${q(status)}, ${Math.floor(raised / 25000)}, ${now}, ${now});`,
  );
  push(
    `INSERT OR REPLACE INTO project_updates (id, project_id, text, author_id, created_at)
     VALUES (${q(id.replace('prj_', 'pup_'))}, ${q(id)}, ${q('Phase one complete — thank you to every supporter.')}, 'usr_admin', ${now});`,
  );
}

for (const [id, title, company, description, category, type, location, remote, min, max] of jobs) {
  push(
    `INSERT OR REPLACE INTO jobs (id, title, company, description, requirements, responsibilities, category, job_type, location_name, remote, salary_min, salary_max, currency, poster_id, contact_email, views, applications, status, created_at, updated_at)
     VALUES (${q(id)}, ${q(title)}, ${q(company)}, ${q(description)}, ${j(['Relevant experience', 'Strong communication'])}, ${j(['Deliver on the stated scope'])}, ${q(category)}, ${q(type)}, ${q(location)}, ${remote}, ${min}, ${max}, 'NGN', 'usr_admin', 'careers@ketown.com.ng', ${80 + Math.floor(Math.random() * 200)}, ${5 + Math.floor(Math.random() * 20)}, 'open', ${now}, ${now});`,
  );
}

for (const [id, seller, title, description, category, price, stock, tags] of products) {
  push(
    `INSERT OR REPLACE INTO products (id, seller_id, shop_id, title, name, description, category, condition, price, currency, is_negotiable, images, artisan_name, location_name, contact, tags, stock, quantity, views, likes, is_featured, status, created_at, updated_at)
     VALUES (${q(id)}, ${q(seller)}, 'shp_1', ${q(title)}, ${q(title)}, ${q(description)}, ${q(category)}, 'new', ${price}, 'NGN', 1, ${j(['/placeholder.svg'])}, 'Dokubo Loom', 'KE Town', '+234 800 000 0000', ${j(tags)}, ${stock}, ${stock}, ${150 + Math.floor(Math.random() * 500)}, ${10 + Math.floor(Math.random() * 40)}, ${price > 40000 ? 1 : 0}, 'active', ${now}, ${now});`,
  );
}

const dayOffset = [14, 21, 35, 7];
events.forEach(([id, title, description, category, type, location, capacity, price], i) => {
  push(
    `INSERT OR REPLACE INTO events (id, title, description, category, event_type, location_name, address, start_date, end_date, timezone, organizer_id, capacity, price, currency, rsvp_count, status, created_at, updated_at)
     VALUES (${q(id)}, ${q(title)}, ${q(description)}, ${q(category)}, ${q(type)}, ${q(location)}, ${q(location)}, datetime('now', '+${dayOffset[i]} days'), datetime('now', '+${dayOffset[i]} days', '+4 hours'), 'Africa/Lagos', 'usr_amina', ${capacity}, ${price}, 'NGN', ${5 + Math.floor(Math.random() * 40)}, 'approved', ${now}, ${now});`,
  );
});
push(`INSERT OR REPLACE INTO event_rsvps (event_id, user_id, status, created_at) VALUES ('evt_2','usr_boma','going',${now}), ('evt_1','usr_tari','interested',${now});`);

for (const [id, name, description, privacy, category, memberCount] of groups) {
  push(
    `INSERT OR REPLACE INTO groups (id, name, slug, description, privacy, category, join_method, creator_id, member_count, created_at, updated_at)
     VALUES (${q(id)}, ${q(name)}, ${q(name.toLowerCase().replace(/[^a-z0-9]+/g, '-'))}, ${q(description)}, ${q(privacy)}, ${q(category)}, 'open', 'usr_admin', ${memberCount}, ${now}, ${now});`,
  );
}
push(`INSERT OR REPLACE INTO group_members (group_id, user_id, role, status, created_at) VALUES
  ('grp_1','usr_admin','owner','active',${now}), ('grp_1','usr_boma','member','active',${now}),
  ('grp_2','usr_amina','owner','active',${now}), ('grp_3','usr_tari','owner','active',${now});`);

posts.forEach(([id, author, content, likes, comments], i) => {
  push(
    `INSERT OR REPLACE INTO posts (id, author_id, content, media, privacy, visibility, view_count, comment_count, like_count, is_pinned, status, created_at, updated_at)
     VALUES (${q(id)}, ${q(author)}, ${q(content)}, ${j([])}, 'community', 'community', ${likes * 6}, ${comments}, ${likes}, ${i === 0 ? 1 : 0}, 'active', datetime('now', '${-i} days'), ${now});`,
  );
});
push(`INSERT OR REPLACE INTO post_reactions (id, post_id, user_id, reaction_type, created_at) VALUES ('rxn_1','pst_1','usr_boma','love',${now}), ('rxn_2','pst_2','usr_amina','proud',${now});`);
push(`INSERT OR REPLACE INTO comments (id, author_id, content, target_type, target_id, created_at) VALUES ('cmt_1','usr_boma','That plate with the two women in white — I think that is my great-grandmother.','post','pst_1',${now});`);
push(`INSERT OR REPLACE INTO saved_posts (user_id, post_id, created_at) VALUES ('usr_boma','pst_2',${now});`);

for (const [id, name, email, profession, category, country, city, mentor, approved] of directory) {
  push(
    `INSERT OR REPLACE INTO directory_members (id, full_name, email, profession, category, country, city, willing_to_mentor, approved, created_at)
     VALUES (${q(id)}, ${q(name)}, ${q(email)}, ${q(profession)}, ${q(category)}, ${q(country)}, ${q(city)}, ${mentor}, ${approved}, ${now});`,
  );
}

for (const [id, user, skills, expertise, years, bio, availability, rate] of mentorProfiles) {
  push(
    `INSERT OR REPLACE INTO mentor_profiles (id, user_id, skills, expertise, years_experience, bio, availability, languages, hourly_rate, active, rating, sessions_count, created_at)
     VALUES (${q(id)}, ${q(user)}, ${j(skills)}, ${q(expertise)}, ${years}, ${q(bio)}, ${q(availability)}, ${j(['English'])}, ${rate}, 1, 4.9, ${10 + Math.floor(Math.random() * 30)}, ${now});`,
  );
}

for (const [id, title, description, category, goal, raised] of campaigns) {
  push(
    `INSERT OR REPLACE INTO campaigns (id, title, description, goal_amount, raised_amount, currency, category, status, created_at)
     VALUES (${q(id)}, ${q(title)}, ${q(description)}, ${goal}, ${raised}, 'NGN', ${q(category)}, 'active', ${now});`,
  );
}

for (const [id, title, description, target, goal, count] of petitions) {
  push(
    `INSERT OR REPLACE INTO petitions (id, title, description, target, author_id, goal, signature_count, status, created_at)
     VALUES (${q(id)}, ${q(title)}, ${q(description)}, ${q(target)}, 'usr_amina', ${goal}, ${count}, 'open', ${now});`,
  );
}

for (const [id, question, options, category] of polls) {
  push(
    `INSERT OR REPLACE INTO polls (id, question, options, author_id, category, multiple, total_votes, status, created_at)
     VALUES (${q(id)}, ${q(question)}, ${j(options.map((label, i) => ({ key: `opt_${i + 1}`, label })))}, 'usr_admin', ${q(category)}, 0, 0, 'open', ${now});`,
  );
}

for (const [id, title, description, org, category, location, commitment, spots] of volunteer) {
  push(
    `INSERT OR REPLACE INTO volunteer_opportunities (id, title, description, organization, category, location_name, commitment, spots, filled, status, created_at)
     VALUES (${q(id)}, ${q(title)}, ${q(description)}, ${q(org)}, ${q(category)}, ${q(location)}, ${q(commitment)}, ${spots}, ${Math.floor(spots / 3)}, 'open', ${now});`,
  );
}

for (const [id, title, description, category, severity, location, upvotes] of environment) {
  push(
    `INSERT OR REPLACE INTO environment_reports (id, title, description, category, severity, location_name, reporter_id, reporter_name, status, upvotes, created_at)
     VALUES (${q(id)}, ${q(title)}, ${q(description)}, ${q(category)}, ${q(severity)}, ${q(location)}, 'usr_amina', 'Amina Tamuno', 'open', ${upvotes}, ${now});`,
  );
}

for (const [id, owner, name, description, visibility] of familyTrees) {
  push(
    `INSERT OR REPLACE INTO family_trees (id, owner_id, name, description, visibility, root_id, created_at, updated_at)
     VALUES (${q(id)}, ${q(owner)}, ${q(name)}, ${q(description)}, ${q(visibility)}, 'fmb_1', ${now}, ${now});`,
  );
}

for (const [id, tree, name, gender, birth, death, living, generation, parent] of familyMembers) {
  push(
    `INSERT OR REPLACE INTO family_members (id, tree_id, name, gender, birth_year, death_year, is_living, generation, parent_id, created_at)
     VALUES (${q(id)}, ${q(tree)}, ${q(name)}, ${q(gender)}, ${birth}, ${death}, ${living}, ${generation}, ${parent ? q(parent) : 'NULL'}, ${now});`,
  );
}

/* a little history so the analytics dashboard is not empty */
for (let i = 29; i >= 0; i--) {
  const day = `-${i} days`;
  push(
    `INSERT OR REPLACE INTO analytics_events (id, user_id, event_type, entity_type, entity_id, country, device, value, created_at)
     VALUES ('an_seed_${i}', ${i % 3 === 0 ? q('usr_boma') : 'NULL'}, ${q(['page_view', 'post_view', 'product_view', 'event_rsvp', 'signup'][i % 5])}, 'post', 'pst_1', 'NG', ${i % 2 ? q('mobile') : q('desktop')}, 1, datetime('now', ${q(day)}));`,
  );
}

const file = join(mkdtempSync(join(tmpdir(), 'ke-seed-')), 'seed.sql');
writeFileSync(file, 'PRAGMA foreign_keys = ON;\n' + sql.join('\n') + '\n');

const scope = process.argv.includes('--remote') ? '--remote' : '--local';
const result = spawnSync('npx', ['wrangler', 'd1', 'execute', 'KE_DB', scope, `--file=${file}`, '--yes'], {
  stdio: 'inherit',
  shell: true,
});

if (result.status !== 0) {
  console.error('\nSeeding failed. Run the migrations first:  npm run db:migrate:local');
  process.exit(result.status ?? 1);
}

console.log(`
Seeded ${users.length} accounts and ${sql.length} statements.

  admin@ketown.com.ng / ${DEMO_PASSWORD}   (administrator)
  amina@ketown.com.ng / ${DEMO_PASSWORD}   (content manager)
  tari@ketown.com.ng  / ${DEMO_PASSWORD}   (seller — Dokubo Loom)
  boma@ketown.com.ng  / ${DEMO_PASSWORD}   (member + mentor)
`);
