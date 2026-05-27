/**
 * Cleanup script: Replace huge base64-encoded images in db.json with
 * lightweight default Unsplash URLs to prevent the server from hanging.
 */
const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, 'data', 'db.json');

const categoryImages = {
  meals: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80',
  bakery: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=600&q=80',
  groceries: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=600&q=80',
  beverages: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=600&q=80',
  other: 'https://images.unsplash.com/photo-1498837167922-ddd27525d352?auto=format&fit=crop&w=600&q=80'
};

try {
  const raw = fs.readFileSync(DB_FILE, 'utf8');
  const sizeBefore = Buffer.byteLength(raw, 'utf8');
  console.log(`DB file size before cleanup: ${(sizeBefore / 1024).toFixed(1)} KB`);

  const db = JSON.parse(raw);

  let replaced = 0;
  if (db.foodlistings) {
    db.foodlistings.forEach(listing => {
      if (listing.image && listing.image.startsWith('data:')) {
        const fallback = categoryImages[listing.category] || categoryImages.meals;
        listing.image = fallback;
        replaced++;
        console.log(`  Replaced base64 image for listing "${listing.title}" (${listing._id})`);
      }
    });
  }

  const output = JSON.stringify(db, null, 2);
  const sizeAfter = Buffer.byteLength(output, 'utf8');

  fs.writeFileSync(DB_FILE, output);
  console.log(`\nDone! Replaced ${replaced} base64 image(s).`);
  console.log(`DB file size after cleanup: ${(sizeAfter / 1024).toFixed(1)} KB`);
  console.log(`Saved: ${((sizeBefore - sizeAfter) / 1024).toFixed(1)} KB`);
} catch (err) {
  console.error('Cleanup failed:', err.message);
}
