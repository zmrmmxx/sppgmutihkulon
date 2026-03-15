const http = require('http');

http.get('http://localhost:3000', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log("Includes Dashboard:", data.includes('id="page-dashboard"'));
    console.log("Includes Sekolah:", data.includes('id="page-sekolah"'));
    console.log("Includes Bahan:", data.includes('id="page-bahan"'));
    console.log("Includes empty-bahan:", data.includes('id="empty-bahan"'));
  });
});
