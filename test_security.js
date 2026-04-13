const http = require('http');

async function request(path, method = 'GET', body = null, headers = {}) {
    return new Promise((resolve) => {
        const options = {
            hostname: 'localhost',
            port: 8081,
            path: path,
            method: method,
            headers: {
                ...headers
            }
        };

        if (body) {
            options.headers['Content-Type'] = 'application/json';
        }

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                resolve({
                    status: res.statusCode,
                    data: data ? JSON.parse(data) : null
                });
            });
        });

        req.on('error', (e) => {
            console.error(`problem with request: ${e.message}`);
            resolve({status: 500, error: e.message});
        });

        if (body) {
            req.write(JSON.stringify(body));
        }
        req.end();
    });
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function runTests() {
    console.log("--- 1. Login Authentication Test ---");
    const loginRes = await request('/api/v1/auth/login', 'POST', {
        email: "kalamaninzola@gmail.com",
        password: "kana22"
    });
    console.log("Valid Login Response:", loginRes.status, loginRes.data);
    let validToken = loginRes.data ? loginRes.data.data?.token || loginRes.data.token : null;

    console.log("\n--- 2. CSRF Test ---");
    console.log("Waiting 1 second for rate limit token bucket to refill...");
    await sleep(1000);
    
    // First let's get the CSRF token
    console.log("Getting CSRF token...");
    const csrfRes = await request('/api/v1/auth/csrf', 'GET');
    console.log("CSRF Response:", csrfRes.status, csrfRes.data);
    const csrfToken = csrfRes.data?.data?.csrf_token || csrfRes.data?.csrf_token;
    
    console.log("Without CSRF token (Expecting 403):");
    const noCsrfRes = await request('/api/v1/users', 'POST', {
        email: "test2@kana.stream", password: "pwd", role: "user"
    }, {
        'Authorization': `Bearer ${validToken}`
    });
    console.log("Status:", noCsrfRes.status, noCsrfRes.data);

    console.log(`\nWith CSRF token (${csrfToken}) (Expecting success or diff error):`);
    const withCsrfRes = await request('/api/v1/users', 'POST', {
        email: "test2@kana.stream", password: "pwd", role: "user"
    }, {
        'X-CSRF-Token': csrfToken,
        'Authorization': `Bearer ${validToken}`
    });
    console.log("Status:", withCsrfRes.status, withCsrfRes.data);

    console.log("\n--- 3. Login Rate Limit Test ---");
    for (let i = 1; i <= 6; i++) {
        const r = await request('/api/v1/auth/login', 'POST', {
            email: "kalamaninzola@gmail.com",
            password: "wrong_password"
        });
        console.log(`Attempt ${i}: Status ${r.status}`, r.data);
    }
    
    console.log("\n--- 4. API Rate Limit Test (/api/v1/sports) ---");
    for (let i = 1; i <= 15; i++) {
        const r = await request('/api/v1/sports', 'GET');
        console.log(`Request ${i}: Status ${r.status}`);
    }
}

runTests();
