const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;

const server = http.createServer((req, res) => {
    // Basic routing
    let extname = String(path.extname(req.url)).toLowerCase();
    
    // Parse URL to handle query strings
    const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
    
    // Catch frontend errors
    if (parsedUrl.pathname === '/log-error' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk.toString());
        req.on('end', () => {
            try {
                const errData = JSON.parse(body);
                console.log('\n❌ [CLIENT ERROR] ============================');
                console.log(`Msg:   ${errData.msg}`);
                if(errData.line) console.log(`Line:  ${errData.line}:${errData.col}`);
                if(errData.stack) console.log(`Stack: \n${errData.stack}`);
                console.log('=============================================\n');
            } catch(e) {}
            res.writeHead(200);
            res.end();
        });
        return;
    }

    if ((parsedUrl.pathname === '/' || parsedUrl.pathname === '/index.html') && parsedUrl.searchParams.get('page') !== 'print') {
        const indexPath = path.join(__dirname, 'Index.html');
        
        fs.readFile(indexPath, 'utf8', (err, content) => {
            if (err) {
                res.writeHead(500);
                res.end('Error loading Index.html');
                return;
            }
            
            // Simple string replacement for GAS includes: <?= include('Filename'); ?> or <?!= include('Filename'); ?>
            const processedContent = content.replace(/<\?\!?[=\s]*include\(['"]([^'"]+)['"]\);?\s*\?>/g, (match, filename) => {
                try {
                    // Try to read the included file
                    const includePath = path.join(__dirname, filename + '.html');
                    return fs.readFileSync(includePath, 'utf8');
                } catch (e) {
                    console.error(`Could not include file: ${filename}`);
                    return `<!-- Error including ${filename}.html -->`;
                }
            });
            
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(processedContent, 'utf-8');
        });
    } else if (parsedUrl.pathname === '/' && parsedUrl.searchParams.get('page') === 'print') {
        const printPath = path.join(__dirname, 'Print.html');
        fs.readFile(printPath, 'utf8', (err, content) => {
            if (err) {
               res.writeHead(500); res.end('Error loading Print.html'); return;
            }
            
            // Evaluasi dynamic tags `<?= printData.key ?>`
            let html = content;
            const params = parsedUrl.searchParams;
            
            // Explicitly set dynamic values
            html = html.replace(/<\?\=\s*printData\.tercetak\s*\?>/g, new Date().toLocaleDateString('id-ID'));
            
            const keys = ['tanggal', 'sekolah', 'menu', 'buah', 'karbohidrat', 'protein', 'lemak', 'kalori', 'vitamin', 'sppg', 'gizi', 'penerima'];
            keys.forEach(key => {
                const val = params.get(key) || '-';
                const regex = new RegExp(`<\\?\\=\\s*printData\\.${key}\\s*\\?>`, 'g');
                html = html.replace(regex, val);
            });
            
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(html, 'utf-8');
        });
    } else {
        // Just serve static files if requested
        let filePath = path.join(__dirname, req.url);
        fs.readFile(filePath, (err, content) => {
            if (err) {
                if (err.code == 'ENOENT') {
                    res.writeHead(404);
                    res.end('Not Found');
                } else {
                    res.writeHead(500);
                    res.end('Server Error: ' + err.code);
                }
            } else {
                let contentType = 'text/plain';
                if (extname === '.css') contentType = 'text/css';
                if (extname === '.js') contentType = 'text/javascript';
                if (extname === '.png') contentType = 'image/png';
                
                res.writeHead(200, { 'Content-Type': contentType });
                res.end(content, 'utf-8');
            }
        });
    }
});

server.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}/`);
    console.log(`Press Ctrl+C to stop`);
});
