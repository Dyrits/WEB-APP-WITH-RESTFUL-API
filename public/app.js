// Container for the front-end application:
const app = {};

// Configuration:
app.configuration = {
    token: false
};

// AJAX Client:
app.client = {};

// Interface for making API calls:
app.client.request = function (headers, path, method, query, payload, callback) {
    headers = headers || {};
    app.configuration.token && (headers.token = app.configuration.token)
    path = path || "/";
    query = query || {};
    let url = `${path}?`;
    for (const [key, value] in Object.entries(query)) { url += `${key}=${value}&`; }
    const options = {
        method: method.toUpperCase(),
        headers: { ...headers, "Content-Type": "application/json"  },
        body: payload
    };
    fetch(url, options)
        .then(response => {
            if (response.status !== 200) { return response.json()
                .then(data => { callback({ status: response.status, data: data }); });
            }
            return response.json().then(data => {callback({ status: 200, data });});
        })
        .catch(error => { callback({ status: 500, data: { error }}); });
}


