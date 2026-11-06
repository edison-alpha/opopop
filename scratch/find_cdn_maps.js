const https = require('https');

https.get('https://app.v2.gather.town/main.5bf60c95536fdd7d.js', (res) => {
  let chunks = [];
  res.on('data', c => chunks.push(c));
  res.on('end', () => {
    const bundle = Buffer.concat(chunks).toString('utf8');
    // Search for any Google Cloud Storage URLs for maps / backgrounds
    const re = /https:\/\/cdn\.gather\.town\/storage\.googleapis\.com\/[^\s"']+\.(png|jpg|webp)/gi;
    const matches = [...new Set(bundle.match(re) || [])];
    console.log('CDN image URLs count:', matches.length);
    console.log('Sample CDN URLs:', matches.slice(0, 20));
  });
});
