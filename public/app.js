// Container for the front-end application:
const app = {};

// Configuration:
app.configuration = {
    token: false
};

// AJAX Client:
app.client = {};

// Interface for making API calls:
app.client.request = async function (headers, path, method, query, payload, callback) {
    headers = headers || {};
    path = path || "/";
    method = method.toUpperCase();
    query = query || {};
    let url = `${path}?`;
    for (const [key, value] in Object.entries(query)) { url += `${key}=${value}&`; }
    headers['Content-Type'] = 'application/json';
    app.configuration.token && (headers.token = app.configuration.token);
    await fetch(url, {headers, method, body: payload})
        .then(response => ({status: response.status, data: response.json()}))
        .then(result => { callback(result.status, result.data); })
        .catch(error => { callback(error.status, false); });
}