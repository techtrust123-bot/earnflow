let API_URL = "/api";

if (typeof window !== 'undefined') {
	const host = window.location.hostname
	// During local development prefer the local backend if frontend served from localhost
	if (host === 'localhost' || host === '127.0.0.1') {
		API_URL = 'http://localhost:10000/api'
	}
}

export default API_URL;
