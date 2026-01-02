try {
    const tiktokShop = require('tiktok-shop');
    console.log('Library loaded successfully');
    console.log('Exports:', Object.keys(tiktokShop));
    if (tiktokShop.signByUrl) {
        console.log('signByUrl function exists');
    } else {
        console.log('signByUrl function MISSING');
    }
} catch (e) {
    console.error('Error loading tiktok-shop:', e.message);
}
